import { ClassConstructor, ClassTransformOptions, instanceToPlain, plainToClassFromExist } from "class-transformer";
import { MetaType } from "../protocol/Protocol";
import { Gateway } from "../gateway/IGateway";

export class ClassTransformerTypeProtocol<T> implements MetaType<T> {
    name: string;
    instance: ClassConstructor<T>;
    options: ClassTransformOptions;
    constructor(type: Function, options?: ClassTransformOptions){
        this.instance = type as ClassConstructor<T>;
        this.name = type.name;
        this.options = options ?? {};
    }
    serialize = (instance: T):string => {
        return JSON.stringify(instanceToPlain(instance, this.options));
    }
    deserialize = (serialized: string|Object,instance?: T):T => {
        return plainToClassFromExist(instance? instance : new this.instance(), serialized instanceof Object ? serialized : JSON.parse(serialized as string), this.options);
    }
}
export function TypeNode<T>(type: Partial<MetaType<T>>|Function|void): MetaType<T> {
    if(type === void 0){
        return VoidType() as unknown as MetaType<T>;
    }
    if(type instanceof Function){
        type = {name: type.name, instance: type};
    }
    if(!type.name){
        throw new Error('Type Name is required');
    }
    if (Gateway.types.has(type.name)) {
        return Gateway.types.get(type.name) as MetaType<T>;
    }
    if(!type.serialize || !type.deserialize){
        if(!type.instance){
            throw new Error('Type is required');
        }
        const trans = new ClassTransformerTypeProtocol<T>(type.instance);
        type.serialize = trans.serialize;
        type.deserialize = trans.deserialize;
    }
    Gateway.types.set(type.name, type as MetaType<T>);
    return Gateway.types.get(type.name) as MetaType<T>;
}

export function VoidType(): MetaType<void> {
    return TypeNode<any>({name: 'Void', instance: () => void 0, serialize: () => '', deserialize: () => void 0})
}