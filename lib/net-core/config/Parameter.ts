import { TypeProtocol } from "../protocol/Protocol";

export interface ParameterProperties {
  name: string;
  type: TypeProtocol<unknown>;
  index: number;
}
