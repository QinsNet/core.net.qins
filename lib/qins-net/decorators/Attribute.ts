import 'reflect-metadata';
import { registerClassTransformerTypeProtocol } from '../serialize/SerializeFunction';
import { ClassConstructor } from 'class-transformer';
import { AttributeConfig, AttributeProperties } from '../config/Attribute';
import { getEndpointConfig } from './Actor';

export function Attribute(config?: AttributeProperties) {
  return function (target: object, propertyKey: string) {
    config ??= {};
    const attribute = new AttributeConfig();
    //name
    attribute.name = config.name ?? propertyKey;
    //type
    const type = Reflect.getMetadata('design:type', target, propertyKey) as ClassConstructor<unknown>;
    attribute.type = config.type ?? registerClassTransformerTypeProtocol(type as ClassConstructor<unknown>);
    const endpointConfig = getEndpointConfig(target, propertyKey);
    endpointConfig.actor.attributes[attribute.name] = attribute;
  };
}
