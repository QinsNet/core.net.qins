import { EndpointConfig } from "../config/EndpointConfig";
import { RequestProtocol } from "../net";
import { ResponseProtocol } from "../net";

export interface IEndpoint {
  config: EndpointConfig;
  register(): void;
  unregister(): void;
  request(instance: object, ...args: unknown[]): Promise<unknown>;
  service(request: RequestProtocol): Promise<ResponseProtocol>;
}
