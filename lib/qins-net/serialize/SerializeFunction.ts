import { ClassConstructor, ClassTransformOptions, instanceToPlain, plainToClassFromExist } from "class-transformer";
import { TypeProtocol } from "../protocol/Protocol";
import { Gateway } from "../node/Gateway";

export class ClassTransformerTypeProtocol<T> implements TypeProtocol<T> {
    name: string;
    type: ClassConstructor<T>;
    options: ClassTransformOptions;
    constructor(type: ClassConstructor<T>, options?: ClassTransformOptions){
        this.type = type;
        this.name = type.name;
        this.options = options ?? {};
    }

    serialize = (instance: T):string => {
        return JSON.stringify(instanceToPlain(instance, this.options));
    }
    deserialize = (serialized: string|Object,instance?: T):T => {
        return plainToClassFromExist(instance? instance : new this.type(), serialized instanceof Object ? serialized : JSON.parse(serialized as string), this.options);
    }
}

export function registerClassTransformerTypeProtocol<T>(type: ClassConstructor<T>, options?: ClassTransformOptions): TypeProtocol<T> {
    const name = type.name;
    if (Gateway.types.has(name)) {
        return Gateway.types.get(name) as TypeProtocol<T>;
    }
    Gateway.types.set(name, new ClassTransformerTypeProtocol<T>(type, options));
    return Gateway.types.get(name) as TypeProtocol<T>;
}
export function registerTypeProtocol<T>(protocol: TypeProtocol<T>): TypeProtocol<T> {
    if (Gateway.types.has(protocol.name)) {
        return Gateway.types.get(protocol.name) as TypeProtocol<T>;
    }
    Gateway.types.set(protocol.name, protocol);
    return Gateway.types.get(protocol.name) as TypeProtocol<T>;
}
export function registerVoidTypeProtocol(): TypeProtocol<void> {
    return {name: 'Void', type: () => void 0, serialize: () => '', deserialize: () => void 0};
}