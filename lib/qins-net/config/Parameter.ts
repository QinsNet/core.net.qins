import { TypeProtocol } from "../protocol/Protocol";
import { registerVoidTypeProtocol } from "../serialize/SerializeFunction";

export interface ParamProperties {
  name?: string;
  type?: TypeProtocol<unknown>;
  index?: number;
}

export class ParameterConfig implements ParamProperties {
  name: string = '';
  type: TypeProtocol<unknown> = registerVoidTypeProtocol();
  index: number = 0;
}