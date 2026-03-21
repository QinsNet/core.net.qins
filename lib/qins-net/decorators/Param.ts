import 'reflect-metadata';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { ParameterConfig, ParamProperties } from '../config/Parameter';
import { getEndpointConfig } from './Actor';

export function Param(properties?: ParamProperties) {
  return function (target: object, propertyKey: string, parameterIndex: number) {
    properties = properties || {};
    const config = new ParameterConfig();
    Object.assign(config, properties);
    //名称
    config.name ??=`param${parameterIndex}`;
    //类型
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey) as ClassConstructor<unknown>[];
    const paramType = paramTypes?.[parameterIndex];
    config.type ??= registerClassTransformerTypeProtocol(paramType as ClassConstructor<unknown>);
    //索引
    config.index ??= parameterIndex;
    const endpointConfig = getEndpointConfig(target, propertyKey);
    endpointConfig.method.parameters[config.name] = config
  };
}