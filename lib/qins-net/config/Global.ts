import { HTTPServiceFramework, CorsProperties, NetProperties, WSFramework, HTTPRequestFramework, NetType } from "./Net";
import { EndpointType, ProtocolProperties } from "./Protocol";

export class GlobalConfig implements NetProperties, ProtocolProperties{
  static host: string = '';
  static properties: RequestInit = {};
  static timeout: number = 0;
  static framework = {
     request: HTTPRequestFramework.Fetch,
     service: HTTPServiceFramework.Express,
     ws: WSFramework.WS,
  }
  static netType: NetType = NetType.HTTP;
  static cors: CorsProperties = {};
  static listen: boolean = false;
  static type: EndpointType = EndpointType.Path;
}
