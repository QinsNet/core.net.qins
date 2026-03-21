import 'reflect-metadata';
import { path2json } from '../node/path/Protocol';
import { registerClassTransformerTypeProtocol, registerVoidTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { MethodProperties, RequestPact, ResponsePact } from '../config/Action';
import { ParameterProperties } from '../config/Parameter';
import {  getNodeProperties } from './Actor';
import deepmerge from 'deepmerge';
import { Object as ObjectTB } from "ts-toolbelt"
import { Gateway } from '../node/Gateway';

export function Action(properties: ObjectTB.Partial<MethodProperties,'deep'> = {}) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    //node
    const nodeConfig = getNodeProperties(target.constructor, propertyKey);
    const config = nodeConfig.method;
    //name
    config.name = propertyKey;
    //result
    const returnType = Reflect.getMetadata('design:returntype', target, propertyKey) as ClassConstructor<unknown>;
    if(!returnType) config.result = registerVoidTypeProtocol();
    else config.result = registerClassTransformerTypeProtocol(returnType);
    //handler
    const originalMethod = descriptor.value;
    config.handler = async (instance: object, ...args: unknown[]): Promise<unknown> => {
      return originalMethod.apply(instance, args);
    };
    //isStatic
    config.isStatic = !target.hasOwnProperty(propertyKey);
    //descriptor
    descriptor.value = async function (instance: object,...args: unknown[]): Promise<unknown> {
      const node = Gateway.findNode(nodeConfig.net.endpoint);
      if(!node) throw new Error(`Node ${nodeConfig.net.endpoint} not found`);
      return node.request(instance, ...args);
    };
    //parameters
    mappingParameter(target, propertyKey, config);
    nodeConfig.method = deepmerge(config,properties, { clone: false });
  };

  function mappingParameter(target: object, propertyKey: string,config: Partial<MethodProperties>) {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as ClassConstructor<unknown>[];
    if(!config.parameters) config.parameters = {};
    if (paramTypes && paramTypes.length > 0) {
      for (let i = 0; i < paramTypes.length; i++) {
        if(!Object.values(config.parameters).find(p=>p.index===i)){
          const param = { name: `param${i}`, type: registerClassTransformerTypeProtocol(paramTypes[i]), index: i } as ParameterProperties;
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
  return Action(properties as ObjectTB.Partial<MethodProperties,'deep'>);
}