export interface ExceptionProtocol {
  code: number;
  message: string;
}
export interface RequestProtocol {
  version?: string;
  endpoint: string;
  actor?: {
    [key: string]: unknown;
  };
  method: string;
  parameters?: {
    name: string;
    value: unknown;
  }[];
}

export interface ResponseProtocol {
  version?: string;
  endpoint: string;
  result?: unknown;
  actor?: {
    [key: string]: unknown;
  };
  parameters?: {
    name: string;
    value: unknown;
  }[];
  exception?: ExceptionProtocol;
}
