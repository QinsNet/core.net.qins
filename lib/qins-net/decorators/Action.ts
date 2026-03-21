import 'reflect-metadata';
import { path2json } from '../node/path/Protocol';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { MethodProperties, RequestPact, ResponsePact } from '../config/Action';
import { ParameterProperties } from '../config/Parameter';
import {  getNodeProperties } from './Actor';
import deepmerge from 'deepmerge';

export function Action(properties: Partial<MethodProperties> = {}) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    //node
    const nodeConfig = getNodeProperties(target, propertyKey);
    const config = nodeConfig.method;
    //name
    config.name = propertyKey;
    //result
    const returnType = Reflect.getMetadata('design:returntype', target, propertyKey) as ClassConstructor<unknown>;
    config.result = registerClassTransformerTypeProtocol(returnType);
    //handler
    const originalMethod = descriptor.value;
    config.handler = async (instance: object, ...args: unknown[]): Promise<unknown> => {
      return originalMethod.apply(instance, args);
    };
    //isStatic
    config.isStatic = !target.hasOwnProperty(propertyKey);
    //descriptor
    descriptor.value = async (instance: object, ...args: unknown[]): Promise<unknown> => {
      return config.handler!(instance, args);
    };
    //request
    deepmerge(config,properties);
    //response
    if (typeof config.request === 'string') {
      config.request = path2json(config.request) as RequestPact;
    }
    if (typeof config.response === 'string') {
      config.response = path2json(config.response) as ResponsePact;
    }
    //parameters
    mappingParameter(target, propertyKey, config);
    nodeConfig.method = deepmerge(nodeConfig.method,config);
  };

  function mappingParameter(target: object, propertyKey: string,config: Partial<MethodProperties>) {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as ClassConstructor<unknown>[];
    const paramNames = Reflect.getMetadata('design:paramnames', target, propertyKey) as string[];
    if(!config.parameters) config.parameters = {};
    if (paramTypes && paramTypes.length > 0) {
      for (let i = 0; i < paramTypes.length; i++) {
        if(!Object.values(config.parameters).find(p=>p.index===i)){
          const param = { name: paramNames[i], type: registerClassTransformerTypeProtocol(paramTypes[i]), index: i } as ParameterProperties;
          config.parameters[param.name] = param;
        }
      }
    }
  }
}

export function ActionNode(properties: Partial<MethodProperties | { request?: string, response?: string }> = {}) {
  //request
  if (typeof properties.request === 'string') {
    properties.request = path2json(properties.request) as RequestPact;
  }
  //response
  if (typeof properties.response === 'string') {
    properties.response = path2json(properties.response) as ResponsePact;
  }
  return Action(properties as Partial<MethodProperties>);
}