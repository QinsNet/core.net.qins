import { NetProperties} from "./Net";
import { IEndpoint } from "../endpoint/IEndpoint";
import { TypeProtocol } from "../protocol/Protocol";
import { ParameterProperties } from "./Parameter";
import { ProtocolProperties } from "./Protocol";

export enum OperateType {
  Opaque = 'opaque',
}

export interface RequestPact {
  actor?: Record<string, unknown> | OperateType;
  parameters?: Record<string, ParameterProperties> | OperateType;
}

export interface ResponsePact {
  actor?: Record<string, unknown> | OperateType;
  parameters?: Record<string, unknown> | OperateType;
  result?: Record<string, unknown> | OperateType;
}
export interface MethodProperties {
  name: string;
  request: RequestPact;
  response: ResponsePact;
  handler: (instance: object, ...args: unknown[]) => Promise<unknown>;
  isStatic: boolean;
  parameters: { [key: string]: ParameterProperties };
  result: TypeProtocol<unknown>;

  net?: NetProperties;
  endpointInstance?: IEndpoint;
  protocol?: ProtocolProperties;
}