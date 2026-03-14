export type SerializeLang = 'sync' | 'async' | 'sendSync' | 'receiveSync';

export class SerializeException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'SerializeException';
  }
}

export class DeserializeException extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'DeserializeException';
  }
}

function getValueByPath(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

function setValueByPath(obj: unknown, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof current === 'object' && current !== null) {
      if (!(key in current)) {
        (current as Record<string, unknown>)[key] = {};
      }
      current = (current as Record<string, unknown>)[key];
    }
  }
  
  if (typeof current === 'object' && current !== null) {
    (current as Record<string, unknown>)[keys[keys.length - 1]] = value;
  }
}

export interface SendConfig {
  paths: string[];
}

export interface ReceiveConfig {
  paths: string[];
}

export function serializeSend(
  instance: unknown,
  config: SendConfig
): string {
  if (instance === null || instance === undefined) {
    return JSON.stringify(null);
  }

  const result: Record<string, unknown> = {};
  
  for (const path of config.paths) {
    const value = getValueByPath(instance, path);
    if (value !== undefined) {
      result[path] = value;
    }
  }

  return JSON.stringify(result);
}

export function deserializeReceive(
  instance: unknown,
  jsonData: string,
  config: ReceiveConfig
): void {
  if (!jsonData || instance === null || instance === undefined) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonData);
  } catch {
    return;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return;
  }

  for (const path of config.paths) {
    const value = getValueByPath(parsed, path);
    if (value !== undefined) {
      setValueByPath(instance, path, value);
    }
  }
}

export function serializeObject(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return JSON.stringify(null);
  }

  if (typeof obj === 'object') {
    if (typeof (obj as { toJSON?: () => unknown }).toJSON === 'function') {
      return JSON.stringify((obj as { toJSON: () => unknown }).toJSON());
    }
  }

  return JSON.stringify(obj);
}

export function deserializeObject<T = unknown>(json: string): T | null {
  if (!json) {
    return null;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function buildSendData(
  instance: unknown,
  paths: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const path of paths) {
    const value = getValueByPath(instance, path);
    if (value !== undefined) {
      result[path] = value;
    }
  }

  return result;
}

export function applyReceiveData(
  instance: unknown,
  data: Record<string, unknown>,
  paths: string[]
): void {
  if (instance === null || instance === undefined) {
    return;
  }

  for (const path of paths) {
    const value = getValueByPath(data, path);
    if (value !== undefined) {
      setValueByPath(instance, path, value);
    }
  }
}

export function extractParams(
  instance: unknown,
  paramPaths: string[]
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  
  for (const path of paramPaths) {
    const value = getValueByPath(instance, path);
    params[path] = value;
  }

  return params;
}

export function applyParams(
  instance: unknown,
  params: Record<string, unknown>
): void {
  if (instance === null || instance === undefined) {
    return;
  }

  for (const [path, value] of Object.entries(params)) {
    if (value !== undefined) {
      setValueByPath(instance, path, value);
    }
  }
}
