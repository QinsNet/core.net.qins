import type { ParameterProtocol, RequestProtocol, ResponseProtocol } from '../../protocol/Protocol';
import { EndpointGateway } from '../EndpointGateway';
import type { EndpointConfig, ActorConfig, MethodConfig, NetConfig } from '../../config';
import { mergeConfigs } from '../../config';
import { ObjectFilter } from './PathProtocol';
import { EndpointGlobal } from '../EndpointGlobal';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { Logger } from '../../util/Logger';
import { ProtocolBuilder } from '../../util/Protocol';
import { OperateType } from '../../decorators/Method';
import { IEndpoint } from '../IEndpoint';

export class PathEndpoint implements IEndpoint {
  config: EndpointConfig = {} as EndpointConfig;

  register() {
    this.config = mergeConfigs(EndpointGlobal.config, this.config.classConfig, this.config.methodConfig);
    EndpointGateway.registerEndpoint(this);
    Logger.debug('Endpoint register', this.config as unknown as Record<string, unknown>);
  }
  unregister(): void {
    EndpointGateway.unregisterEndpoint(this.config.endpoint);
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
    let response = await EndpointGateway.request(request, this);
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
    if(!this.config.isStatic && this.config.response.actor){
      ObjectFilter(response.actor!.properties,instance, this.config.response.actor);
    }
    if(this.config.response.parameters){
      const targets = this.packageParams(args, false)
      for(const [name,value] of Object.entries(this.config.response.parameters)){
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
      if (!this.config.methodConfig.handler) {
        Logger.error('Endpoint service handler not found', { endpoint: this.config.endpoint });
        return ProtocolBuilder.buildException(request,{
          code: 404,
          message: 'Not found method',
        });
      }
      
      let instance = this.config.classConfig.constructor as object;
      if (!this.config.isStatic) {
        instance = this.config.actor.deserialize(request.actor.properties!) as object;
        Logger.debug('Instance created from request', { endpoint: this.config.endpoint });
      }
      
      const args = this.extractParams(request);
      Logger.debug('Parameters extracted', { 
        endpoint: this.config.endpoint, 
        argCount: args.length 
      });
      
      const result = await this.config.methodConfig.handler(instance, ...args);
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
        ...(!this.config.isStatic && {
          properties: JSON.parse(this.config.actor.serialize(instance))
        })
      },
      method: this.config.name,
      parameters: params,
    };
    return ProtocolBuilder.buildPathRequest(request, this.config.request);
  }

  buildResponse(instance: object, args: unknown[], result: unknown): ResponseProtocol {
    const params = this.packageParams(args);
    const response = {
      endpoint: this.config.endpoint,
      actor: {
        type: this.config.actor.name,
        ...(!this.config.isStatic && {
          properties: JSON.parse(this.config.actor.serialize(instance))
        })
      },
      parameters: params,
      result: {
          type: this.config.result.name,
          ...(result !== undefined && {
            properties: JSON.parse(this.config.result.serialize(result))
          })
        },
    };
    return ProtocolBuilder.buildPathResponse(response, this.config.response);
  }

  private extractParams(request: RequestProtocol): unknown[] {
    const params: unknown[] = [];
    this.config.params?.forEach((param,index) => {
      const requestParam = request.parameters[index]
      if(!requestParam.properties){
        params.push(undefined);
        return;
      }
      else {
        params.push(plainToInstance(
          param.type.type as ClassConstructor<unknown>,
          requestParam.properties,
        ))
      }
    });
    return params;
  }

  private packageParams(args: unknown[], record: boolean = true): {[key: string]: ParameterProtocol} {
    const params: {[key: string]: ParameterProtocol} = {};
    args.forEach((arg, index) => {
      if(!arg)return
      const param = this.config.params[index]!
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

export type { NetConfig, ActorConfig as NodeClassConfig, MethodConfig as NodeMethodConfig, EndpointConfig as NodeEndpointConfig };
