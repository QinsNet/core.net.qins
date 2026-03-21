import 'reflect-metadata';

import { Logger } from '../util/Logger';
import { PathNode } from '../node/path/Node';
import { ActorProperties } from '../config/Actor';
import { NodeProperties } from '../config/Node';
import { NodeType, ProtocolProperties } from '../config/Protocol';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import deepmerge from 'deepmerge';
import { Object as ObjectTB } from "ts-toolbelt"
import { Gateway } from '../node/Gateway';
import { NetProperties } from '../config/Net';



export const METHOD_ENDPOINT_CONFIGS_KEY = '__node_configs__';
export function Actor(userActorProperties: ObjectTB.Partial<ActorProperties,'deep'> = {}) {  
  return function (constructor: Function) {
    const allNodeProperties = getAllNodeProperties(constructor);
    //register
    if (allNodeProperties) {
      for (const nodeProperties of Object.values(allNodeProperties)) {
        nodeProperties.actor.name = constructor.name;
        nodeProperties.actor.type = registerClassTransformerTypeProtocol(constructor as ClassConstructor<unknown>);
        nodeProperties.actor = deepmerge(nodeProperties.actor, userActorProperties || {}, { clone: false });
        //合并配置
        nodeProperties.net = deepmerge.all([nodeProperties.net, Gateway.config.net || {},nodeProperties.actor.net || {},nodeProperties.method.net || {}], { clone: false }) as NetProperties;
        nodeProperties.protocol = deepmerge.all([nodeProperties.protocol, Gateway.config.protocol || {},nodeProperties.actor.protocol || {},nodeProperties.method.protocol || {}], { clone: false }) as ProtocolProperties;
        if(nodeProperties.protocol.type === NodeType.Path){
          const node = new PathNode(nodeProperties);
          Gateway.registerNode(node);
        } else {
          throw new Error('Node type not supported');
        }
      }
    } else {
      Logger.warn('Actor has no method configs', { className: constructor.name });
    }
  };
}

export function ActorNode(properties: ObjectTB.Partial<ActorProperties,'deep'> = {}) {
  return Actor(properties);
}

export function getAllNodeProperties(constructor: Function): Record<string, NodeProperties> {
  const result = constructor as unknown as Record<string, Record<string, NodeProperties>>;
  if(!result[METHOD_ENDPOINT_CONFIGS_KEY]){
    result[METHOD_ENDPOINT_CONFIGS_KEY] = {};
  }
  return result[METHOD_ENDPOINT_CONFIGS_KEY];
}
export function getNodeProperties(constructor: Function, name: string): NodeProperties {
  const configs = getAllNodeProperties(constructor);
  if(!configs[name]){
    configs[name] = new NodeProperties();
    return configs[name];
  }
  return configs[name];
}
