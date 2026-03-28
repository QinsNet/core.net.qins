import { NetProperties} from "./Net";
import { ProtocolProperties } from "./Protocol";
import { Object } from "ts-toolbelt"
import { LoggerProperties } from "./Logger";
import { ReactionProtocol } from "../protocol";


export interface MethodProperties {
  handler: (instance: object, ...args: unknown[]) => Promise<unknown>;
  isStatic: boolean;
  net?: Object.Partial<NetProperties,'deep'>;
  protocol?: ProtocolProperties;
  log?: LoggerProperties;
  reaction?: ReactionProtocol;
  name: string;
}