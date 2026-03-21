import 'reflect-metadata';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { ParameterProperties } from '../config/Parameter';
import { getNodeProperties } from './Actor';
import deepmerge from 'deepmerge';
import { Object as ObjectTB } from "ts-toolbelt"



export function ParameterNode(properties: ObjectTB.Partial<ParameterProperties,'deep'> = {}) {
  return function (target: object, propertyKey: string, parameterIndex: number) {
    const defaultProperties = {} as ObjectTB.Partial<ParameterProperties,'deep'>;
    //名称
    defaultProperties.name =`param${parameterIndex}`;
    //类型
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as ClassConstructor<unknown>[];
    const paramType = paramTypes?.[parameterIndex];
    defaultProperties.type = registerClassTransformerTypeProtocol(paramType as ClassConstructor<unknown>);
    //索引
    defaultProperties.index = parameterIndex;
    const nodeConfig = getNodeProperties(target, propertyKey);
    if(!nodeConfig.method.parameters) nodeConfig.method.parameters = {};
    nodeConfig.method.parameters[defaultProperties.name] = deepmerge(defaultProperties as ParameterProperties,properties);
  };
}