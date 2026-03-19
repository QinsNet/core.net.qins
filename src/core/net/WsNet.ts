import { serialize } from 'class-transformer';
import { EndpointGateway } from '../node/EndpointGateway';
import type { RequestProtocol, ResponseProtocol } from '../protocol/Protocol';
import type { INet } from './INet';
import { Logger } from '../util/Logger';
import { ProtocolBuilder } from '../util/Protocol';

type WsServer = {
  server: import('http').Server;
  wss: import('ws').WebSocketServer;
  clients: Set<import('ws').WebSocket>;
  close: () => Promise<void>;
};

async function createWsServer(
  port: number,
  hostname: string,
  handler: (ws: import('ws').WebSocket, rawData: import('ws').RawData) => Promise<void>
): Promise<WsServer> {
  const [{ createServer }, { WebSocketServer }] = await Promise.all([
    import('http'),
    import('ws'),
  ]);

  const server = createServer();
  const wss = new WebSocketServer({ server });
  const clients = new Set<import('ws').WebSocket>();

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    Logger.info('WebSocket client connected', { clientIp, clientCount: clients.size + 1 });
    
    clients.add(ws);
    ws.on('message', async (rawData) => {
      await handler(ws, rawData);
    });
    ws.on('close', () => {
      clients.delete(ws);
      Logger.info('WebSocket client disconnected', { clientIp, clientCount: clients.size });
    });
    ws.on('error', (err) => {
      clients.delete(ws);
      Logger.error('WebSocket client error', { clientIp, error: err.message });
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, hostname, () => {
      Logger.info('WebSocket server listening', { hostname, port });
      resolve({
        server,
        wss,
        clients,
        close: () => new Promise<void>((res, rej) => {
          Logger.info('Closing WebSocket server', { hostname, port, clientCount: clients.size });
          for (const client of clients) {
            client.close();
          }
          clients.clear();
          wss.close((err) => {
            if (err) {
              Logger.error('WebSocket server close error', { error: err.message });
              rej(err);
              return;
            }
            server.close((err) => {
              if (err) {
                Logger.error('HTTP server close error', { error: err.message });
                rej(err);
              } else {
                Logger.info('WebSocket server closed', { hostname, port });
                res();
              }
            });
          });
        }),
      });
    });
    server.on('error', (err) => {
      Logger.error('WebSocket server error', { hostname, port, error: err.message });
      reject(err);
    });
  });
}

export class WsNet implements INet {
  private _server: WsServer | null = null;

  async request(
    data: RequestProtocol,
    _init: RequestInit = {},
    timeout: number = 30000
  ): Promise<ResponseProtocol> {
    const { WebSocket } = await import('ws');

    Logger.info('WebSocket request starting', { 
      endpoint: data.endpoint, 
      method: data.method,
      timeout 
    });

    return new Promise((resolve) => {
      const fullUrl = data.endpoint.replace(/^http/, 'ws');
      Logger.debug('WebSocket connecting', { url: fullUrl });
      const ws = new WebSocket(fullUrl);

      const timeoutId = setTimeout(() => {
        Logger.warn('WebSocket request timeout', { endpoint: data.endpoint, timeout });
        ws.close();
        resolve(ProtocolBuilder.buildException(data,{
          code: 408,
          message: 'Request Timeout',
        }));
      }, timeout);

      ws.on('open', () => {
        Logger.debug('WebSocket connected, sending request', { endpoint: data.endpoint });
        ws.send(JSON.stringify(data));
      });

      ws.on('message', (rawData: import('ws').RawData) => {
        clearTimeout(timeoutId);
        ws.close();
        try {
          const response = JSON.parse(rawData.toString()) as ResponseProtocol;
          if (response.exception) {
            Logger.error('WebSocket request failed', { 
              endpoint: data.endpoint, 
              code: response.exception.code, 
              message: response.exception.message 
            });
          } else {
            Logger.info('WebSocket request succeeded', { endpoint: data.endpoint });
          }
          resolve(response);
        } catch {
          Logger.error('WebSocket response parse error', { endpoint: data.endpoint });
          resolve(ProtocolBuilder.buildException(data,{
            code: 500,
            message: 'Invalid Response',
          }));
        }
      });

      ws.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        Logger.error('WebSocket connection error', { 
          endpoint: data.endpoint, 
          error: error.message 
        });
        resolve(ProtocolBuilder.buildException(data,{
          code: 500,
          message: error.message,
        }));
      });

      ws.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  async service(data: RequestProtocol): Promise<ResponseProtocol> {
    return EndpointGateway.service(data);
  }

  async start(host: string): Promise<void> {
    const { EndpointGlobal } = await import('../node/EndpointGlobal');
    if (EndpointGlobal.config.listen === false) {
      Logger.debug('WebSocket listen disabled by config');
      return;
    }

    if (this._server) {
      Logger.warn('WebSocket server already started');
      return;
    }

    const url = new URL(host);
    const hostname = url.hostname || '0.0.0.0';
    const port = parseInt(url.port) || 8080;

    Logger.info('Starting WebSocket server', { hostname, port });
    this._server = await createWsServer(port, hostname, async (ws, rawData) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      try {
        const request: RequestProtocol = JSON.parse(rawData.toString());
        Logger.info('WebSocket request received', { 
          requestId, 
          endpoint: request.endpoint,
          method: request.method 
        });
        
        const response = await EndpointGateway.service(request);
        ws.send(serialize(response));
        
        Logger.info('WebSocket response sent', { 
          requestId, 
          endpoint: request.endpoint,
          hasException: !!response.exception 
        });
      } catch (error) {
        Logger.error('WebSocket request parse error', { 
          requestId, 
          error: error instanceof Error ? error.message : String(error) 
        });
        ws.send(serialize({
          exception: {
            code: 400,
            message: error instanceof Error ? error.message : 'Bad Request',
          },
        }));
      }
    });
  }

  async stop(): Promise<void> {
    if (!this._server) {
      Logger.debug('WebSocket server not running, nothing to stop');
      return;
    }
    await this._server.close();
    this._server = null;
  }
}
