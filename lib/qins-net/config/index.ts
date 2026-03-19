import { ResponsePact, RequestPact } from "../decorators/Method";
import { getNetTypeFromEndpoint, getOriginFromEndpoint } from "../util/Netutil";
import { TypeProtocol } from "../protocol/Protocol";
export enum HTTPRequestFramework {
  Fetch = 'fetch',
}
export enum HTTPServiceFramework {
  Express = 'express',
}
export enum WSFramework {
  WS = 'ws',
}
export enum EndpointType {
  Path = 'path',
}
export interface ProtocolConfig{
  type?: EndpointType;
}
export interface NetConfig {
  endpoint?: string;
  properties?: RequestInit;
  timeout?: number;
  framework?: {
    request?: HTTPRequestFramework;
    service?: HTTPServiceFramework;
    ws?: WSFramework;
  }
  cors?: CorsConfig;
  listen?: boolean;
}
export interface RemoteConfig {
  host: string;
  protocol: string;
}
export interface GlobalEndpointConfig extends NetConfig, ProtocolConfig {
  name?: string;
}

export interface CorsConfig {
  origin?: string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export interface ActorConfig extends NetConfig, ProtocolConfig {
  name?: string;
  actor?: TypeProtocol<unknown>;
}

export interface MethodConfig extends NetConfig, ProtocolConfig {
  name?: string;
  request?: RequestPact | string;
  response?: ResponsePact | string;
  params?: { name: string, type: TypeProtocol<unknown> }[];
  result?: TypeProtocol<unknown>;
  handler?: (instance: object, ...args: unknown[]) => Promise<unknown>;
  descriptor?: PropertyDescriptor;
  isStatic?: boolean;
}

export interface EndpointConfig extends NetConfig, RemoteConfig, ProtocolConfig {
  name: string;
  endpoint: string;
  properties: RequestInit;
  timeout: number;
  actor: TypeProtocol<unknown>;
  params: { name: string, type: TypeProtocol<unknown> }[];
  result: TypeProtocol<unknown>;
  isStatic: boolean;
  descriptor: PropertyDescriptor;
  framework: {
    request: HTTPRequestFramework;
    service: HTTPServiceFramework;
    ws: WSFramework;
  }
  listen: boolean;

  classConfig: ActorConfig;
  methodConfig: MethodConfig;
  request: RequestPact;
  response: ResponsePact;
}

export function mergeConfigs(
  globalConfig: GlobalEndpointConfig,
  classConfig: ActorConfig,
  methodConfig: MethodConfig
): EndpointConfig {
  const config = {
    endpoint: '',
    host: '',
    classConfig: classConfig,
    methodConfig: methodConfig,
    request: methodConfig.request ?? {},
    response: methodConfig.response ?? {},
    properties: methodConfig.properties ?? classConfig.properties ?? globalConfig.properties ?? {},
    timeout: methodConfig.timeout ?? classConfig.timeout ?? globalConfig.timeout ?? 10000,
    actor: classConfig.actor!,
    params: methodConfig.params!,
    result: methodConfig.result!,
    name: methodConfig.name!,
    isStatic: methodConfig.isStatic!,
    descriptor: methodConfig.descriptor!,
    framework: { request: methodConfig.framework?.request || classConfig.framework?.request || globalConfig.framework?.request || HTTPRequestFramework.Fetch, 
      service: methodConfig.framework?.service || classConfig.framework?.service || globalConfig.framework?.service || HTTPServiceFramework.Express, 
      ws: methodConfig.framework?.ws || classConfig.framework?.ws || globalConfig.framework?.ws || WSFramework.WS },
    cors: methodConfig.cors || classConfig.cors || globalConfig.cors || undefined,
    type: methodConfig.type || classConfig.type || globalConfig.type || EndpointType.Path,
    listen: methodConfig.listen || classConfig.listen || globalConfig.listen || false,
  } as EndpointConfig;
  let endpoint = '';
  if(globalConfig.endpoint){
    endpoint = globalConfig.endpoint + '/' + classConfig.name + '/' + methodConfig.name;
  }
  if(classConfig.endpoint){
    endpoint = classConfig.endpoint + '/' + methodConfig.name;
  }
  if(methodConfig.endpoint){
    endpoint = methodConfig.endpoint;
  }
  config.endpoint = endpoint;
  config.host = getOriginFromEndpoint(config.endpoint);
  config.protocol = getNetTypeFromEndpoint(config.endpoint);
  return config;
}
