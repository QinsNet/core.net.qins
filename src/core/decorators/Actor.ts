import 'reflect-metadata';
import type { NodeClassConfig, NodeMethodConfig } from '../config';
import { EndpointGateway } from '../node/EndpointGateway';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { Logger } from '../util/Logger';
import { Endpoint } from '../node/Endpoint';

export const METHOD_ENDPOINTS_KEY = '__endpoints__';
export function Actor(config?: NodeClassConfig) {
  return function (constructor: Function) {
    Logger.info('Actor decorator executing', { 
      className: constructor.name,
      endpoint: config?.endpoint,
      configName: config?.name 
    });

    const classConfig: NodeClassConfig = {
      endpoint: config?.endpoint,
      name: config?.name ?? constructor.name,
      actor: config?.actor ?? registerClassTransformerTypeProtocol(constructor as ClassConstructor<unknown>),
    };
    
    const endpoints = (constructor as unknown as Record<string, Array<NodeMethodConfig>>)[METHOD_ENDPOINTS_KEY] as Endpoint[];
    if (endpoints) {
      Logger.info('Actor found method configs', { 
        className: constructor.name,
        methodCount: endpoints.length 
      });
      
      for (const endpoint of endpoints) {
        endpoint.config.classConfig = classConfig;
        endpoint.register();
        Logger.debug('Creating endpoint', {
          className: constructor.name,
          methodName: endpoint.config.name,
          endpoint: classConfig.endpoint 
        });
      }
    } else {
      Logger.warn('Actor has no method configs', { className: constructor.name });
    }
  };
}
