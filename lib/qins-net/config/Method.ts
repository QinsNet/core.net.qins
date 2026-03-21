import { CorsProperties, HTTPRequestFramework, HTTPServiceFramework, NetProperties, NetType, WSFramework } from "./Net";
import { IEndpoint } from "../endpoint/IEndpoint";
import { TypeProtocol } from "../protocol/Protocol";
import { registerVoidTypeProtocol } from "../serialize/SerializeFunction";
import { ParameterConfig,  } from "./Parameter";
import { EndpointType, ProtocolProperties } from "./Protocol";

export enum OperateType {
  Opaque = 'opaque',
}

export interface RequestProperties {
  actor?: Record<string, unknown> | OperateType;
  parameters?: Record<string, unknown> | OperateType;
}

export interface ResponseProperties {
  actor?: Record<string, unknown> | OperateType;
  parameters?: Record<string, unknown> | OperateType;
  result?: Record<string, unknown> | OperateType;
}
export interface MethodProperties extends NetProperties, ProtocolProperties {
  name?: string;
  request?: RequestProperties | string;
  response?: ResponseProperties | string;
  handler?: (instance: object, ...args: unknown[]) => Promise<unknown>;
  isStatic?: boolean;
  endpointInstance?: IEndpoint;
  parameters?: { [key: string]: ParameterConfig };
  result?: TypeProtocol<unknown>;
}
export class MethodConfig implements MethodProperties {
  name: string = '';
  request: RequestProperties = {};
  response: ResponseProperties = {};
  parameters: { [key: string]: ParameterConfig } = {};
  result: TypeProtocol<unknown> = registerVoidTypeProtocol();
  handler: (instance: object, ...args: unknown[]) => Promise<unknown> = () => Promise.resolve(void 0);
  isStatic: boolean = false;
  netType: NetType = NetType.HTTP;
  endpointInstance: IEndpoint = null!;

  
  host: string = '';
  properties: RequestInit = {};
  timeout: number = 0;
  framework = {
    request: HTTPRequestFramework.Fetch,
    service: HTTPServiceFramework.Express,
    ws: WSFramework.WS,
  }
  cors: CorsProperties = {};
  listen: boolean = false;

  endpointType: EndpointType = EndpointType.Path;
}
