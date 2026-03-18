import 'reflect-metadata';
import type { NodeMethodConfig, Endpoint } from '../node/Endpoint';
import { createEndpoint } from '../node/Endpoint';
import { getClassConfig } from './Class';
import { EndpointGateway } from '../node/EndpointGateway';
import { path2json } from '../protocol/PathProtocol';

const METHOD_ENDPOINT_KEY = '__method_endpoint__';

export interface RequestPact {
  actor?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

export interface ResponsePact {
  actor?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  return?: Record<string, unknown>;
}

export enum OperateType {
  Opaque = 'opaque',
}
export function NodeMethod(config?: NodeMethodConfig) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const classConfig = getClassConfig(target) ?? {};
    const methodName = propertyKey;
    const methodConfig: NodeMethodConfig = {
      endpoint: config?.endpoint,
      name: config?.name ?? methodName,
      request: config?.request,
      response: config?.response,
      paramsName: mappingParameter(target, propertyKey),
    };

    if (typeof methodConfig.request === 'string') {
        methodConfig.request = path2json(methodConfig.request);
    }
    if (typeof methodConfig.response === 'string') {
        methodConfig.response = path2json(methodConfig.response);
    }

    const originalMethod = descriptor.value;

    const handler = async (instance: object, ...args: unknown[]): Promise<unknown> => {
      return originalMethod.apply(instance, args);
    };
    const endpoint = createEndpoint(
        classConfig,
        methodConfig,
        target.constructor,
        handler
    )
    setMetaClassEndpoint(target, methodName, endpoint);
    EndpointGateway.registerEndpoint(getMetaClassEndpoint(target, methodName)!);
    (target as Record<string, unknown>)[`${METHOD_ENDPOINT_KEY}_${methodName}`] = endpoint;


    descriptor.value = async function (this: object, ...args: unknown[]): Promise<unknown> {
      const response = await endpoint.request(this, ...args);
      if(response.exception){
        throw response.exception;
      }
      return response.result;
    }
  };
  function mappingParameter(target: object, propertyKey: string): string[] {
    const names = []
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as [];
    if(paramTypes && paramTypes.length > 0) {
      for (let i = 0; i < paramTypes.length; i++) {
        const name = (paramTypes[i] as { name: string }).name;
        names.push(name);
      }
    }
    return names;
  }
}

export function getMethodEndpoint(target: object, propertyKey: string): Endpoint | undefined {
  return (target as Record<string, unknown>)[`${METHOD_ENDPOINT_KEY}_${propertyKey}`] as Endpoint | undefined;
}

function getMetaClassEndpoint(target: object, methodName: string): Endpoint | undefined {
  return (target as Record<string, unknown>)[`${METHOD_ENDPOINT_KEY}_${methodName}`] as Endpoint | undefined;
}
function setMetaClassEndpoint(target: object, methodName: string, endpoint: Endpoint): Endpoint {
  (target as Record<string, unknown>)[`${METHOD_ENDPOINT_KEY}_${methodName}`] = endpoint;
  return endpoint;
}