import { T } from "ts-toolbelt";
import { TreeViewOperate } from "../view/tree/OperateView";
import { TypeNode } from "../serialize";

export function getValueByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

export function setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
}
export function ViewAssign(source: unknown, target: unknown, paths: Record<string, unknown>|TreeViewOperate): {[key: string]: unknown}|unknown {
  if(paths instanceof TreeViewOperate){
    return paths.apply(source);
  }
  const targetMap = target as {[key: string]: unknown};
  const sourceMap = source as {[key: string]: unknown};
  for (const key of Object.keys(paths)) {
    if (!(key in sourceMap)) sourceMap[key] = 
    const sourceValue = sourceMap[key];
    const pathValue = (paths as Record<string, unknown>)[key];
    
    if (sourceValue === undefined) continue;
    
    const hasNestedPath = pathValue !== null && typeof pathValue === 'object';
    
    if (hasNestedPath) {
      targetMap[key] = {};
      targetMap[key] = ViewAssign(sourceValue, targetMap[key], (pathValue as Record<string, unknown> | OperateType[]));
    } else if (pathValue instanceof Array && pathValue.includes(OperateType.Request)) {
      targetMap[key] = sourceValue;
    }
  }
  return target;
}