import 'reflect-metadata';
import type { INet } from '../net/INet';
import { HttpNet } from '../net/HttpNet';
import { WsNet } from '../net/WsNet';
import type { RequestProtocol, ResponseProtocol } from '../protocol/Protocol';
import { Endpoint } from './Endpoint';

export class EndpointGateway {
  private static _netPool: Map<string, INet> = new Map();
  private static _endpointRegistry: Map<string, Endpoint> = new Map();

  static getOrCreateNetInstance(host: string,type: string): INet {
    const origin = `${type}://${host}`;
    if (!EndpointGateway._netPool.has(origin)) {
      const net: INet = type === 'ws' ? new WsNet() : new HttpNet();
      net.start?.(origin);
      EndpointGateway._netPool.set(origin, net);
    }
    return EndpointGateway._netPool.get(origin)!;
  }

  static registerEndpoint(endpoint: Endpoint): void {
    EndpointGateway._endpointRegistry.set(endpoint.endpoint, endpoint);
  }

  static matchEndpoint(endpoint: string): Endpoint | undefined {
    return EndpointGateway._endpointRegistry.get(endpoint);
  }

  static async request(request: RequestProtocol, endpoint: Endpoint): Promise<ResponseProtocol> {
    const net = this.getOrCreateNetInstance(endpoint.config.host,endpoint.config.type);
    return net.request(request, endpoint.config.properties, endpoint.config.timeout);
  }

  static async service(request: RequestProtocol): Promise<ResponseProtocol> {
    const endpoint = request.endpoint;
    const nodeEndpoint = EndpointGateway.matchEndpoint(endpoint);

    if (!nodeEndpoint) {
      return {
        version: '1',
        endpoint: endpoint,
        result: null,
        actor: {},
        parameters: [],
        exception: {
          code: 404,
          message: `Endpoint not found: ${endpoint}`,
        },
      };
    }
    return nodeEndpoint.service(request);
  }

  static async stop(): Promise<void> {
    for (const net of EndpointGateway._netPool.values()) {
      await net.stop?.();
    }
    EndpointGateway._netPool.clear();
    EndpointGateway._endpointRegistry.clear();
  }
}
