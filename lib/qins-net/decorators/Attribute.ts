import 'reflect-metadata';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { AttributeProperties } from '../config/Attribute';
import { getNodeProperties } from './Actor';
import deepmerge from 'deepmerge';
import { Object as ObjectTB } from "ts-toolbelt"

function Attribute(properties: ObjectTB.Partial<AttributeProperties,'deep'> = {}) {
  return function (target: object, propertyKey: string) {
    const defaultProperties = {} as ObjectTB.Partial<AttributeProperties,'deep'>;
    //name
    defaultProperties.name = defaultProperties.name ?? propertyKey;
    //type
    const type = Reflect.getMetadata('design:type', target, propertyKey) as ClassConstructor<unknown>;
    defaultProperties.type = defaultProperties.type ?? registerClassTransformerTypeProtocol(type as ClassConstructor<unknown>);
    const nodeConfig = getNodeProperties(target, propertyKey);
    nodeConfig.actor.attributes[defaultProperties.name] = deepmerge(defaultProperties as AttributeProperties,properties);
  };
}
export function AttributeNode(properties: ObjectTB.Partial<AttributeProperties,'deep'> = {}) {
  return Attribute(properties);
}