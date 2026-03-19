import { ClassConstructor, ClassTransformOptions, instanceToPlain, plainToClass } from "class-transformer";
import { TypeProtocol } from "../protocol/Protocol";
import { EndpointGateway } from "../node/EndpointGateway";

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

export function registerClassTransformerTypeProtocol<T>(type: ClassConstructor<T>, options?: ClassTransformOptions): ClassTransformerTypeProtocol<T> {
    if (EndpointGateway.types.has(type)) {
        return EndpointGateway.types.get(type) as ClassTransformerTypeProtocol<T>;
    }
    EndpointGateway.types.set(type, new ClassTransformerTypeProtocol(type, options));
    return EndpointGateway.types.get(type) as ClassTransformerTypeProtocol<T>;
}