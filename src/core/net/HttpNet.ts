import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';
import { EndpointGateway } from '../node/EndpointGateway';
import type { RequestProtocol, ResponseProtocol } from '../protocol/Protocol';
import { serialize } from '../serialize/Serialize';
import type { INet } from './INet';

export class HttpNet implements INet {
  private _server: Server | null = null;

  async request(
    data: RequestProtocol,
    init: RequestInit = {},
    timeout: number = 30000
  ): Promise<ResponseProtocol> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: serialize(data),
      signal: controller.signal,
      ...init,
    };

    try {
      const fullUrl = data.endpoint;
      const response = await fetch(fullUrl, requestInit);
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json() as ResponseProtocol;
      }
      return {
        endpoint: data.endpoint,
        exception: {
          code: response.status,
          message: response.statusText,
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      return {
        endpoint: data.endpoint,
        exception: {
          code: 500,
          message: error instanceof Error ? error.message : 'Internal Server Error',
        },
      };
    }
  }

  async service(data: RequestProtocol): Promise<ResponseProtocol> {
    return EndpointGateway.service(data);
  }

  async start(host: string): Promise<void> {
    if (this._server) {
      return;
    }

    const url = new URL(host);
    const hostname = url.hostname || '0.0.0.0';
    const port = parseInt(url.port) || 8080;

    this._server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      await this.handleRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this._server!.listen(port, hostname, () => {
        resolve();
      });
      this._server!.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this._server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this._server!.close((err?: Error) => {
        if (err) {
          reject(err);
        } else {
          this._server = null;
          resolve();
        }
      });
    });
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(serialize({ exception: { code: 405, message: 'Method Not Allowed' } }));
      return;
    }

    let body = '';
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const request: RequestProtocol = JSON.parse(body);
        const response = await EndpointGateway.service(request);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(serialize(response));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(serialize({
          exception: {
            code: 400,
            message: error instanceof Error ? error.message : 'Bad Request',
          },
        }));
      }
    });

    req.on('error', (error: Error) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(serialize({
        exception: {
          code: 500,
          message: error.message,
        },
      }));
    });
  }
}
