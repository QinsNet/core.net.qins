export interface ClassNetConfig {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface MethodNetConfig {
  name?: string;
  timeout?: number;
}

export interface MethodConfig {
  sendPaths: string[];
  receivePaths: string[];
  net?: MethodNetConfig;
}

const CLASS_NET_CONFIG_KEY = '__class_net_config__';
const METHOD_CONFIG_KEY = '__method_config__';

class GlobalNetClass {
  private _baseUrl: string = '';
  private _headers: Record<string, string> = {};
  private _timeout: number = 30000;

  get baseUrl(): string {
    return this._baseUrl;
  }

  set baseUrl(value: string) {
    this._baseUrl = value;
  }

  get headers(): Record<string, string> {
    return this._headers;
  }

  set headers(value: Record<string, string>) {
    this._headers = value;
  }

  get timeout(): number {
    return this._timeout;
  }

  set timeout(value: number) {
    this._timeout = value;
  }

  configure(config: { baseUrl?: string; headers?: Record<string, string>; timeout?: number }): void {
    if (config.baseUrl !== undefined) this._baseUrl = config.baseUrl;
    if (config.headers !== undefined) this._headers = { ...this._headers, ...config.headers };
    if (config.timeout !== undefined) this._timeout = config.timeout;
  }
}

export const GlobalNet = new GlobalNetClass();

function ensureMethodConfigMap(target: object): Record<string, MethodConfig> {
  const methodTarget = target as Record<string, unknown>;
  if (!methodTarget[METHOD_CONFIG_KEY]) {
    methodTarget[METHOD_CONFIG_KEY] = {};
  }
  return methodTarget[METHOD_CONFIG_KEY] as Record<string, MethodConfig>;
}

export function Net(config: ClassNetConfig | MethodNetConfig) {
  return function (target: object | Function, propertyKey?: string, _descriptor?: PropertyDescriptor) {
    if (propertyKey !== undefined) {
      const configMap = ensureMethodConfigMap(target);
      if (!configMap[propertyKey]) {
        configMap[propertyKey] = { sendPaths: [], receivePaths: [] };
      }
      configMap[propertyKey].net = config as MethodNetConfig;
    } else {
      const constructor = target as Function;
      const existingConfig: ClassNetConfig = (constructor as unknown as Record<string, unknown>)[CLASS_NET_CONFIG_KEY] as ClassNetConfig || {};
      (constructor as unknown as Record<string, unknown>)[CLASS_NET_CONFIG_KEY] = { ...existingConfig, ...config };
    }
  };
}

export function Send(paths: string = '') {
  return function (target: object, propertyKey: string, _descriptor: PropertyDescriptor) {
    const pathList = paths ? paths.split(',').map(p => p.trim()) : [];
    const configMap = ensureMethodConfigMap(target);
    if (!configMap[propertyKey]) {
      configMap[propertyKey] = { sendPaths: [], receivePaths: [] };
    }
    configMap[propertyKey].sendPaths = pathList;
  };
}

export function Receive(paths: string = '') {
  return function (target: object, propertyKey: string, _descriptor: PropertyDescriptor) {
    const pathList = paths ? paths.split(',').map(p => p.trim()) : [];
    const configMap = ensureMethodConfigMap(target);
    if (!configMap[propertyKey]) {
      configMap[propertyKey] = { sendPaths: [], receivePaths: [] };
    }
    configMap[propertyKey].receivePaths = pathList;
  };
}

export function getClassNetConfig(target: object): ClassNetConfig | undefined {
  const constructor = target.constructor;
  return (constructor as unknown as Record<string, unknown>)[CLASS_NET_CONFIG_KEY] as ClassNetConfig | undefined;
}

export function getMethodConfig(target: object, propertyKey: string): MethodConfig | undefined {
  const methodTarget = target as Record<string, unknown>;
  const configMap = methodTarget[METHOD_CONFIG_KEY] as Record<string, MethodConfig> | undefined;
  return configMap?.[propertyKey];
}

export function hasSendConfig(target: object, propertyKey: string): boolean {
  const config = getMethodConfig(target, propertyKey);
  return config !== undefined && config.sendPaths.length > 0;
}
