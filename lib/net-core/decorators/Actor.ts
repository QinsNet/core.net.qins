import 'reflect-metadata';

import { PathNode } from '../node/path/Node';
import { ActorProperties } from '../config/Actor';
import { NodeProperties } from '../config/Node';
import { NodeProtocolType, ProtocolProperties } from '../config/Protocol';
import { TypeNode } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import deepmerge from 'deepmerge';
import { Object as ObjectTB } from "ts-toolbelt"
import { Gateway } from '../node/Gateway';
import { NetProperties } from '../config/Net';

export const METHOD_ENDPOINT_CONFIGS_KEY = '__node_configs__';

export function Actor(userActorProperties: ObjectTB.Partial<ActorProperties,'deep'> = {}) {
  return function (constructor: Function) {
    Gateway.Logger.debug('Actor decorating', { className: constructor.name });

    const allNodeProperties = getAllNodeProperties(constructor);
    if (allNodeProperties) {
      for (const nodeProperties of Object.values(allNodeProperties)) {
        nodeProperties.actor.name = constructor.name;
        nodeProperties.actor.type = TypeNode(constructor as ClassConstructor<unknown>);
        nodeProperties.actor = deepmerge(nodeProperties.actor, userActorProperties || {}, { clone: false });

        Gateway.Logger.debug('Actor config', {
          className: constructor.name,
          actor: {
            name: nodeProperties.actor.name,
            type: nodeProperties.actor.type.name,
            attributes: Object.keys(nodeProperties.actor.attributes),
          }
        });

        nodeProperties.net = deepmerge.all([nodeProperties.net, Gateway.Config.net || {},nodeProperties.actor.net || {},nodeProperties.method.net || {}], { clone: false }) as NetProperties;
        nodeProperties.protocol = deepmerge.all([nodeProperties.protocol, Gateway.Config.protocol || {},nodeProperties.actor.protocol || {},nodeProperties.method.protocol || {}], { clone: false }) as ProtocolProperties;

        Gateway.Logger.debug('Method config', {
          className: constructor.name,
          methodName: nodeProperties.method.name,
          net: nodeProperties.net,
          protocol: nodeProperties.protocol,
          parameters: Object.keys(nodeProperties.method.parameters || {}),
          result: nodeProperties.method.result?.type?.name
        });

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