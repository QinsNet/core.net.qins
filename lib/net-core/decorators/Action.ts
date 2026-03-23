import 'reflect-metadata';
import { path2json } from '../node/path/Protocol';
import { TypeNode,  } from '../serialize/SerializeFunction';
import { MethodProperties, RequestPact, ResponsePact } from '../config/Action';
import { ParameterProperties } from '../config/Parameter';
import {  getNodeProperties } from './Actor';
import deepmerge from 'deepmerge';
import { Object as ObjectTB } from "ts-toolbelt"
import { Gateway } from '../gateway/IGateway';

function Action(properties: ObjectTB.Partial<MethodProperties,'deep'> = {}) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    Gateway.logger.debug('Action decorating', { methodName: propertyKey });

    const nodeConfig = getNodeProperties(target.constructor, propertyKey);
    const config = nodeConfig.method;

    config.name = propertyKey;

    if(!config.result.type){
      throw new Error(`Action ${propertyKey} result type is not defined`);
    }

    Gateway.logger.debug('Action result type', {
      methodName: propertyKey,
      resultType: config.result.type.name
    });

    const originalMethod = descriptor.value;
    config.handler = async (instance: object, ...args: unknown[]): Promise<unknown> => {
      return originalMethod.apply(instance, args);
    };

    config.isStatic = !target.hasOwnProperty(propertyKey);

    descriptor.value = async function (this: object, ...args: unknown[]): Promise<unknown> {
      const node = Gateway.findNode(nodeConfig.net.endpoint);
      if(!node) throw new Error(`Node ${nodeConfig.net.endpoint} not found`);
      return node.request(this, ...args);
    };

    mappingParameter(target, propertyKey, config);
    nodeConfig.method = deepmerge(config,properties, { clone: false });

    Gateway.logger.debug('Action config', {
      methodName: propertyKey,
      parameters: Object.entries(config.parameters || {}).map(([name, p]) => ({
        name,
        type: p.type.name,
        index: p.index
      })),
      pact: config.pact
    });
  };

  function mappingParameter(target: object, propertyKey: string,config: Partial<MethodProperties>) {
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as Function[];
    if(!config.parameters) config.parameters = {};
    if (paramTypes && paramTypes.length > 0) {
      for (let i = 0; i < paramTypes.length; i++) {
        if(!Object.values(config.parameters).find(p=>p.index===i)){
          const param = { name: `param${i}`, type: TypeNode(paramTypes[i]), index: i } as ParameterProperties;
          config.parameters[param.name] = param;

          Gateway.logger.debug('Parameter config', {
            methodName: propertyKey,
            parameter: {
              name: param.name,
              type: param.type.name,
              index: param.index
            }
          });
        }
      }
    }
  }
}

export function ActionNode(properties: ObjectTB.Partial<MethodProperties | { pact: { request?: string, response?: string } },'deep'> = {}) {
  if(!properties.pact) properties.pact = {};
  if (typeof properties.pact.request === 'string') {
    properties.pact.request = path2json(properties.pact.request) as RequestPact;
  }
  if (typeof properties.pact.response === 'string') {
    properties.pact.response = path2json(properties.pact.response) as ResponsePact;
  }
  return Action(properties as ObjectTB.Partial<MethodProperties,'deep'>);
}