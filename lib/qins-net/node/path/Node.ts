import type { ParameterProtocol, RequestProtocol, ResponseProtocol } from '../../protocol/Protocol';
import { Gateway } from '../Node';
import { ObjectFilter } from './Protocol';
import { Logger } from '../../util/Logger';
import { ProtocolBuilder } from '../../util/Protocol';
import { INode } from '../INode';
import { OperateType } from '../../config/Action';
import { NodeProperties } from '../../config/Node';
import deepmerge from 'deepmerge';

export class PathNode implements INode {
  config: NodeProperties;
  constructor(config: NodeProperties){
    this.config = config;
  }
  register() {
    //确定基本配置
    //合并类级配置
    this.config.net = deepmerge(this.config.net, this.config.actor.net || {});
    this.config.protocol = deepmerge(this.config.protocol, this.config.actor.protocol || {});
    //合并方法级配置
    this.config.net = deepmerge(this.config.net, this.config.method.net || {});
    this.config.protocol = deepmerge(this.config.protocol, this.config.method.protocol || {});
    //确定node
    const node = this.config.method.net?.node && this.config.method.net?.node 
    || this.config.actor.net?.node && this.config.actor.net?.node + '/' + this.config.method.name 
    || Gateway.config.net.node && Gateway.config.net.node + '/' + this.config.actor.name + '/' + this.config.method.name
    || this.config.net.netType && this.config.net.host && `${this.config.net.netType}://${this.config.net.host}/${this.config.actor.name}/${this.config.method.name}`;
    if(!node){
      throw new Error('Node path is not valid');
    }
    this.config.node = node;
    Gateway.registerNode(this);
    Logger.debug('Node register', this.config as unknown as Record<string, unknown>);
  }
  unregister(): void {
    Gateway.unregisterNode(this.config.node);
    Logger.debug('Node unregister', this.config as unknown as Record<string, unknown>);
  }
  async request(instance: object, ...args: unknown[]): Promise<unknown> {
    Logger.info('Node request starting', {
      node: this.config.node, 
      method: this.config.name,
      argCount: args.length 
    });
    
    let request = this.buildRequest(instance, args);
    Logger.debug('Request built', { 
      node: this.config.node, 
      hasActor: !!request.actor,
      paramCount: request.parameters?.length ?? 0 ,
      request
    });
    let response = await Gateway.request(request, this);
    if (response.exception) {
      Logger.error('Node request failed', { 
        node: this.config.node, 
        code: response.exception.code, 
        message: response.exception.message 
      });
      throw new Error(JSON.stringify(response));
    } else {
      Logger.info('Node request completed', { node: this.config.node });
    }
    if(!this.config.method.isStatic && this.config.method.response.actor){
      ObjectFilter(response.actor!.properties,instance, this.config.method.response.actor);
    }
    if(this.config.method.response.parameters){
      const targets = this.packageParams(args, false)
      for(const [name,value] of Object.entries(this.config.method.response.parameters)){
          const target = targets[name].properties;
          if(!target){
            continue;
          }
          ObjectFilter(request.parameters[name].properties, target, value as Record<string, unknown>|OperateType);
      }
    }
    return response.result;
  }
  
  async service(request: RequestProtocol): Promise<ResponseProtocol> {
    Logger.info('Node service starting', { 
      node: this.config.node, 
      method: this.config.name,
      hasActor: !!request.actor 
    });
    
    try {
      if (!this.config.method.handler) {
        Logger.error('Node service handler not found', { node: this.config.node });
        return ProtocolBuilder.buildException(request,{
          code: 404,
          message: 'Not found method',
        });
      }
      
      let instance = this.config.actor.constructor as object;
      if (!this.config.method.isStatic) {
        instance = this.config.actor.type.deserialize(request.actor.properties!) as object;
        Logger.debug('Instance created from request', { node: this.config.node });
      }
      
      const args = this.extractParams(request);
      Logger.debug('Parameters extracted', { 
        node: this.config.node, 
        argCount: args.length 
      });
      
      const result = await this.config.method.handler(instance, ...args);
      let response = this.buildResponse(instance, args, result);
      
      Logger.info('Node service completed', { 
        node: this.config.node,
        hasResult: result !== undefined 
      });
      
      return response;
    } catch (error) {
      Logger.error('Node service error', { 
        node: this.config.node, 
        error: error instanceof Error ? error.message + error.stack : String(error) 
      });
      return ProtocolBuilder.buildException(request,{
        code: 500,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  buildRequest(instance: object, args: unknown[]): RequestProtocol {
    const params = this.packageParams(args);
    const request = {
      node: this.config.node,
      actor: {
        type: this.config.actor.name,
        ...(!this.config.method.isStatic && {
          properties: JSON.parse(this.config.actor.type.serialize(instance))
        })
      },
      method: this.config.name,
      parameters: params,
    };
    return ProtocolBuilder.buildPathRequest(request, this.config.method.request);
  }

  buildResponse(instance: object, args: unknown[], result: unknown): ResponseProtocol {
    const params = this.packageParams(args);
    const response = {
      node: this.config.node,
      actor: {
        type: this.config.actor.name,
        ...(!this.config.method.isStatic && {
          properties: JSON.parse(this.config.actor.type.serialize(instance))
        })
      },
      parameters: params,
      result: {
          type: this.config.method.result.type.name,
          ...(result !== undefined && {
            properties: JSON.parse(this.config.method.result.serialize(result))
          })
        },
    };
    return ProtocolBuilder.buildPathResponse(response, this.config.method.response);
  }

  private extractParams(request: RequestProtocol): unknown[] {
    const params: unknown[] = [];
    const sortParams = Object.values(this.config.method.parameters).sort((a, b) => a.index - b.index);
    sortParams.forEach((param) => {
      const requestParam = request.parameters[param.name]!
      if(!requestParam.properties){
        params.push(undefined);
        return;
      }
      else {
        params.push(param.type.deserialize(requestParam.properties))
      }
    });
    return params;
  }

  private packageParams(args: unknown[], record: boolean = true): {[key: string]: ParameterProtocol} {
    const params: {[key: string]: ParameterProtocol} = {};
    args.forEach((arg, index) => {
      const param = Object.values(this.config.method.parameters).find((item) => item.index === index)!
      params[param.name] = {
        name: param.name,
        type: param.type.name,
        ...(!arg && {
          properties: record ? JSON.parse(param.type.serialize(arg)) : arg,
        })
      };
    });
    return params;
  }
}
