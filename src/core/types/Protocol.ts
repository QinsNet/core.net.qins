export interface RequestProtocol {
  Version: string;
  Actor: {
    [key: string]: unknown;
  };
  Method: string;
  Parameters: {
    name: string;
    value: unknown;
  }[];
}

export interface ResponseProtocol {
  Version: string;
  Result?: unknown;
  Actor?: {
    [key: string]: unknown;
  };
  Exception?: {
    code: string;
    message: string;
  };
}

export function createRequestProtocol(
  methodName: string,
  params: Record<string, unknown>,
  instance?: Record<string, unknown>
): RequestProtocol {
  return {
    Version: '1',
    Actor: instance || {},
    Method: methodName,
    Parameters: Object.entries(params).map(([name, value]) => ({
      name,
      value,
    })),
  };
}

export function parseResponseProtocol(json: string): ResponseProtocol {
  return JSON.parse(json);
}
