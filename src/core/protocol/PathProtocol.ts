import { OperateType, RequestPact, ResponsePact } from "../decorators/Method";
import { setValueByPath } from "../util/ObjectUtil";
import { ExceptionProtocol, RequestProtocol, ResponseProtocol } from "./Protocol";

export class PathRequestProtocol implements RequestProtocol {
    public version: string = '1'
    constructor(
        public endpoint: string = '',
        public method: string = '',
        public actor?: { [key: string]: unknown; },
        public parameters?: { name: string; value: unknown; }[],
    ){

    }
    static from(request: RequestProtocol,path: RequestPact): PathRequestProtocol {
        const instance = new PathRequestProtocol(
            request.endpoint,
            request.method
        );
        ObjectFilter(request,instance,path);
        return instance;
    }
}
export class PathResponseProtocol implements ResponseProtocol {
    public version: string = '1'
    constructor(
        public endpoint: string = '',
        public exception?: ExceptionProtocol
    ){

    }
    static from(response: ResponseProtocol,request: RequestProtocol,path: ResponsePact): PathResponseProtocol {
        const instance = new PathResponseProtocol(
            response.endpoint,
            response.exception,
        );
        ObjectFilter(response,request,path);
        return instance;
    }
}


export function ObjectFilter(source: Record<string, any>, target: Record<string, any>, paths: Record<string, any>): void {
  if (!source || typeof source !== 'object' || source === null) {
    return;
  }
  
  if (typeof target !== 'object' || target === null) {
    return;
  }
  
  if (typeof paths !== 'object' || paths === null) {
    return;
  }
  
  for (const key of Object.keys(paths)) {
    if (!(key in source)) continue;
    
    const sourceValue = source[key];
    const pathValue = paths[key];
    
    if (sourceValue === undefined) continue;
    
    const hasNestedPath = pathValue !== null && typeof pathValue === 'object';
    
    if (hasNestedPath) {
      target[key] = {};
      ObjectFilter(sourceValue, target[key], pathValue);
    } else if (pathValue === OperateType.Opaque) {
      target[key] = sourceValue;
    }
  }
}


export function path2json(pathString: string, leafValue: OperateType = OperateType.Opaque): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  if (!pathString || typeof pathString !== 'string') {
    return result;
  }
  
  const paths = pathString.split(',').map(p => p.trim()).filter(p => p);
  
  for (const path of paths) {
    setValueByPath(result, path, leafValue);
  }
  
  return result;
}
