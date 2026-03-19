import 'reflect-metadata';
import type { ActorConfig } from '../config';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { Logger } from '../util/Logger';
import type { IEndpoint } from '../endpoint/IEndpoint';

export const METHOD_ENDPOINTS_KEY = '__endpoints__';
export function Actor(config?: ActorConfig) {
  return function (constructor: Function) {
    Logger.info('Actor decorator executing', {
      className: constructor.name,
      endpoint: config?.endpoint,
      configName: config?.name
    });

    const classConfig: ActorConfig = {
      endpoint: config?.endpoint,
      name: config?.name ?? constructor.name,
      actor: config?.actor ?? registerClassTransformerTypeProtocol(constructor as ClassConstructor<unknown>),
    };

    const endpoints = (constructor as unknown as Record<string, Array<IEndpoint>>)[METHOD_ENDPOINTS_KEY] as IEndpoint[];
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