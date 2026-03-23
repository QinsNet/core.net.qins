import { ClassConstructor, ClassTransformOptions, instanceToPlain, plainToClassFromExist } from "class-transformer";
import { TypeProtocol } from "../protocol/Protocol";
import { Gateway } from "../gateway/route/Gateway";

export class ClassTransformerTypeProtocol<T> implements TypeProtocol<T> {
    name: string;
    type: ClassConstructor<T>;
    options: ClassTransformOptions;
    constructor(type: Function, options?: ClassTransformOptions){
        this.type = type as ClassConstructor<T>;
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
export function TypeNode<T>(type: Partial<TypeProtocol<T>>|Function|void): TypeProtocol<T> {
    if(type === void 0){
        return VoidType() as unknown as TypeProtocol<T>;
    }
    if(type instanceof Function){
        type = {name: type.name, type: type};
    }
    if(!type.name){
        throw new Error('Type Name is required');
    }
    if (Gateway.Types.has(type.name)) {
        return Gateway.Types.get(type.name) as TypeProtocol<T>;
    }
    if(!type.serialize || !type.deserialize){
        if(!type.type){
            throw new Error('Type is required');
        }
        const trans = new ClassTransformerTypeProtocol<T>(type.type);
        type.serialize = trans.serialize;
        type.deserialize = trans.deserialize;
    }
    Gateway.Types.set(type.name, type as TypeProtocol<T>);
    return Gateway.Types.get(type.name) as TypeProtocol<T>;
}

export function VoidType(): TypeProtocol<void> {
    return TypeNode<any>({name: 'Void', type: () => void 0, serialize: () => '', deserialize: () => void 0})
}