export enum HTTPRequestFramework {
  Fetch = 'fetch',
}
export enum HTTPServiceFramework {
  Express = 'express',
  Empty = "empty",
}
export enum WSFramework {
  WS = 'ws',
}
export enum NetType {
  HTTP = 'http',
  WS = 'ws',
}
export interface CorsProperties {
  origin?: string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}
export interface NetProperties {
    endpoint: string;
    host: string;
    timeout: number;
    framework: {
        request: {
            type: HTTPRequestFramework;
            options: Record<string, unknown>;
        }
        service: {
            type?: HTTPServiceFramework;
            options?: Record<string, unknown>;
        }
        ws: {
            type: WSFramework;
            options: Record<string, unknown>;
        }
    }
    cors?: CorsProperties;
    netType: NetType;
}