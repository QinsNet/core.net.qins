import { TypeProtocol } from "../protocol/Protocol";
import { registerVoidTypeProtocol } from "../serialize/SerializeFunction";

export interface AttributeProperties {
  name?: string;
  type?: TypeProtocol<unknown>;
}

export class AttributeConfig implements AttributeProperties {
  name: string = '';
  type: TypeProtocol<unknown> = registerVoidTypeProtocol();
}
