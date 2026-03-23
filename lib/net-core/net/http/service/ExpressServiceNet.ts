import express, { Express, Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import type { RequestProtocol, ResponseProtocol } from '../../../protocol/Protocol';
import type { IServiceNet } from '../../INet';
import { Gateway } from '../../../node/Gateway';
import { CorsProperties } from '../../../config/Net';

type HttpServer = {
  app: Express;
  close: () => Promise<void>;
};

function buildCorsOptions(corsConfig: CorsProperties | undefined): CorsOptions | undefined {
  if (!corsConfig) return undefined;
  return {
    origin: corsConfig.origin,
    methods: corsConfig.methods,
    allowedHeaders: corsConfig.allowedHeaders,
    exposedHeaders: corsConfig.exposedHeaders,
    credentials: corsConfig.credentials,
    maxAge: corsConfig.maxAge,
  };
}

function createExpressApp(corsConfig: CorsProperties | undefined): Express {
  const app = express();
  const corsOptions = buildCorsOptions(corsConfig);

  if (corsOptions) {
    app.use(cors(corsOptions));
  } else {
    app.use(cors());
  }

  app.use(express.json());

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    Gateway.Logger.error('Net middleware error', {
      error: err.message,
      path: req.path,
      method: req.method
    });
    res.status(500).json({
      exception: {
        code: 500,
        message: err.message,
      },
    });
  });

  return app;
}

async function createHttpServer(
  port: number,
  hostname: string,
  app: Express
): Promise<HttpServer> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, hostname, () => {
      resolve({
        app,
        close: () => new Promise<void>((res, rej) => {
          server.close((err) => {
            if (err) rej(err);
            else res();
          });
        }),
      });
    });
    server.on('error', (err: Error) => {
      Gateway.Logger.error('Net server error', { hostname, port, error: err.message });
      reject(err);
    });
  });
}

export class ExpressServiceNet implements IServiceNet {
  private _server: HttpServer | null = null;
  private _cors?: CorsProperties;

  addCors(cors?: CorsProperties): void {
    if (!cors) return;
    else if (!this._cors) this._cors = cors;
    else{
      this._cors.origin?.push(...cors.origin || []);
      this._cors.methods?.push(...cors.methods || []);
      this._cors.allowedHeaders?.push(...cors.allowedHeaders || []);
      this._cors.exposedHeaders?.push(...cors.exposedHeaders || []);
      if (cors.credentials) this._cors.credentials = cors.credentials;
      if (cors.maxAge) this._cors.maxAge = cors.maxAge;
    }
    Gateway.Logger.debug('Net CORS config added', { cors: this._cors });
  }

  async service(data: RequestProtocol): Promise<ResponseProtocol> {
    return Gateway.service(data);
  }

  async start(host: string, cors?: CorsProperties): Promise<void> {
    if (cors) {
      this._cors = cors;
    }

    const url = new URL(host);
    const hostname = url.hostname || '0.0.0.0';
    const port = parseInt(url.port) || 8080;

    const app = createExpressApp(this._cors);

    app.post('*splat', async (req: Request, res: Response) => {
      try {
        const request: RequestProtocol = req.body;
        Gateway.Logger.debug('Net request received', {
          node: request.node,
          method: request.method
        });

        const response = await Gateway.service(request);
        res.status(200).json(response);
      } catch (error) {
        Gateway.Logger.error('Net request processing error', {
          error: error instanceof Error ? error.message : String(error)
        });
        res.status(400).json({
          exception: {
            code: 400,
            message: error instanceof Error ? error.message : 'Bad Request',
          },
        });
      }
    });

    this._server = await createHttpServer(port, hostname, app);
  }

  async stop(): Promise<void> {
    if (!this._server) {
      return;
    }
    await this._server.close();
    this._server = null;
  }
}