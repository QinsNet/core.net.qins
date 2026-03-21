import type { ParameterProtocol, RequestProtocol, ResponseProtocol } from '../../protocol/Protocol';
import { Gateway } from '../Gateway';
import { ObjectFilter } from './Protocol';
import { Logger } from '../../util/Logger';
import { ProtocolBuilder } from '../../util/Protocol';
import { IEndpoint } from '../IEndpoint';
import { OperateType } from '../../config/Method';
import { EndpointProperties } from '../../config/Endpoint';
import deepmerge from 'deepmerge';

export class PathEndpoint implements IEndpoint {
  config: EndpointProperties;
  constructor(config: EndpointProperties){
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
    //确定endpoint
    const endpoint = this.config.method.net?.endpoint && this.config.method.net?.endpoint 
    || this.config.actor.net?.endpoint && this.config.actor.net?.endpoint + '/' + this.config.method.name 
    || Gateway.config.net.endpoint && Gateway.config.net.endpoint + '/' + this.config.actor.name + '/' + this.config.method.name
    || this.config.net.netType && this.config.net.host && `${this.config.net.netType}://${this.config.net.host}/${this.config.actor.name}/${this.config.method.name}`;
    if(!endpoint){
      throw new Error('Endpoint path is not valid');
    }
    this.config.endpoint = endpoint;
    Gateway.registerEndpoint(this);
    Logger.debug('Endpoint register', this.config as unknown as Record<string, unknown>);
  }
  unregister(): void {
    Gateway.unregisterEndpoint(this.config.endpoint);
    Logger.debug('Endpoint unregister', this.config as unknown as Record<string, unknown>);
  }
  async request(instance: object, ...args: unknown[]): Promise<unknown> {
    Logger.info('Endpoint request starting', {
      endpoint: this.config.endpoint, 
      method: this.config.name,
      argCount: args.length 
    });
    
    let request = this.buildRequest(instance, args);
    Logger.debug('Request built', { 
      endpoint: this.config.endpoint, 
      hasActor: !!request.actor,
      paramCount: request.parameters?.length ?? 0 ,
      request
    });
    let response = await Gateway.request(request, this);
    if (response.exception) {
      Logger.error('Endpoint request failed', { 
        endpoint: this.config.endpoint, 
        code: response.exception.code, 
        message: response.exception.message 
      });
      throw new Error(JSON.stringify(response));
    } else {
      Logger.info('Endpoint request completed', { endpoint: this.config.endpoint });
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
    Logger.info('Endpoint service starting', { 
      endpoint: this.config.endpoint, 
      method: this.config.name,
      hasActor: !!request.actor 
    });
    
    try {
      if (!this.config.method.handler) {
        Logger.error('Endpoint service handler not found', { endpoint: this.config.endpoint });
        return ProtocolBuilder.buildException(request,{
          code: 404,
          message: 'Not found method',
        });
      }
      
      let instance = this.config.actor.constructor as object;
      if (!this.config.method.isStatic) {
        instance = this.config.actor.type.deserialize(request.actor.properties!) as object;
        Logger.debug('Instance created from request', { endpoint: this.config.endpoint });
      }
      
      const args = this.extractParams(request);
      Logger.debug('Parameters extracted', { 
        endpoint: this.config.endpoint, 
        argCount: args.length 
      });
      
      const result = await this.config.method.handler(instance, ...args);
      let response = this.buildResponse(instance, args, result);
      
      Logger.info('Endpoint service completed', { 
        endpoint: this.config.endpoint,
        hasResult: result !== undefined 
      });
      
      return response;
    } catch (error) {
      Logger.error('Endpoint service error', { 
        endpoint: this.config.endpoint, 
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
      endpoint: this.config.endpoint,
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
      endpoint: this.config.endpoint,
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
