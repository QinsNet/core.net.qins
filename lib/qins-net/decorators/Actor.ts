import 'reflect-metadata';

import { Logger } from '../util/Logger';
import { PathNode } from '../node/path/Node';
import { ActorProperties } from '../config/Actor';
import { NodeProperties } from '../config/Node';
import { NodeType } from '../config/Protocol';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import deepmerge from 'deepmerge';
import { Gateway } from '../node/Node';
import { Object as ObjectTB } from "ts-toolbelt"



export const METHOD_ENDPOINT_CONFIGS_KEY = '__node_configs__';
export function Actor(properties: ObjectTB.Partial<ActorProperties,'deep'> = {}) {  
  return function (constructor: Function) {
    const allNodeProperties = getAllNodeProperties(constructor);
    //register
    if (allNodeProperties) {
      for (const nodeProperties of Object.values(allNodeProperties)) {
        const defaultActorProperties = nodeProperties.actor;
        defaultActorProperties.name = constructor.name;
        defaultActorProperties.type = registerClassTransformerTypeProtocol(constructor as ClassConstructor<unknown>);
        nodeProperties.actor = deepmerge(defaultActorProperties, properties || {});
        let node = nodeProperties.method.nodeInstance;
        if (!node) {
          const type = nodeProperties.method.protocol?.nodeType || Gateway.config.protocol.nodeType;
          if(type === NodeType.Path){
            node = new PathNode(nodeProperties);
          } else {
            throw new Error('Node type not supported');
          }
        }
        node.register();
      }
    } else {
      Logger.warn('Actor has no method configs', { className: constructor.name });
    }
  };
}

export function ActorNode(properties: ObjectTB.Partial<ActorProperties,'deep'> = {}) {
  return Actor(properties);
}

export function getAllNodeProperties(target: object): Record<string, NodeProperties> {
  const constructor = target.constructor as unknown as Record<string, Record<string, NodeProperties>>;
  if(!constructor[METHOD_ENDPOINT_CONFIGS_KEY]){
    constructor[METHOD_ENDPOINT_CONFIGS_KEY] = {};
  }
  return constructor[METHOD_ENDPOINT_CONFIGS_KEY];
}
export function getNodeProperties(target: object, name: string): NodeProperties {
  const configs = getAllNodeProperties(target);
  if(!configs[name]){
    configs[name] = new NodeProperties();
    return configs[name];
  }
  return configs[name];
}
