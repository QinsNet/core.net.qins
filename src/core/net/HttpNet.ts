import { EndpointGateway } from '../node/EndpointGateway';
import type { RequestProtocol, ResponseProtocol } from '../protocol/Protocol';
import type { INet } from './INet';
import { Logger } from '../util/Logger';
import { ProtocolBuilder } from '../util/Protocol';

type HttpServer = {
  server: import('http').Server;
  close: () => Promise<void>;
};

async function createHttpServer(
  port: number,
  hostname: string,
  handler: (req: import('http').IncomingMessage, res: import('http').ServerResponse) => Promise<void>
): Promise<HttpServer> {
  const { createServer } = await import('http');
  const server = createServer(async (req, res) => {
    await handler(req, res);
  });

  return new Promise((resolve, reject) => {
    server.listen(port, hostname, () => {
      Logger.info('HTTP server listening', { hostname, port });
      resolve({
        server,
        close: () => new Promise<void>((res, rej) => {
          server.close((err) => {
            if (err) rej(err);
            else {
              Logger.info('HTTP server closed', { hostname, port });
              res();
            }
          });
        }),
      });
    });
    server.on('error', (err) => {
      Logger.error('HTTP server error', { hostname, port, error: err.message });
      reject(err);
    });
  });
}

export class HttpNet implements INet {
  private _server: HttpServer | null = null;

  async request(
    data: RequestProtocol,
    init: RequestInit = {},
    timeout: number = 30000
  ): Promise<ResponseProtocol> {
    Logger.info('HTTP request starting', { 
      endpoint: data.endpoint, 
      method: data.method,
      timeout 
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      Logger.warn('HTTP request timeout', { endpoint: data.endpoint, timeout });
      controller.abort();
    }, timeout);

    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
      ...init,
    };

    try {
      const fullUrl = data.endpoint;
      Logger.debug('HTTP request sending', { url: fullUrl });
      const response = await fetch(fullUrl, requestInit);
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json() as ResponseProtocol;
        Logger.info('HTTP request succeeded', { 
          endpoint: data.endpoint, 
          status: response.status 
        });
        return json;
      }
      
      Logger.error('HTTP request failed', { 
        endpoint: data.endpoint, 
        status: response.status, 
        statusText: response.statusText
      });
      return ProtocolBuilder.buildException(data,{
        code: response.status,
        message: response.statusText,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      Logger.error('HTTP request error', { 
        endpoint: data.endpoint, 
        error: error instanceof Error ? error.message + error.stack : String(error)
      });
      return ProtocolBuilder.buildException(data,{
        code: 500,
        message: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  }

  async service(data: RequestProtocol): Promise<ResponseProtocol> {
    return EndpointGateway.service(data);
  }

  async start(host: string): Promise<void> {
    const { EndpointGlobal } = await import('../node/EndpointGlobal');
    if (EndpointGlobal.config.listen === false) {
      Logger.debug('HTTP listen disabled by config');
      return;
    }

    if (this._server) {
      Logger.warn('HTTP server already started');
      return;
    }

    const url = new URL(host);
    const hostname = url.hostname || '0.0.0.0';
    const port = parseInt(url.port) || 8080;

    Logger.info('Starting HTTP server', { hostname, port });
    this._server = await createHttpServer(port, hostname, async (req, res) => {
      await this.handleRequest(req, res);
    });
  }

  async stop(): Promise<void> {
    if (!this._server) {
      Logger.debug('HTTP server not running, nothing to stop');
      return;
    }
    await this._server.close();
    this._server = null;
  }

  private async handleRequest(
    req: import('http').IncomingMessage,
    res: import('http').ServerResponse
  ): Promise<void> {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    Logger.debug('HTTP request received', { 
      requestId, 
      method: req.method, 
      url: req.url 
    });

    if (req.method !== 'POST') {
      Logger.warn('HTTP method not allowed', { requestId, method: req.method });
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ exception: { code: 405, message: 'Method Not Allowed' } }));
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const request: RequestProtocol = JSON.parse(body);
        Logger.info('HTTP request processing', { 
          requestId, 
          endpoint: request.endpoint,
          method: request.method 
        });
        
        const response = await EndpointGateway.service(request);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        
        Logger.info('HTTP response sent', { 
          requestId, 
          endpoint: request.endpoint,
          hasException: !!response.exception 
        });
      } catch (error) {
        Logger.error('HTTP request parse error', { 
          requestId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          exception: {
            code: 400,
            message: error instanceof Error ? error.message : 'Bad Request',
          },
        }));
      }
    });

    req.on('error', (error: Error) => {
      Logger.error('HTTP request error', { 
        requestId, 
        error: error.message 
      });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        exception: {
          code: 500,
          message: error.message,
        },
      }));
    });
  }
}
