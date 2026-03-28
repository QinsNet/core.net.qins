import { NetProperties } from "./Net";
import { ProtocolProperties } from "./Protocol";
import { LoggerProperties } from "./Logger";

export interface ActorProperties {
  name: string;
  net?: NetProperties;
  protocol?: ProtocolProperties;
  log?: LoggerProperties;
}