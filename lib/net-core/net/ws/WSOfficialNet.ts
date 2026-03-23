import { serialize } from 'class-transformer';
import { Gateway } from '../../node/Gateway';
import type { RequestProtocol, ResponseProtocol } from '../../protocol/Protocol';
import type { INet } from '../INet';
import { ProtocolBuilder } from '../../util/Protocol';
import { CorsProperties, NetProperties } from '../../config/Net';

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
    Gateway.Logger.info('WSOfficialNet: WebSocket client connected', { clientIp, clientCount: clients.size + 1 });

    clients.add(ws);
    ws.on('message', async (rawData) => {
      await handler(ws, rawData);
    });
    ws.on('close', () => {
      clients.delete(ws);
      Gateway.Logger.info('WSOfficialNet: WebSocket client disconnected', { clientIp, clientCount: clients.size });
    });
    ws.on('error', (err) => {
      clients.delete(ws);
      Gateway.Logger.error('WSOfficialNet: WebSocket client error', { clientIp, error: err.message });
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, hostname, () => {
      Gateway.Logger.info('WSOfficialNet: WebSocket server listening', { hostname, port });
      resolve({
        server,
        wss,
        clients,
        close: () => new Promise<void>((res, rej) => {
          Gateway.Logger.info('WSOfficialNet: Closing WebSocket server', { hostname, port, clientCount: clients.size });
          for (const client of clients) {
            client.close();
          }
          clients.clear();
          wss.close((err) => {
            if (err) {
              Gateway.Logger.error('WSOfficialNet: WebSocket server close error', { error: err.message });
              rej(err);
              return;
            }
            server.close((err) => {
              if (err) {
                Gateway.Logger.error('WSOfficialNet: HTTP server close error', { error: err.message });
                rej(err);
              } else {
                Gateway.Logger.info('WSOfficialNet: WebSocket server closed', { hostname, port });
                res();
              }
            });
          });
        }),
      });
    });
    server.on('error', (err) => {
      Gateway.Logger.error('WSOfficialNet: WebSocket server error', { hostname, port, error: err.message });
      reject(err);
    });
  });
}

export class WSOfficialNet implements INet {
  public config: NetProperties;
  private _server: WsServer | null = null;
  constructor(config: NetProperties) {
    this.config = config;
  }

  async request(
    data: RequestProtocol,
    _options?: object,
    timeout: number = 30000
  ): Promise<ResponseProtocol> {
    const { WebSocket } = await import('ws');

    Gateway.Logger.info('WSOfficialNet: WebSocket request starting', {
      node: data.node,
      method: data.method,
      timeout
    });

    return new Promise((resolve) => {
      const fullUrl = data.node.replace(/^http/, 'ws');
      Gateway.Logger.debug('WSOfficialNet: WebSocket connecting', { url: fullUrl });
      const ws = new WebSocket(fullUrl);

      const timeoutId = setTimeout(() => {
        Gateway.Logger.warn('WSOfficialNet: WebSocket request timeout', { node: data.node, timeout });
        ws.close();
        resolve(ProtocolBuilder.buildException(data, {
          code: 408,
          message: 'Request Timeout',
        }));
      }, timeout);

      ws.on('open', () => {
        Gateway.Logger.debug('WSOfficialNet: WebSocket connected, sending request', { node: data.node });
        ws.send(JSON.stringify(data));
      });

      ws.on('message', (rawData: import('ws').RawData) => {
        clearTimeout(timeoutId);
        ws.close();
        try {
          const response = JSON.parse(rawData.toString()) as ResponseProtocol;
          if (response.exception) {
            Gateway.Logger.error('WSOfficialNet: WebSocket request failed', {
              node: data.node,
              code: response.exception.code,
              message: response.exception.message
            });
          } else {
            Gateway.Logger.info('WSOfficialNet: WebSocket request succeeded', { node: data.node });
          }
          resolve(response);
        } catch {
          Gateway.Logger.error('WSOfficialNet: WebSocket response parse error', { node: data.node });
          resolve(ProtocolBuilder.buildException(data, {
            code: 500,
            message: 'Invalid Response',
          }));
        }
      });

      ws.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        Gateway.Logger.error('WSOfficialNet: WebSocket connection error', {
          node: data.node,
          error: error.message
        });
        resolve(ProtocolBuilder.buildException(data, {
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
    return Gateway.service(data);
  }

  async start(host: string): Promise<void> {
    if (this._server) {
      Gateway.Logger.warn('WSOfficialNet: WebSocket server already started');
      return;
    }
    const url = new URL(host);
    const hostname = url.hostname || '0.0.0.0';
    const port = parseInt(url.port) || 8080;

    Gateway.Logger.info('WSOfficialNet: Starting WebSocket server', { hostname, port });
    this._server = await createWsServer(port, hostname, async (ws, rawData) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      try {
        const request: RequestProtocol = JSON.parse(rawData.toString());
        Gateway.Logger.info('WSOfficialNet: WebSocket request received', {
          requestId,
          node: request.node,
          method: request.method
        });

        const response = await Gateway.service(request);
        ws.send(serialize(response));

        Gateway.Logger.info('WSOfficialNet: WebSocket response sent', {
          requestId,
          node: request.node,
          hasException: !!response.exception
        });
      } catch (error) {
        Gateway.Logger.error('WSOfficialNet: WebSocket request parse error', {
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
      Gateway.Logger.debug('WSOfficialNet: WebSocket server not running, nothing to stop');
      return;
    }
    await this._server.close();
    this._server = null;
  }
}