import 'reflect-metadata';
import { MethodProperties } from '../config/Action';
import {  getNodeProperties } from './Actor';
import deepmerge from 'deepmerge';
import { Object as ObjectTB } from "ts-toolbelt"
import { Gateway } from '../gateway/IGateway';
import { MetaProtocol, MetaProtocolType, MetaType, ReactionProtocol, ReactionProtocolType } from '../protocol';
import { TypeNode } from '../serialize';
 
export function Action(properties: ObjectTB.Partial<MethodProperties,'deep'> = {}) {
  return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
    Gateway.logger.debug('Action decorating', { methodName: propertyKey });
    const nodeConfig = getNodeProperties(target.constructor, propertyKey);
    const config = nodeConfig.method;
    config.name = propertyKey;
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
    nodeConfig.method = deepmerge(config,properties, { clone: false }) as MethodProperties;
    //开始解析反应
    if(!properties.reaction) throw new Error('Reaction protocol is required');
    nodeConfig.reaction = {
      type: Gateway.types.get(properties.reaction.type!)!,
      input: {
        parameters: parseReactionProtocol(config.reaction!.input.parameters),
        attributes: parseReactionProtocol(config.reaction!.input.attributes),
      },
      output: {
        parameters: parseReactionProtocol(config.reaction!.output.parameters),
        attributes: parseReactionProtocol(config.reaction!.output.attributes),
      }
    }
  };
}
function parseReactionProtocol(reaction: {[key: string]: MetaProtocol}): {[key: string]: MetaProtocolType} {
  const parsedReaction: {[key: string]: MetaProtocolType} = {};
  for(const protocol of Object.keys(reaction)){
    const reactionType: MetaProtocolType = {
     type: Gateway.types.get(reaction[protocol].type)!
    };
    parsedReaction[protocol] = reactionType;
    if(reaction[protocol].attributes){
      reactionType.attributes = parseReactionProtocol(reaction[protocol].attributes);
    }
  }
  return parsedReaction;
}
