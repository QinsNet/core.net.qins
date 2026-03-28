import 'reflect-metadata';

import { PathNode } from '../node/path/Node';
import { NodeProperties } from '../config/Node';
import { NodeProtocolType, ProtocolProperties } from '../config/Protocol';
import deepmerge from 'deepmerge';
import { Object as ObjectTB } from "ts-toolbelt"
import { Gateway } from '../gateway/IGateway';
import { NetProperties } from '../config/Net';
import { ActorProperties } from '../config';

export const METHOD_ENDPOINT_CONFIGS_KEY = '__node_configs__';
export const ATTRIBUTE_ENDPOINT_CONFIGS_KEY = '__attribute_configs__';

export function Actor(userActorProperties: ObjectTB.Partial<ActorProperties,'deep'> = {}) {
  return function (constructor: Function) {
    Gateway.logger.debug('Actor decorating', { className: constructor.name });

    const allNodeProperties = getAllNodeProperties(constructor);
    if (allNodeProperties) {
      for (const nodeProperties of Object.values(allNodeProperties)) {
        nodeProperties.actor = deepmerge(nodeProperties.actor, userActorProperties || {}, { clone: false });
        nodeProperties.actor.name = constructor.name;
        nodeProperties.net = deepmerge.all([nodeProperties.net, Gateway.config.net || {},nodeProperties.actor.net || {},nodeProperties.method.net || {}], { clone: false }) as NetProperties;
        nodeProperties.protocol = deepmerge.all([nodeProperties.protocol, Gateway.config.protocol || {},nodeProperties.actor.protocol || {},nodeProperties.method.protocol || {}], { clone: false }) as ProtocolProperties;
        if(nodeProperties.protocol.type === NodeProtocolType.Path){
          const node = new PathNode(nodeProperties);
          Gateway.registerNode(node);
        } else {
          throw new Error('Node type not supported');
        }
      }
    }
  };
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