import 'reflect-metadata';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { ParameterProperties } from '../config/Parameter';
import { getEndpointProperties } from './Actor';
import deepmerge from 'deepmerge';

export function ParameterNode(properties: Partial<ParameterProperties> = {}) {
  return function (target: object, propertyKey: string, parameterIndex: number) {
    const defaultProperties = {} as Partial<ParameterProperties>;
    //名称
    defaultProperties.name =`param${parameterIndex}`;
    //类型
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as ClassConstructor<unknown>[];
    const paramType = paramTypes?.[parameterIndex];
    defaultProperties.type = registerClassTransformerTypeProtocol(paramType as ClassConstructor<unknown>);
    //索引
    defaultProperties.index = parameterIndex;
    const endpointConfig = getEndpointProperties(target, propertyKey);
    if(!endpointConfig.method.parameters) endpointConfig.method.parameters = {};
    endpointConfig.method.parameters[defaultProperties.name] = deepmerge(defaultProperties,properties);
  };
}