import { ResponsePact, RequestPact } from "../decorators/Method";
import { getNetTypeFromEndpoint, getOriginFromEndpoint } from "../util/Netutil";
import { TypeProtocol } from "../protocol/Protocol";

export interface NetConfig {
  endpoint?: string;
  properties?: RequestInit;
  timeout?: number;
}
export interface RemoteConfig {
  host: string;
  type: string;
}
export interface GlobalEndpointConfig extends NetConfig {
  name?: string;
  listen?: boolean;
}

export interface NodeClassConfig extends NetConfig {
  name?: string;
  actor?: TypeProtocol<unknown>;
}

export interface NodeMethodConfig extends NetConfig {
  name?: string;
  request?: RequestPact | string;
  response?: ResponsePact | string;
  params?: { name: string, type: TypeProtocol<unknown> }[];
  result?: TypeProtocol<unknown>;
  handler?: (instance: object, ...args: unknown[]) => Promise<unknown>;
  descriptor?: PropertyDescriptor;
  isStatic?: boolean;
}

export interface NodeEndpointConfig extends NetConfig, RemoteConfig {
  name: string;
  endpoint: string;
  properties: RequestInit;
  timeout: number;
  actor: TypeProtocol<unknown>;
  params: { name: string, type: TypeProtocol<unknown> }[];
  result: TypeProtocol<unknown>;
  isStatic: boolean;
  descriptor: PropertyDescriptor;

  classConfig: NodeClassConfig;
  methodConfig: NodeMethodConfig;
  request: RequestPact;
  response: ResponsePact;
}

export function mergeConfigs(
  globalConfig: GlobalEndpointConfig,
  classConfig: NodeClassConfig,
  methodConfig: NodeMethodConfig
): NodeEndpointConfig {
  const config = {
    endpoint: '',
    host: '',
    type: '',
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
  } as NodeEndpointConfig;
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
  config.type = getNetTypeFromEndpoint(config.endpoint);
  return config;
}
