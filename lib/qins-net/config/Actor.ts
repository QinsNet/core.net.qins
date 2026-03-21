import { CorsProperties, HTTPRequestFramework, HTTPServiceFramework, NetProperties, NetType, WSFramework } from "./Net";
import { TypeProtocol } from "../protocol/Protocol";
import { registerVoidTypeProtocol } from "../serialize/SerializeFunction";
import { AttributeConfig } from "./Attribute";
import { EndpointType, ProtocolProperties } from "./Protocol";

export interface ActorProperties extends NetProperties, ProtocolProperties {
  name?: string;
  actor?: TypeProtocol<unknown>;
  properties?: {[key: string]: AttributeConfig};
}

export class ActorConfig implements ActorProperties {
  host: string = '';
  timeout: number = 10000;
  framework: { request?: HTTPRequestFramework; service?: HTTPServiceFramework; ws?: WSFramework; } = {};
  cors: CorsProperties = {};
  listen: boolean = false;
  endpointType: EndpointType = EndpointType.Path;
  name: string = '';
  type: TypeProtocol<unknown> = registerVoidTypeProtocol();
  netType: NetType = NetType.HTTP;
  actor: TypeProtocol<unknown> = registerVoidTypeProtocol();
  attributes: {[key: string]: AttributeConfig} = {};
}