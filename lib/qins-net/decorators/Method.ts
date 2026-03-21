import 'reflect-metadata';
import { path2json } from '../endpoint/path/PathProtocol';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { MethodConfig, MethodProperties, RequestProperties, ResponseProperties } from '../config/Method';
import { ParameterConfig } from '../config/Parameter';
import { getEndpointConfig } from './Actor';

export function Method(properties?: MethodProperties) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    properties ??= {};
    const config = getEndpointConfig(target,propertyKey).method;
    //name
    config.name = properties.name ?? propertyKey;
    //result
    const returnType = Reflect.getMetadata('design:returntype', target, propertyKey) as ClassConstructor<unknown>;
    config.result = properties.result ?? registerClassTransformerTypeProtocol(returnType);
    //handler
    const originalMethod = descriptor.value;
    config.handler = async (instance: object, ...args: unknown[]): Promise<unknown> => {
      return originalMethod.apply(instance, args);
    };
    //isStatic
    config.isStatic = properties.isStatic ?? !target.hasOwnProperty(propertyKey);
    //descriptor
    descriptor.value = async (instance: object, ...args: unknown[]): Promise<unknown> => {
      return config.handler(instance, args);
    };
    //request
    let request = properties.request ?? {};
    if (typeof request === 'string') {
      request = path2json(request) as RequestProperties;
    }
    config.request = request ?? {};
    //response
    let response = properties.response ?? {};
    if (typeof response === 'string') {
      response = path2json(response) as ResponseProperties;
    }
    config.response = response ?? {};
    //parameters
    mappingParameter(target, propertyKey, config);
  };

  function mappingParameter(target: object, propertyKey: string,config: MethodConfig) {
    const params = [] as ParameterConfig[];
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as ClassConstructor<unknown>[];
    const paramNames = Reflect.getMetadata('design:paramnames', target, propertyKey) as string[];

    if (paramTypes && paramTypes.length > 0) {
      for (let i = 0; i < paramTypes.length; i++) {
        let param = Object.values(config.parameters).find(p=>p.index===i);
        if(!param){
          param = new ParameterConfig();
          params.push(param);
        }
        param.name ??= paramNames[i];
        param.type ??= registerClassTransformerTypeProtocol(paramTypes[i]);
        param.index = i;
      }
    }
    params.forEach(p=>config.parameters[p.name]=p);
  }
}