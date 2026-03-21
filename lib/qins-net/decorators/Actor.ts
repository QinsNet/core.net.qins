import 'reflect-metadata';

import { Logger } from '../util/Logger';
import { PathEndpoint } from '../endpoint/path/Endpoint';
import { ActorProperties } from '../config/Actor';
import { EndpointProperties } from '../config/Endpoint';
import { EndpointType } from '../config/Protocol';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import deepmerge from 'deepmerge';
import { Gateway } from '../endpoint/Gateway';

export const METHOD_ENDPOINT_CONFIGS_KEY = '__endpoint_configs__';
function Actor(properties: Partial<ActorProperties> = {}) {
  return function (constructor: Function) {
    const allEndpointProperties = getAllEndpointProperties(constructor);
    //register
    if (allEndpointProperties) {
      for (const endpointProperties of Object.values(allEndpointProperties)) {
        const defaultActorProperties = endpointProperties.actor;
        defaultActorProperties.name = constructor.name;
        defaultActorProperties.type = registerClassTransformerTypeProtocol(constructor as ClassConstructor<unknown>);
        endpointProperties.actor = deepmerge(defaultActorProperties, properties || {});
        let endpoint = endpointProperties.method.endpointInstance;
        if (!endpoint) {
          const type = endpointProperties.method.protocol?.endpointType || Gateway.config.protocol.endpointType;
          if(type === EndpointType.Path){
            endpoint = new PathEndpoint(endpointProperties);
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

export function ActorNode(properties: Partial<ActorProperties> = {}) {
  return Actor(properties);
}

export function getAllEndpointProperties(target: object): Record<string, EndpointProperties> {
  const constructor = target.constructor as unknown as Record<string, Record<string, EndpointProperties>>;
  if(!constructor[METHOD_ENDPOINT_CONFIGS_KEY]){
    constructor[METHOD_ENDPOINT_CONFIGS_KEY] = {};
  }
  return constructor[METHOD_ENDPOINT_CONFIGS_KEY];
}
export function getEndpointProperties(target: object, name: string): EndpointProperties {
  const configs = getAllEndpointProperties(target);
  if(!configs[name]){
    configs[name] = new EndpointProperties();
    return configs[name];
  }
  return configs[name];
}
