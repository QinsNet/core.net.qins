import { ClassConstructor, ClassTransformOptions, instanceToPlain, plainToClass } from "class-transformer";
import { TypeProtocol } from "../protocol/Protocol";
import { EndpointGateway } from "../endpoint/EndpointGateway";

export class ClassTransformerTypeProtocol<T> implements TypeProtocol<T> {
    name: string;
    type: ClassConstructor<T>;
    options: ClassTransformOptions;
    constructor(type: ClassConstructor<T>, options?: ClassTransformOptions){
        this.type = type;
        this.name = type.name;
        this.options = options ?? {};
    }
    serialize(instance: T): string {
        return JSON.stringify(instanceToPlain(instance, this.options));
    }
    deserialize(serialized: string|Object): T {
        return plainToClass(this.type, serialized instanceof Object ? serialized : JSON.parse(serialized as string), this.options);
    }
}

export function registerClassTransformerTypeProtocol<T>(type: ClassConstructor<T>, options?: ClassTransformOptions): TypeProtocol<T> {
    const name = type.prototype.name;
    if (EndpointGateway.types.has(name)) {
        return EndpointGateway.types.get(name) as TypeProtocol<T>;
    }
    EndpointGateway.types.set(name, new ClassTransformerTypeProtocol(type, options));
    return EndpointGateway.types.get(name) as TypeProtocol<T>;
}
export function registerTypeProtocol<T>(protocol: TypeProtocol<T>): TypeProtocol<T> {
    if (EndpointGateway.types.has(protocol.name)) {
        return EndpointGateway.types.get(protocol.name) as TypeProtocol<T>;
    }
    EndpointGateway.types.set(protocol.name, protocol);
    return EndpointGateway.types.get(protocol.name) as TypeProtocol<T>;
}
export function registerVoidTypeProtocol(): TypeProtocol<void> {
    return {name: 'Void', type: () => void 0, serialize: () => '', deserialize: () => void 0};
}