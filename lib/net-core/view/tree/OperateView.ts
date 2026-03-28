import { NodeProperties } from "../../config";
import { MetaType } from "../../protocol";
import { TreeNode, parseTreeString } from "../../util/TreeNode";
import { View } from "../View";

export class TreeViewOperate{
  type: MetaType<unknown>;
  apply: Function;
  constructor(type: MetaType<unknown>, apply: Function){
    this.type = type;
    this.apply = apply;
  }
}
export class TreeOperateView implements View {
    view: string;
    tree: TreeNode;
    constructor(view: string){
        this.view = view;
        this.tree = parseTreeString(this.view)!
        
    }
    getTypes(config: NodeProperties): Record<string, MetaType<unknown>> {
        const types: Record<string, MetaType<unknown>> = {};
        for(const node of this.tree.children){
            if(node.value == 'actor'){
              types[node.value] = config.actor.type;
            }
            else if(node.value == 'parameters'){
                for(const param of node.children){
                    types[param.value] = config.method.parameters[param.value].type;
                }
            }
            else if(node.value == 'result'){
                types[node.value] = config.method.result.type;
            }
        }
        return types;
    }
    getNodes(config: NodeProperties): Record<string, TreeNode> {
        const nodes: Record<string, TreeNode> = {};
        for(const node of this.tree.children){
            if(node.value == 'actor'){
              nodes[node.value] = node;
            }
            else if(node.value == 'parameters'){
                for(const param of node.children){
                    nodes[param.value] = param;
                }
            }
            else if(node.value == 'result'){
                nodes[node.value] = node;
            }
        }
        return nodes;
    }
}
export function ViewAssync(source,target,paths){
  
}
export function TreeAssign(source: unknown, target: unknown, paths: TreeNode): unknown {
  // 如果paths没有子节点，返回source
  if (!paths?.children?.length) {
    return source;
  }
  
  // 如果source或target不是对象，返回target
  if (typeof source !== 'object' || source === null ||
      typeof target !== 'object' || target === null) {
    return target;
  }
  
  const sourceObj = source as Record<string, unknown>;
  const targetObj = target as Record<string, unknown>;
  
  // 遍历paths的所有子节点
  for (const child of paths.children) {
    const key = child.value;
    
    if (key in sourceObj) {
      const sourceValue = sourceObj[key];
      
      if (child.children?.length) {
        // 递归处理嵌套
        if (!targetObj[key] || typeof targetObj[key] !== 'object') {
          targetObj[key] = {};
        }
        ViewTreeAssign(sourceValue, targetObj[key], child);
      } else {
        // 直接赋值
        targetObj[key] = sourceValue;
      }
    }
  }
  
  return target;
}