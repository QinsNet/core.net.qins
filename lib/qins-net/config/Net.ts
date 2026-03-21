export enum HTTPRequestFramework {
  Fetch = 'fetch',
}
export enum HTTPServiceFramework {
  Express = 'express',
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
  host?: string;
  properties?: RequestInit;
  timeout?: number;
  framework?: {
    request?: HTTPRequestFramework;
    service?: HTTPServiceFramework;
    ws?: WSFramework;
  }
  cors?: CorsProperties;
  listen?: boolean;
  netType?: NetType;
}