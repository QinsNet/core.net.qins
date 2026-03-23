import type { ParameterProtocol, RequestProtocol, ResponseProtocol } from '../../protocol/Protocol';
import { Gateway } from '../../gateway/IGateway';
import { ObjectFilter } from './Protocol';
import log from 'loglevel';
import { ProtocolBuilder } from '../../util/Protocol';
import { INode } from '../INode';
import { OperateType } from '../../config/Action';
import { NodeProperties } from '../../config/Node';
import { NetType } from '../..';

export class PathNode implements INode {
  config: NodeProperties;
  logger: log.Logger;
  constructor(config: NodeProperties) {
    this.config = config;
    const endpoint = this.config.method.net?.endpoint && this.config.method.net?.endpoint
    || this.config.actor.net?.endpoint && this.config.actor.net?.endpoint + '/' + this.config.method.name
    || Gateway.config.net.endpoint && Gateway.config.net.endpoint + '/' + this.config.actor.name + '/' + this.config.method.name
    || this.config.net.type && this.config.net.host && `${this.config.net.type}://${this.config.net.host}/${this.config.actor.name}/${this.config.method.name}`;
    this.config.net.type = endpoint.split('://')[0] as NetType;
    this.config.net.host = endpoint.split('://')[1].split('/')[0];
    this.config.name = this.config.actor.name + '/' + this.config.method.name;
    if(!endpoint){
      throw new Error('Node path is not valid');
    }
    this.config.net.endpoint = endpoint;
    this.logger = log.getLogger(this.config.name);
    this.logger.setLevel((this.config.log.level as log.LogLevelNames) ?? 'debug');
    this.logger.debug('Node created', { endpoint });
  }
  async request(instance: object, ...args: unknown[]): Promise<unknown> {
    this.logger.debug('Node request building', { endpoint: this.config.net.endpoint });
    let request = this.buildRequest(instance, args);
    let response = await Gateway.request(request, this);
    if (response.exception) {
      this.logger.debug('Node request failed', { endpoint: this.config.net.endpoint });
      throw new Error(JSON.stringify(response));
    }
    this.logger.debug('Node request completed', { endpoint: this.config.net.endpoint });
    if(!this.config.method.isStatic && this.config.method.pact.response.actor){
      if(this.config.method.pact.response.actor){
        for(const [name,type] of Object.entries(this.config.method.pact.response.actor)){
          if(type.includes(OperateType.Local)){
            const value = this.config.actor.attributes[name].type.deserialize(JSON.stringify(response.actor.properties![name]));
            (instance as any)[name] = ObjectFilter(value,(instance as any)[name], type);
          }
        }
      }
    }
    if(this.config.method.pact.response.parameters){
      const targets = this.packageParams(args, false)
      for(const [name,value] of Object.entries(this.config.method.pact.response.parameters)){
          const target = targets[name].properties;
          if(!target){
            continue;
          }
          ObjectFilter(request.parameters[name].properties, target, (value as Record<string, unknown> | OperateType[]));
      }
    }
    return response.result;
  }

  async service(request: RequestProtocol): Promise<ResponseProtocol> {
    this.logger.debug('Node service starting', {
      endpoint: request.node,
      hasActor: !!request.actor
    });

    try {
      if (!this.config.method.handler) {
        this.logger.debug('Node service handler not found', { endpoint: request.node });
        return ProtocolBuilder.buildException(request,{
          code: 404,
          message: 'Not found method',
        });
      }

      let instance = this.config.actor.constructor as object;
      if (!this.config.method.isStatic) {
        instance = this.config.actor.type.deserialize(request.actor.properties!) as object;
        this.logger.debug('Node service instance created', { endpoint: request.node });
      }

      const args = this.extractParams(request);
      this.logger.debug('Node service parameters extracted', {
        endpoint: request.node,
        argCount: args.length
      });

      const result = await this.config.method.handler(instance, ...args);
      let response = this.buildResponse(instance, args, result);

      this.logger.debug('Node service completed', {
        endpoint: request.node,
        hasResult: result !== undefined
      });

      return response;
    } catch (error) {
      this.logger.debug('Node service error', {
        endpoint: request.node,
        error: error instanceof Error ? error.message : String(error)
      });
      return ProtocolBuilder.buildException(request,{
        code: 500,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  buildRequest(instance: object, args: unknown[]): RequestProtocol {
    const params = this.packageParams(args);
    let attributes = undefined;
    if(this.config.method.pact.request.actor){
      attributes = {} as {[key: string]: string};
      for(const [name,type] of Object.entries(this.config.method.pact.request.actor)){
        if(type.includes(OperateType.Local)){
          if(!this.config.actor.attributes[name]){
            throw new Error('Attribute not found');
          }
          attributes[name] = JSON.parse(this.config.actor.attributes[name].type.serialize((instance as any)[name]));
        }
      }
    }
    const request = {
      node: this.config.net.endpoint,
      actor: {
        type: this.config.actor.name,
        ...(!this.config.method.isStatic && attributes && {
          properties: attributes
        })
      },
      method: this.config.name,
      parameters: params,
    };
    return ProtocolBuilder.buildPathRequest(request, this.config.method.pact.request);
  }

  buildResponse(instance: object, args: unknown[], result: unknown): ResponseProtocol {
    const params = this.packageParams(args);
    let attributes = undefined;
    if(this.config.method.pact.response.actor){
      attributes = {} as {[key: string]: string};
      for(const [name,type] of Object.entries(this.config.method.pact.response.actor)){
        if(type.includes(OperateType.Local)){
          attributes[name] = JSON.parse(this.config.actor.attributes[name].type.serialize((instance as any)[name]));
        }
      }
    }
    const response = {
      node: this.config.net.endpoint,
      actor: {
        type: this.config.actor.name,
        ...(!this.config.method.isStatic && attributes && {
          properties: attributes
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
    return ProtocolBuilder.buildPathResponse(response, this.config.method.pact.response);
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
      };
      if(arg !== undefined){
        params[param.name].properties = record ? JSON.parse(param.type.serialize(arg)) : arg;
      }
    });
    return params;
  }
}