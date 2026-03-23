import 'reflect-metadata';
import { path2json } from '../node/path/Protocol';
import { TypeNode,  } from '../serialize/SerializeFunction';
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
    if(!config.result.type){
      throw new Error(`Action ${propertyKey} result type is not defined`);
    }
    //handler
    const originalMethod = descriptor.value;
    config.handler = async (instance: object, ...args: unknown[]): Promise<unknown> => {
      return originalMethod.apply(instance, args);
    };
    //isStatic
    config.isStatic = !target.hasOwnProperty(propertyKey);
    //descriptor
    descriptor.value = async function (this: object, ...args: unknown[]): Promise<unknown> {
      const node = Gateway.findNode(nodeConfig.net.endpoint);
      if(!node) throw new Error(`Node ${nodeConfig.net.endpoint} not found`);
      return node.request(this, ...args);
    };
    //parameters
    mappingParameter(target, propertyKey, config);
    nodeConfig.method = deepmerge(config,properties, { clone: false });
  };

  function mappingParameter(target: object, propertyKey: string,config: Partial<MethodProperties>) {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as Function[];
    if(!config.parameters) config.parameters = {};
    if (paramTypes && paramTypes.length > 0) {
      for (let i = 0; i < paramTypes.length; i++) {
        if(!Object.values(config.parameters).find(p=>p.index===i)){
          const param = { name: `param${i}`, type: TypeNode(paramTypes[i]), index: i } as ParameterProperties;
          config.parameters[param.name] = param;
        }
      }
    }
  }
}

export function ActionNode(properties: ObjectTB.Partial<MethodProperties | { pact: { request?: string, response?: string } },'deep'> = {}) {
  if(!properties.pact) properties.pact = {};
  //request
  if (typeof properties.pact.request === 'string') {
    properties.pact.request = path2json(properties.pact.request) as RequestPact;
  }
  //response
  if (typeof properties.pact.response === 'string') {
    properties.pact.response = path2json(properties.pact.response) as ResponsePact;
  }
  return Action(properties as ObjectTB.Partial<MethodProperties,'deep'>);
}