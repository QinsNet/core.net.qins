import type { NetConfig } from './Global';
import { GlobalNet } from './Global';
import { getClassConfig } from './Class';

export interface MethodConfig extends NetConfig {
  name: string;
  send: string[];
  receive: string[];
}

class MethodConfigDefault implements MethodConfig {
  constructor(config: Partial<MethodConfig> = {}) {
    Object.assign(this, config);
  }
  name: string = '';
  send: string[] = [];
  receive: string[] = [];
  baseUrl: string = '';
  net: RequestInit = {};
}

const METHOD_CONFIG_KEY = '__method_config__';

const BASIC_TYPES = [String, Number, Boolean, BigInt];

function isBasicType(type: unknown): boolean {
  return BASIC_TYPES.includes(type as typeof String | typeof Number | typeof Boolean | typeof BigInt);
}

function buildSendPaths(target: object, propertyKey: string, paths: string[]): string[] {
  const paramTypes: unknown[] = Reflect.getMetadata('design:paramtypes', target, propertyKey) || [];
  const finalPaths = [...paths];
  paramTypes.forEach((type, index) => {
    if (isBasicType(type)) {
      const paramPath = `param${index}`;
      if (!finalPaths.includes(paramPath)) {
        finalPaths.push(paramPath);
      }
    }
  });
  return finalPaths;
}

function ensureMethodConfigMap(target: object): Record<string, MethodConfig> {
  const methodTarget = target as Record<string, unknown>;
  if (!methodTarget[METHOD_CONFIG_KEY]) {
    methodTarget[METHOD_CONFIG_KEY] = {};
  }
  return methodTarget[METHOD_CONFIG_KEY] as Record<string, MethodConfig>;
}

function applyMethodConfig(target: object, propertyKey: string, config: Partial<MethodConfig> = {}): void {
  const configMap = ensureMethodConfigMap(target);
  if (!configMap[propertyKey]) {
    configMap[propertyKey] = new MethodConfigDefault();
  }
  const classConfig = getClassConfig(target);
  const mergedNet: RequestInit = {
    ...GlobalNet.config.net,
    ...classConfig.net,
    ...config.net,
  };
  const mergedUrl = config.baseUrl ?? classConfig.baseUrl ?? GlobalNet.config.baseUrl;
  configMap[propertyKey] = {
    ...configMap[propertyKey],
    name: config.name ?? propertyKey,
    baseUrl: mergedUrl,
    net: mergedNet,
    send: config.send !== undefined ? buildSendPaths(target, propertyKey, config.send) : configMap[propertyKey].send,
    receive: config.receive ?? configMap[propertyKey].receive,
  };
}

export function MetaMethod(config?: Partial<MethodConfig>) {
  return function (target: object, propertyKey: string, _descriptor: PropertyDescriptor) {
    applyMethodConfig(target, propertyKey, config);
  };
}

export function Send(paths: string[] = []) {
  return function (target: object, propertyKey: string, _descriptor: PropertyDescriptor) {
    applyMethodConfig(target, propertyKey, { send: paths });
  };
}

export function Receive(paths: string[] = []) {
  return function (target: object, propertyKey: string, _descriptor: PropertyDescriptor) {
    applyMethodConfig(target, propertyKey, { receive: paths });
  };
}

export function getMethodConfig(target: object, propertyKey: string): MethodConfig | undefined {
  const methodTarget = target as Record<string, unknown>;
  const configMap = methodTarget[METHOD_CONFIG_KEY] as Record<string, MethodConfig> | undefined;
  return configMap?.[propertyKey];
}

export function hasSendConfig(target: object, propertyKey: string): boolean {
  const config = getMethodConfig(target, propertyKey);
  return config !== undefined && config.send.length > 0;
}
