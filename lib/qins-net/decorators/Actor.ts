import 'reflect-metadata';

import { Logger } from '../util/Logger';
import { PathEndpoint } from '../endpoint/path/PathEndpoint';
import { ActorProperties } from '../config/Actor';
import { EndpointConfig } from '../config/EndpointConfig';
import { GlobalConfig } from '../config/Global';
import { EndpointType } from '../config/Protocol';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';

export const METHOD_ENDPOINT_CONFIGS_KEY = '__endpoint_configs__';
export function Actor(properties?: ActorProperties) {
  properties ??= {};
  return function (constructor: Function) {
    const configs = getEndpointConfigs(constructor);
    if (configs) {
      for (const config of Object.values(configs)) {
        config.actor.type = properties.actor ?? registerClassTransformerTypeProtocol(constructor as ClassConstructor<unknown>);
        let endpoint = config.method.endpointInstance;
        if (!endpoint) {
          const type = config.method.endpointType || config.actor.endpointType || GlobalConfig.type;
          if(type === EndpointType.Path){
            endpoint = new PathEndpoint(endpoint);
          } else {
            throw new Error('Endpoint type not supported');
          }
        }
        endpoint.register();
      }
    } else {
      Logger.warn('Actor has no method configs', { className: constructor.name });
    }
  };
}
export function getEndpointConfigs(target: object): Record<string, EndpointConfig> {
  const constructor = target.constructor as unknown as Record<string, Record<string, EndpointConfig>>;
  if(!constructor[METHOD_ENDPOINT_CONFIGS_KEY]){
    constructor[METHOD_ENDPOINT_CONFIGS_KEY] = {};
  }
  return constructor[METHOD_ENDPOINT_CONFIGS_KEY];
}
export function getEndpointConfig(target: object, name: string): EndpointConfig {
  const configs = getEndpointConfigs(target);
  if(!configs[name]){
    configs[name] = new EndpointConfig();
    return configs[name];
  }
  return configs[name];
}
