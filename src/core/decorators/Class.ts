import 'reflect-metadata';
import type { NodeClassConfig } from '../config';

const CLASS_CONFIG_KEY = '__node_class_config__';

export function NodeClass(config?: NodeClassConfig) {
  return function (constructor: Function) {
    const classConfig: NodeClassConfig = {
      endpoint: config?.endpoint,
      name: config?.name,
    };
    
    (constructor as unknown as Record<string, unknown>)[CLASS_CONFIG_KEY] = classConfig;
  };
}

export function getClassConfig(target: object): NodeClassConfig | undefined {
  const constructor = target.constructor;
  return (constructor as unknown as Record<string, unknown>)[CLASS_CONFIG_KEY] as NodeClassConfig | undefined;
}
