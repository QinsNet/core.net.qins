import { MetaType } from "../protocol/Protocol";

export interface AttributeProperties {
  name: string;
  type: MetaType<unknown>;
}
