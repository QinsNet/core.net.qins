import { ResponsePact, RequestPact } from "../decorators/Method";
import { getNetTypeFromEndpoint, getOriginFromEndpoint } from "../util/Netutil";

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
}

export interface NodeClassConfig extends NetConfig {
  name?: string;
}

export interface NodeMethodConfig extends NetConfig {
  name?: string;
  request?: RequestPact;
  response?: ResponsePact;
  paramsName?: string[];
}

export interface NodeEndpointConfig extends NetConfig, RemoteConfig {
  classConfig?: NodeClassConfig;
  methodConfig?: NodeMethodConfig;
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
