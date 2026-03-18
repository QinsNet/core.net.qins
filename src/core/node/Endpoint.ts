import type { RequestProtocol, ResponseProtocol } from '../protocol/Protocol';
import { EndpointGateway } from './EndpointGateway';
import type { NodeEndpointConfig, NodeClassConfig, NodeMethodConfig, NetConfig } from '../config';
import { mergeConfigs } from '../config';
import { PathRequestProtocol, PathResponseProtocol } from '../protocol/PathProtocol';
import { EndpointGlobal } from './EndpointGlobal';

function buildEndpoint(config: NodeEndpointConfig, defaultClassName: string, defaultMethodName: string): string {
  if (config.endpoint) {
    return config.endpoint;
  }
  const type = config.type ?? 'http';
  const host = config.host ?? '0.0.0.0:8080';
  const className = config.classConfig?.name ?? defaultClassName;
  const methodName = config.methodConfig?.name ?? defaultMethodName;
  return `${type}://${host}/${className}/${methodName}`;
}

export class Endpoint {
  config: NodeEndpointConfig;
  classConstructor: Function;
  handler?: (instance: object, ...args: unknown[]) => Promise<unknown>;

  constructor(
    config: NodeEndpointConfig,
    classConstructor: Function,
    handler?: (instance: object, ...args: unknown[]) => Promise<unknown>
  ) {
    this.config = config;
    this.classConstructor = classConstructor;
    this.handler = handler;
  }

  get endpoint(): string {
    return buildEndpoint(this.config, this.classConstructor.name, this.config.methodConfig?.name ?? 'default');
  }

  async request(instance: object, ...args: unknown[]): Promise<ResponseProtocol> {
    let request = this.buildRequest(instance, args);
    request = PathRequestProtocol.from(request,this.config.request);
    let response = await EndpointGateway.request(request, this);
    response = PathResponseProtocol.from(response,request,this.config.response);
    return response;
  }

  async service(request: RequestProtocol): Promise<ResponseProtocol> {
    try {
      if (!this.handler) {
        return new PathResponseProtocol(
          this.endpoint,
          {
            code: 404,
            message: 'Not found method',
          },
        );
      }

      const instance = this.createInstance();
      const args = this.extractParams(request);
      const result = await this.handler(instance, ...args);
      let response = this.buildResponse(instance, request.parameters ?? [], result);
      response = PathResponseProtocol.from(response,request,this.config.response);
      return response;
    } catch (error) {
      return new PathResponseProtocol(
        this.endpoint,
        {
          code: 500,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      );
    }
  }
  buildRequest(instance: object, args: unknown[]): RequestProtocol {
    const params = this.packageParams(args);
    return {
      endpoint: this.endpoint,
      actor: instance as Record<string, unknown>,
      method: this.config.methodConfig?.name ?? 'default',
      parameters: params,
    };
  }
  buildResponse(instance: object, params: { name: string; value: unknown; }[], result: unknown): ResponseProtocol {
    return {
      endpoint: this.endpoint,
      result: result,
      actor: instance as Record<string, unknown>,
      parameters: params,
    };
  }
  createInstance(): object {
    const instance = new (this.classConstructor as new () => object)();
    (instance as Record<string, unknown>).__endpoint__ = this;
    return instance;
  }

  private extractParams(request: RequestProtocol): unknown[] {
    const params: unknown[] = [];
    request.parameters?.forEach((param, index) => {
      params[index] = param.value;
    });
    return params;
  }
  private packageParams(args: unknown[]): { name: string; value: unknown;}[] {
    const params: { name: string; value: unknown;}[] = [];
    args.forEach((arg, index) => {
      params.push({
        name: this.config.methodConfig?.paramsName?.[index]!,
        value: arg,
      }); 
    });
    return params;
  }
}

export function createEndpoint(
  classConfig: NodeClassConfig,
  methodConfig: NodeMethodConfig,
  classConstructor: Function,
  handler?: (instance: object, ...args: unknown[]) => Promise<unknown>
): Endpoint {
  const mergedConfig = mergeConfigs(EndpointGlobal.config, classConfig, methodConfig);
  return new Endpoint(mergedConfig, classConstructor, handler);
}

export type { NetConfig, NodeClassConfig, NodeMethodConfig, NodeEndpointConfig };
