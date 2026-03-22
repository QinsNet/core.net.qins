import { NetProperties } from "./Net";
import { TypeProtocol } from "../protocol/Protocol";
import { AttributeProperties } from "./Attribute";
import { ProtocolProperties } from "./Protocol";

export interface ActorProperties {
  name: string;
  type: TypeProtocol<any>;
  attributes: {[key: string]: AttributeProperties};
  net?: NetProperties;
  protocol?: ProtocolProperties;
}