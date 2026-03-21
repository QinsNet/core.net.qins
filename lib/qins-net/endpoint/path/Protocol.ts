import { setValueByPath } from "../../util/ObjectUtil";
import { ExceptionProtocol, ParameterProtocol, RequestProtocol, ResponseProtocol } from "../../protocol/Protocol";
import { OperateType, RequestPact, ResponsePact } from "../../config/Method";

export class PathRequestProtocol implements RequestProtocol {
    public version: string = '1'
    constructor(
        public endpoint: string = '',
        public method: string = '',
        public actor: {
            type: string,
            properties?: unknown
        },
        public parameters: {[key: string]: ParameterProtocol},
        path: RequestPact
    ){
        if(path){
          filterInstance(this,path);
          filterParameters(this,path);
        }
    }
}
export class PathResponseProtocol implements ResponseProtocol {
    public version: string = '1'
    constructor(
        public endpoint: string = '',
        public actor: {
          type: string,
          properties?: unknown
        },
        public parameters: {[key: string]: ParameterProtocol},
        public result: {
          type: string,
          properties?: unknown
        },
        path: ResponsePact,
        public exception?: ExceptionProtocol,
    ){
        if(path){
          filterInstance(this,path);
          filterParameters(this,path);
          filterResult(this,path);
        }
    }
}


function filterInstance(protocol: RequestProtocol|ResponseProtocol,path: RequestPact|ResponsePact){
  const properties = protocol.actor?.properties;
  delete protocol.actor?.properties;
  if(!path.actor){
    return
  }
  protocol.actor!.properties = ObjectFilter(properties,{},path.actor);
}
function filterParameters(protocol: RequestProtocol|ResponseProtocol,path: RequestPact|ResponsePact){
  const sourceParameters = {} as {[key: string]: ParameterProtocol};
  Object.values(protocol.parameters).forEach((p) => {
    sourceParameters[p.name] = p;
    delete p.properties;
  })
  if(path.parameters){
    for(const [name,parameter] of Object.entries(path.parameters)){
      protocol.parameters[name].properties = ObjectFilter(sourceParameters[name].properties,{},parameter as {[key: string]: unknown});
    }
  }
}
function filterResult(protocol: ResponseProtocol,path: ResponsePact){
  const properties = protocol.result?.properties;
  delete protocol.result?.properties;
  if(path.result){
    protocol.result.properties = ObjectFilter(properties,{},path.result);
  }
}
export function ObjectFilter(source: unknown, target: unknown, paths: Record<string, unknown> | OperateType): unknown {
  if(paths === OperateType.Opaque){
    if(typeof source !== 'object'){
      return source;
    }
    return Object.assign(target as object,source);
  }
  const sourceMap = source as {[key: string]: unknown};
  const targetMap = target as {[key: string]: unknown};
  if (!sourceMap || typeof sourceMap !== 'object' || sourceMap === null || typeof targetMap !== 'object' || targetMap === null || typeof paths !== 'object' || paths === null) {
    throw new Error('ObjectFilter: source, target, paths must be objects which can sync values');
  }

  for (const key of Object.keys(paths)) {
    if (!(key in sourceMap)) continue;
    
    const sourceValue = sourceMap[key];
    const pathValue = paths[key];
    
    if (sourceValue === undefined) continue;
    
    const hasNestedPath = pathValue !== null && typeof pathValue === 'object';
    
    if (hasNestedPath) {
      targetMap[key] = {};
      ObjectFilter(sourceValue, targetMap[key], pathValue as Record<string, unknown> | OperateType);
    } else if (pathValue === OperateType.Opaque) {
      targetMap[key] = sourceValue;
    }
  }
  return target;
}


export function path2json(pathString: string, leafValue: OperateType = OperateType.Opaque): RequestPact|ResponsePact {
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
