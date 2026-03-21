import { EndpointProperties } from "../config/Endpoint";
import { RequestProtocol } from "../net";
import { ResponseProtocol } from "../net";

export interface IEndpoint {
  config: EndpointProperties;
  register(): void;
  unregister(): void;
  request(instance: object, ...args: unknown[]): Promise<unknown>;
  service(request: RequestProtocol): Promise<ResponseProtocol>;
}
