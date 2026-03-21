export interface TypeProtocol<T> {
    name: string;
    type: Function;
    serialize(instance: T): string;
    deserialize(serialized: string|Object): T;
}
export interface ParameterProtocol {
  name: string;
  type: string;
  index: number;
  properties?: unknown
}
export interface ExceptionProtocol {
  code: number;
  message: string;
}
export interface RequestProtocol {
  version?: string;
  node: string;
  actor: {
    type: string,
    properties?: unknown
  };
  method: string;
  parameters: {[key: string]: ParameterProtocol};
}

export interface ResponseProtocol {
  version?: string;
  node: string;
  result: {
    type: string,
    properties?: unknown
  };
  actor: {
    type: string,
    properties?: unknown
  };
  parameters: {[key: string]: ParameterProtocol};
  exception?: ExceptionProtocol;
}

