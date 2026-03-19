import { Actor } from "../decorators/Actor";

@Actor()
class GlobalException extends Error{
    constructor(public message: string){
        super(message);
    }
    throwException(){
        throw this;
    }
}