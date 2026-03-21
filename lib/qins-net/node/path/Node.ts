import type { ParameterProtocol, RequestProtocol, ResponseProtocol } from '../../protocol/Protocol';
import { Gateway } from '../Gateway';
import { ObjectFilter } from './Protocol';
import { Logger } from '../../util/Logger';
import { ProtocolBuilder } from '../../util/Protocol';
import { INode } from '../INode';
import { OperateType } from '../../config/Action';
import { NodeProperties } from '../../config/Node';
import { NetType } from '../../net';

export class PathNode implements INode {
  config: NodeProperties;
  constructor(config: NodeProperties) {
    this.config = config;
    //确定node
    const endpoint = this.config.method.net?.endpoint && this.config.method.net?.endpoint 
    || this.config.actor.net?.endpoint && this.config.actor.net?.endpoint + '/' + this.config.method.name 
    || Gateway.config.net.endpoint && Gateway.config.net.endpoint + '/' + this.config.actor.name + '/' + this.config.method.name
    || this.config.net.type && this.config.net.host && `${this.config.net.type}://${this.config.net.host}/${this.config.actor.name}/${this.config.method.name}`;
    //根据最后的Endpoint获取Host和Type
    this.config.net.type = endpoint.split('://')[0] as NetType;
    this.config.net.host = endpoint.split('://')[1].split('/')[0];
    if(!endpoint){
      throw new Error('Node path is not valid');
    }
    this.config.net.endpoint = endpoint;
    Logger.debug('Node register', this.config as unknown as Record<string, unknown>);
  }
  async request(instance: object, ...args: unknown[]): Promise<unknown> {
    let request = this.buildRequest(instance, args);
    let response = await Gateway.request(request, this);
    if (response.exception) {
      throw new Error(JSON.stringify(response));
    } else {
      Logger.info('Node request completed', { node: this.config.net.endpoint });
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
      node: this.config.net.endpoint, 
      method: this.config.name,
      hasActor: !!request.actor 
    });
    
    try {
      if (!this.config.method.handler) {
        Logger.error('Node service handler not found', { node: this.config.net.endpoint });
        return ProtocolBuilder.buildException(request,{
          code: 404,
          message: 'Not found method',
        });
      }
      
      let instance = this.config.actor.constructor as object;
      if (!this.config.method.isStatic) {
        instance = this.config.actor.type.deserialize(request.actor.properties!) as object;
        Logger.debug('Instance created from request', { node: this.config.net.endpoint });
      }
      
      const args = this.extractParams(request);
      Logger.debug('Parameters extracted', { 
        node: this.config.net.endpoint, 
        argCount: args.length 
      });
      
      const result = await this.config.method.handler(instance, ...args);
      let response = this.buildResponse(instance, args, result);
      
      Logger.info('Node service completed', { 
        node: this.config.net.endpoint,
        hasResult: result !== undefined 
      });
      
      return response;
    } catch (error) {
      Logger.error('Node service error', { 
        node: this.config.net.endpoint, 
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
      node: this.config.net.endpoint, 
      actor: {
        type: this.config.actor.name,
        ...(!this.config.method.isStatic && {
          properties: JSON.parse(this.config.actor.type.serialize(instance))
        })
      },
      method: this.config.name,
      parameters: params,
    };
    return ProtocolBuilder.buildPathRequest(request, this.config.method.request, this.config.method.parameters);
  }

  buildResponse(instance: object, args: unknown[], result: unknown): ResponseProtocol {
    const params = this.packageParams(args);
    const response = {
      node: this.config.net.endpoint, 
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
            properties: JSON.parse(this.config.method.result.type.serialize(result))
          })
        },
    };
    return ProtocolBuilder.buildPathResponse(response, this.config.method.response, this.config.method.parameters);
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
        index: param.index,
        ...(!arg && {
          properties: record ? JSON.parse(param.type.serialize(arg)) : arg,
        })
      };
    });
    return params;
  }
}
