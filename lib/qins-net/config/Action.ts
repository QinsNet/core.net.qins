import { NetProperties} from "./Net";
import { INode } from "../node/INode";
import { TypeProtocol } from "../protocol/Protocol";
import { ParameterProperties } from "./Parameter";
import { ProtocolProperties } from "./Protocol";
import { Object } from "ts-toolbelt"

export enum OperateType {
  Local = 'local',
}
export type PactType = { [key: string]: PactType } | OperateType;
export interface RequestPact {
  actor?: PactType;
  parameters?: PactType;
}

export interface ResponsePact {
  actor?: PactType;
  parameters?: PactType;
  result?: PactType;
}
export interface MethodProperties {
  name: string;
  request: RequestPact;
  response: ResponsePact;
  handler: (instance: object, ...args: unknown[]) => Promise<unknown>;
  isStatic: boolean;
  parameters: { [key: string]: ParameterProperties };
  result: {
    type: TypeProtocol<any>;
  }

  net?: Object.Partial<NetProperties,'deep'>;

  protocol?: ProtocolProperties;
}