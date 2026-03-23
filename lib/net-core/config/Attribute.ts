import { TypeProtocol } from "../protocol/Protocol";

export interface AttributeProperties {
  name: string;
  type: TypeProtocol<unknown>;
}
