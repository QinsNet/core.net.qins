import type { NetConfig } from './Global';

export interface ClassConfig extends NetConfig {
  name: string;
}

class ClassConfigDefault implements ClassConfig {
  constructor(config: Partial<ClassConfig> = {}) {
    Object.assign(this, config);
  }
  name: string = '';
  baseUrl: string = '';
  net: RequestInit = {};
}

const CLASS_CONFIG_KEY = '__class_config__';

export function MetaClass(config?: Partial<ClassConfig>) {
  return function (constructor: Function) {
    if (config === undefined) config = {};
    if (config.name === undefined) config.name = constructor.name;
    const existingConfig: ClassConfig = (constructor as unknown as Record<string, unknown>)[CLASS_CONFIG_KEY] as ClassConfig || new ClassConfigDefault();
    existingConfig.name = config.name;
    (constructor as unknown as Record<string, unknown>)[CLASS_CONFIG_KEY] = { ...existingConfig, ...config };
  };
}

export function getClassConfig(target: object): ClassConfig {
  const constructor = target.constructor;
  return (constructor as unknown as Record<string, unknown>)[CLASS_CONFIG_KEY] as ClassConfig || {};
}
