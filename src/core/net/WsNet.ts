import { createServer, type Server, type IncomingMessage } from 'http';
import { WebSocketServer, WebSocket, type RawData } from 'ws';
import { EndpointGateway } from '../node/EndpointGateway';
import type { RequestProtocol, ResponseProtocol } from '../protocol/Protocol';
import { serialize } from '../serialize/Serialize';
import type { INet } from './INet';

export class WsNet implements INet {
  private _server: Server | null = null;
  private _wsServer: WebSocketServer | null = null;
  private _clients: Set<WebSocket> = new Set();

  async request(
    data: RequestProtocol,
    _init: RequestInit = {},
    timeout: number = 30000
  ): Promise<ResponseProtocol> {
    return new Promise((resolve) => {
      const fullUrl = data.endpoint.replace(/^http/, 'ws');
      const ws = new WebSocket(fullUrl);

      const timeoutId = setTimeout(() => {
        ws.close();
        resolve({
          endpoint: data.endpoint,
          exception: {
            code: 408,
            message: 'Request Timeout',
          },
        });
      }, timeout);

      ws.on('open', () => {
        ws.send(serialize(data));
      });

      ws.on('message', (rawData: RawData) => {
        clearTimeout(timeoutId);
        ws.close();
        try {
          const response = JSON.parse(rawData.toString()) as ResponseProtocol;
          resolve(response);
        } catch {
          resolve({
            endpoint: data.endpoint,
            exception: {
              code: 500,
              message: 'Invalid Response',
            },
          });
        }
      });

      ws.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        resolve({
          endpoint: data.endpoint,
          exception: {
            code: 500,
            message: error.message,
          },
        });
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
    if (this._server) {
      return;
    }

    const url = new URL(host);
    const hostname = url.hostname || '0.0.0.0';
    const port = parseInt(url.port) || 8080;

    this._server = createServer();
    this._wsServer = new WebSocketServer({ server: this._server });

    this._wsServer.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
      this._clients.add(ws);

      ws.on('message', async (rawData: RawData) => {
        try {
          const request: RequestProtocol = JSON.parse(rawData.toString());
          const response = await EndpointGateway.service(request);
          ws.send(serialize(response));
        } catch (error) {
          ws.send(serialize({
            exception: {
              code: 400,
              message: error instanceof Error ? error.message : 'Bad Request',
            },
          }));
        }
      });

      ws.on('close', () => {
        this._clients.delete(ws);
      });

      ws.on('error', () => {
        this._clients.delete(ws);
      });
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
    if (!this._wsServer && !this._server) {
      return;
    }

    for (const client of this._clients) {
      client.close();
    }
    this._clients.clear();

    return new Promise((resolve, reject) => {
      this._wsServer?.close((err?: Error) => {
        if (err) {
          reject(err);
          return;
        }
        this._wsServer = null;

        if (!this._server) {
          resolve();
          return;
        }

        this._server.close((err?: Error) => {
          if (err) {
            reject(err);
          } else {
            this._server = null;
            resolve();
          }
        });
      });
    });
  }
}
