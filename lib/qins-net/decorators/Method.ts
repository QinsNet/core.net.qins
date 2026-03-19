import 'reflect-metadata';
import type { MethodConfig } from '../config';
import { path2json } from '../endpoint/path/PathProtocol';
import { ClassTransformerTypeProtocol, registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { Logger } from '../util/Logger';
import type { IEndpoint } from '../endpoint/IEndpoint';
import { PathEndpoint } from '../endpoint/path/PathEndpoint';
import { METHOD_ENDPOINTS_KEY } from './Actor';

export interface RequestPact {
  actor?: Record<string, unknown> | OperateType;
  parameters?: Record<string, unknown> | OperateType;
}

export interface ResponsePact {
  actor?: Record<string, unknown> | OperateType;
  parameters?: Record<string, unknown> | OperateType;
  result?: Record<string, unknown> | OperateType;
}

export enum OperateType {
  Opaque = 'opaque',
}

export function Method(config?: MethodConfig) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    const methodName = propertyKey;
    const className = target.constructor.name;

    Logger.debug('NodeMethod decorator executing', {
      className,
      methodName,
      configName: config?.name
    });

    const originalMethod = descriptor.value;
    const handler = async (instance: object, ...args: unknown[]): Promise<unknown> => {
      return originalMethod.apply(instance, args);
    };

    const returnType = Reflect.getMetadata('design:returntype', target, propertyKey) as ClassConstructor<unknown>;
    const methodConfig: MethodConfig = {
      endpoint: config?.endpoint,
      name: config?.name ?? methodName,
      request: config?.request,
      response: config?.response,
      isStatic: !target.hasOwnProperty(methodName),
      params: mappingParameter(target, propertyKey),
      result: returnType ? registerClassTransformerTypeProtocol(returnType) : {type: ()=>undefined, name: 'void', serialize: () => '', deserialize: () => undefined},
      handler,
      descriptor
    };

    if (typeof methodConfig.request === 'string') {
      methodConfig.request = path2json(methodConfig.request);
    }
    if (typeof methodConfig.response === 'string') {
      methodConfig.response = path2json(methodConfig.response);
    }
    const endpoint: IEndpoint = new PathEndpoint();
    endpoint.config.methodConfig = methodConfig;
    descriptor.value = async function (...args: unknown[]) {
      return await endpoint.request(this, ...args);
    };
    const constructor = target.constructor as unknown as Record<string, Array<IEndpoint>>;
    if (!(constructor[METHOD_ENDPOINTS_KEY])) {
      constructor[METHOD_ENDPOINTS_KEY] = [];
    }
    constructor[METHOD_ENDPOINTS_KEY]!.push(endpoint);
    Logger.info('NodeMethod config saved', {
      className,
      methodName,
      isStatic: methodConfig.isStatic,
      paramCount: methodConfig.params?.length ?? 0,
      hasReturnType: !!returnType
    });
  };

  function mappingParameter(target: object, propertyKey: string): { name: string; type: ClassTransformerTypeProtocol<unknown>; index: number; }[] {
    const params: { name: string; type: ClassTransformerTypeProtocol<unknown>; index: number; }[] = [];
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as ClassConstructor<unknown>[];
    const paramNames = Reflect.getMetadata('design:paramnames', target, propertyKey) as string[];

    if (paramTypes && paramTypes.length > 0) {
      for (let i = 0; i < paramTypes.length; i++) {
        const name = paramNames[i];
        const type = registerClassTransformerTypeProtocol(paramTypes[i] as ClassConstructor<unknown>);
        params.push({ name, type, index: i });
      }
      Logger.debug('Parameters mapped', {
        method: propertyKey,
        params: params.map(p => p.name)
      });
    }
    return params;
  }
}