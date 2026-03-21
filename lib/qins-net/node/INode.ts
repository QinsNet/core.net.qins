import { NodeProperties } from "../config/Node";
import { RequestProtocol } from "../net";
import { ResponseProtocol } from "../net";

export interface INode {
  config: NodeProperties;
  register(): void;
  unregister(): void;
  request(instance: object, ...args: unknown[]): Promise<unknown>;
  service(request: RequestProtocol): Promise<ResponseProtocol>;
}
