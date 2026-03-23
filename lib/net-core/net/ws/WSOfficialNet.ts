import { serialize } from 'class-transformer';
import { Gateway } from '../../node/Gateway';
import type { RequestProtocol, ResponseProtocol } from '../../protocol/Protocol';
import type { INet } from '../INet';
import { Logger } from '../../util/Logger';
import { ProtocolBuilder } from '../../util/Protocol';
import { CorsProperties } from '../../config/Net';

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
    Logger.info('WSOfficialNet: WebSocket client connected', { clientIp, clientCount: clients.size + 1 });

    clients.add(ws);
    ws.on('message', async (rawData) => {
      await handler(ws, rawData);
    });
    ws.on('close', () => {
      clients.delete(ws);
      Logger.info('WSOfficialNet: WebSocket client disconnected', { clientIp, clientCount: clients.size });
    });
    ws.on('error', (err) => {
      clients.delete(ws);
      Logger.error('WSOfficialNet: WebSocket client error', { clientIp, error: err.message });
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, hostname, () => {
      Logger.info('WSOfficialNet: WebSocket server listening', { hostname, port });
      resolve({
        server,
        wss,
        clients,
        close: () => new Promise<void>((res, rej) => {
          Logger.info('WSOfficialNet: Closing WebSocket server', { hostname, port, clientCount: clients.size });
          for (const client of clients) {
            client.close();
          }
          clients.clear();
          wss.close((err) => {
            if (err) {
              Logger.error('WSOfficialNet: WebSocket server close error', { error: err.message });
              rej(err);
              return;
            }
            server.close((err) => {
              if (err) {
                Logger.error('WSOfficialNet: HTTP server close error', { error: err.message });
                rej(err);
              } else {
                Logger.info('WSOfficialNet: WebSocket server closed', { hostname, port });
                res();
              }
            });
          });
        }),
      });
    });
    server.on('error', (err) => {
      Logger.error('WSOfficialNet: WebSocket server error', { hostname, port, error: err.message });
      reject(err);
    });
  });
}

export class WSOfficialNet implements INet {
  private _cors: CorsProperties = { origin: [], methods: [], allowedHeaders: [], exposedHeaders: [], credentials: false, maxAge: 0 };
  private _server: WsServer | null = null;

  addCors(cors?: CorsProperties): void {
    if (!cors) return;
    this._cors.allowedHeaders?.push(...cors.allowedHeaders || []);
    this._cors.exposedHeaders?.push(...cors.exposedHeaders || []);
    this._cors.origin?.push(...cors.origin || []);
    this._cors.methods?.push(...cors.methods || []);
    this._cors.credentials = cors.credentials || this._cors.credentials;
    this._cors.maxAge = cors.maxAge || this._cors.maxAge;
  }

  async request(
    data: RequestProtocol,
    _options?: object,
    timeout: number = 30000
  ): Promise<ResponseProtocol> {
    const { WebSocket } = await import('ws');

    Logger.info('WSOfficialNet: WebSocket request starting', {
      node: data.node,
      method: data.method,
      timeout
    });

    return new Promise((resolve) => {
      const fullUrl = data.node.replace(/^http/, 'ws');
      Logger.debug('WSOfficialNet: WebSocket connecting', { url: fullUrl });
      const ws = new WebSocket(fullUrl);

      const timeoutId = setTimeout(() => {
        Logger.warn('WSOfficialNet: WebSocket request timeout', { node: data.node, timeout });
        ws.close();
        resolve(ProtocolBuilder.buildException(data, {
          code: 408,
          message: 'Request Timeout',
        }));
      }, timeout);

      ws.on('open', () => {
        Logger.debug('WSOfficialNet: WebSocket connected, sending request', { node: data.node });
        ws.send(JSON.stringify(data));
      });

      ws.on('message', (rawData: import('ws').RawData) => {
        clearTimeout(timeoutId);
        ws.close();
        try {
          const response = JSON.parse(rawData.toString()) as ResponseProtocol;
          if (response.exception) {
            Logger.error('WSOfficialNet: WebSocket request failed', {
              node: data.node,
              code: response.exception.code,
              message: response.exception.message
            });
          } else {
            Logger.info('WSOfficialNet: WebSocket request succeeded', { node: data.node });
          }
          resolve(response);
        } catch {
          Logger.error('WSOfficialNet: WebSocket response parse error', { node: data.node });
          resolve(ProtocolBuilder.buildException(data, {
            code: 500,
            message: 'Invalid Response',
          }));
        }
      });

      ws.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        Logger.error('WSOfficialNet: WebSocket connection error', {
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
      Logger.warn('WSOfficialNet: WebSocket server already started');
      return;
    }
    const url = new URL(host);
    const hostname = url.hostname || '0.0.0.0';
    const port = parseInt(url.port) || 8080;

    Logger.info('WSOfficialNet: Starting WebSocket server', { hostname, port });
    this._server = await createWsServer(port, hostname, async (ws, rawData) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      try {
        const request: RequestProtocol = JSON.parse(rawData.toString());
        Logger.info('WSOfficialNet: WebSocket request received', {
          requestId,
          node: request.node,
          method: request.method
        });

        const response = await Gateway.service(request);
        ws.send(serialize(response));

        Logger.info('WSOfficialNet: WebSocket response sent', {
          requestId,
          node: request.node,
          hasException: !!response.exception
        });
      } catch (error) {
        Logger.error('WSOfficialNet: WebSocket request parse error', {
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
      Logger.debug('WSOfficialNet: WebSocket server not running, nothing to stop');
      return;
    }
    await this._server.close();
    this._server = null;
  }
}