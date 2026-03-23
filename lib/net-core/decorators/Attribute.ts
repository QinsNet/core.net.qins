import 'reflect-metadata';
import { TypeNode } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { AttributeProperties } from '../config/Attribute';
import { registerAttributeProperties } from './Actor';
import deepmerge from 'deepmerge';
import { Object as ObjectTB } from "ts-toolbelt"

function Attribute(properties: ObjectTB.Partial<AttributeProperties,'deep'> = {}) {
  return function (target: object, propertyKey: string) {
    const defaultProperties = {} as ObjectTB.Partial<AttributeProperties,'deep'>;
    //name
    defaultProperties.name = defaultProperties.name ?? propertyKey;
    //type
    const type = Reflect.getMetadata('design:type', target, propertyKey) as ClassConstructor<unknown>;
    defaultProperties.type = defaultProperties.type ?? TypeNode(type as ClassConstructor<unknown>);
    const attribute = deepmerge(defaultProperties as AttributeProperties,properties, { clone: false });
    registerAttributeProperties(target.constructor, attribute);
  };
}
export function AttributeNode(properties: ObjectTB.Partial<AttributeProperties,'deep'> = {}) {
  return Attribute(properties);
}