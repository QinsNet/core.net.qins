import { NodeProperties } from "../config/Node";
import { RequestProtocol } from "..";
import { ResponseProtocol } from "..";

export interface INode {
  config: NodeProperties;
  request(instance: object, ...args: unknown[]): Promise<unknown>;
  service(request: RequestProtocol): Promise<ResponseProtocol>;
}
