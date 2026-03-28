export interface MetaProtocol {
  type: string;
  attributes?: {[key: string]: MetaProtocol}
}
export interface ReactionProtocol{
  type: string,
  input: {
    attributes: {[key: string]: MetaProtocol}
    parameters: {[key: string]: MetaProtocol}
  }
  output: {
    attributes: {[key: string]: MetaProtocol}
    parameters: {[key: string]: MetaProtocol}
  }
}
export interface ExceptionProtocol {
  code: number;
  message: string;
}
export interface RequestProtocol {
  version?: string;
  node: string;
  reaction: ReactionProtocol;
  method: string;
}

export interface ResponseProtocol {
  version?: string;
  node: string;
  reaction: ReactionProtocol;
  exception?: ExceptionProtocol;
}

export interface MetaType<T> {
    name: string;
    instance: Function;
    serialize: (instance: T) => string;
    deserialize: (serialized: string|Object,instance?: T) => T;
}
export interface MetaProtocolType {
  type: MetaType<unknown>;
  attributes?: {[key: string]: MetaProtocolType}
}
export interface ReactionProtocolType{
  type: MetaType<unknown>;
  input?: {
    attributes?: {[key: string]: MetaProtocolType}
    parameters?: {[key: string]: MetaProtocolType}
  }
  output?: {
    attributes?: {[key: string]: MetaProtocolType}
    parameters?: {[key: string]: MetaProtocolType}
  }
}