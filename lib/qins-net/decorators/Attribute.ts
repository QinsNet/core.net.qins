import 'reflect-metadata';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { AttributeProperties } from '../config/Attribute';
import { getEndpointProperties } from './Actor';
import deepmerge from 'deepmerge';

function Attribute(properties: Partial<AttributeProperties> = {}) {
  return function (target: object, propertyKey: string) {
    const defaultProperties = {} as Partial<AttributeProperties>;
    //name
    defaultProperties.name = defaultProperties.name ?? propertyKey;
    //type
    const type = Reflect.getMetadata('design:type', target, propertyKey) as ClassConstructor<unknown>;
    defaultProperties.type = defaultProperties.type ?? registerClassTransformerTypeProtocol(type as ClassConstructor<unknown>);
    const endpointConfig = getEndpointProperties(target, propertyKey);
    endpointConfig.actor.attributes[defaultProperties.name] = deepmerge(defaultProperties,properties || {});
  };
}
export function AttributeNode(properties: Partial<AttributeProperties> = {}) {
  return Attribute(properties);
}