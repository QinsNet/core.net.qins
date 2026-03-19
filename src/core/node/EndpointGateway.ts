import 'reflect-metadata';
import type { INet } from '../net/INet';
import { HttpNet } from '../net/HttpNet';
import { WsNet } from '../net/WsNet';
import type { RequestProtocol, ResponseProtocol, TypeProtocol } from '../protocol/Protocol';
import { Endpoint } from './Endpoint';
import { PathResponseProtocol } from '../protocol/PathProtocol';
import { Logger } from '../util/Logger';
import { ProtocolBuilder } from '../util/Protocol';

export type NetEventType = 'register' | 'unregister' | 'empty';
export type NetEventHandler = (net: INet, origin: string) => void | Promise<void>;

export class EndpointGateway {
  private static _running: boolean = false;
  private static _netPool: Map<string, INet> = new Map();
  private static _endpointRegistry: Map<string, Endpoint> = new Map();
  private static _eventHandlers: Map<NetEventType, Set<NetEventHandler>> = new Map();
  private static _resolveEmpty: (() => void) | null = null;
  public static types: Map<Function, TypeProtocol<unknown>> = new Map();

  static get running(): boolean {
    return this._running;
  }

  static on(event: NetEventType, handler: NetEventHandler): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(handler);
    Logger.debug('EventHandler registered', { event });
  }

  static off(event: NetEventType, handler: NetEventHandler): void {
    this._eventHandlers.get(event)?.delete(handler);
    Logger.debug('EventHandler unregistered', { event });
  }

  private static async emit(event: NetEventType, net: INet, origin: string): Promise<void> {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        await handler(net, origin);
      }
    }
  }

  private static getOriginFromEndpoint(endpoint: Endpoint): string {
    return `${endpoint.config.type}://${endpoint.config.host}`;
  }

  private static countEndpointsByOrigin(origin: string): number {
    let count = 0;
    for (const endpoint of this._endpointRegistry.values()) {
      if (this.getOriginFromEndpoint(endpoint) === origin) {
        count++;
      }
    }
    return count;
  }

  private static async createNetInstance(origin: string): Promise<INet> {
    Logger.info('Creating net instance', { origin });
    
    const url = new URL(origin);
    const type = url.protocol.replace(':', '');
    const net: INet = type === 'ws' ? new WsNet() : new HttpNet();
    
    await net.start?.(origin);
    this._netPool.set(origin, net);
    await this.emit('register', net, origin);
    
    Logger.info('Net instance created', { origin, type, netPoolSize: this._netPool.size });
    return net;
  }

  private static async destroyNetInstance(origin: string): Promise<void> {
    Logger.info('Destroying net instance', { origin });
    
    const net = this._netPool.get(origin);
    if (!net) return;

    await net.stop?.();
    this._netPool.delete(origin);
    await this.emit('unregister', net, origin);

    Logger.info('Net instance destroyed', { origin, netPoolSize: this._netPool.size });

    if (this._netPool.size === 0 && this._resolveEmpty) {
      Logger.info('All net instances stopped, resolving empty promise');
      this._resolveEmpty();
      this._resolveEmpty = null;
    }
  }

  static async start(): Promise<void> {
    if (this._running) {
      Logger.warn('Gateway already running');
      return;
    }
    
    Logger.info('Starting gateway');
    this._running = true;

    const origins = new Set<string>();
    for (const endpoint of this._endpointRegistry.values()) {
      origins.add(this.getOriginFromEndpoint(endpoint));
    }

    Logger.info('Found endpoints to start', { originCount: origins.size, origins: Array.from(origins) });

    for (const origin of origins) {
      if (!this._netPool.has(origin)) {
        await this.createNetInstance(origin);
      }
    }

    return new Promise((resolve) => {
      if (this._netPool.size === 0) {
        Logger.info('No net instances to start, resolving immediately');
        resolve();
        return;
      }
      this._resolveEmpty = resolve;
      Logger.info('Gateway started, waiting for net instances to stop');
    });
  }

  static async stop(): Promise<void> {
    if (!this._running) {
      Logger.warn('Gateway not running');
      return;
    }
    
    Logger.info('Stopping gateway');
    this._running = false;

    for (const [origin] of this._netPool) {
      await this.destroyNetInstance(origin);
    }

    await this.emit('empty', null as unknown as INet, '');
    Logger.info('Gateway stopped');
  }

  static registerEndpoint(endpoint: Endpoint): void {
    const endpointPath = endpoint.config.endpoint;
    Logger.info('Registering endpoint', { endpoint: endpointPath });
    
    this._endpointRegistry.set(endpointPath, endpoint);

    if (this._running) {
      const origin = this.getOriginFromEndpoint(endpoint);
      if (!this._netPool.has(origin)) {
        Logger.info('Gateway running, creating net instance for new endpoint', { origin });
        this.createNetInstance(origin).catch((err) => {
          Logger.error('Failed to create net instance', { origin, error: err instanceof Error ? err.message : String(err) });
        });
      }
    }
    
    Logger.debug('Endpoint registered', { endpoint: endpointPath, totalEndpoints: this._endpointRegistry.size });
  }

  static unregisterEndpoint(endpointPath: string): void {
    Logger.info('Unregistering endpoint', { endpoint: endpointPath });
    
    const endpoint = this._endpointRegistry.get(endpointPath);
    if (!endpoint) {
      Logger.warn('Endpoint not found for unregister', { endpoint: endpointPath });
      return;
    }

    const origin = this.getOriginFromEndpoint(endpoint);
    this._endpointRegistry.delete(endpointPath);

    if (this._running && this._netPool.has(origin)) {
      const count = this.countEndpointsByOrigin(origin);
      Logger.debug('Checking if net instance should be destroyed', { origin, remainingEndpoints: count });
      
      if (count === 0) {
        Logger.info('No more endpoints for origin, destroying net instance', { origin });
        this.destroyNetInstance(origin).catch((err) => {
          Logger.error('Failed to destroy net instance', { origin, error: err instanceof Error ? err.message : String(err) });
        });
      }
    }
    
    Logger.debug('Endpoint unregistered', { endpoint: endpointPath, totalEndpoints: this._endpointRegistry.size });
  }

  static matchEndpoint(endpoint: string): Endpoint | undefined {
    return this._endpointRegistry.get(endpoint);
  }

  static getOrCreateNetInstance(host: string, type: string): INet {
    const origin = `${type}://${host}`;
    if (!EndpointGateway._netPool.has(origin)) {
      Logger.info('Creating net instance on demand', { origin, type });
      const net: INet = type === 'ws' ? new WsNet() : new HttpNet();
      net.start?.(origin);
      EndpointGateway._netPool.set(origin, net);
    }
    return EndpointGateway._netPool.get(origin)!;
  }

  static async request(request: RequestProtocol, endpoint: Endpoint): Promise<ResponseProtocol> {
    Logger.info('Sending request', { 
      endpoint: request.endpoint, 
      method: request.method,
      hasActor: !!request.actor,
      paramCount: request.parameters?.length ?? 0
    });
    
    const net = this.getOrCreateNetInstance(endpoint.config.host, endpoint.config.type);
    const response = await net.request(request, endpoint.config.properties, endpoint.config.timeout);
    
    if (response.exception) {
      Logger.error('Request failed', { 
        endpoint: request.endpoint, 
        code: response.exception.code, 
        message: response.exception.message 
      });
    } else {
      Logger.info('Request succeeded', { endpoint: request.endpoint });
    }
    
    return response;
  }

  static async service(request: RequestProtocol): Promise<ResponseProtocol> {
    const endpoint = request.endpoint;
    Logger.info('Processing service request', { 
      endpoint, 
      method: request.method,
      hasActor: !!request.actor,
      paramCount: request.parameters?.length ?? 0,
      request
    });
    
    const nodeEndpoint = EndpointGateway.matchEndpoint(endpoint);

    if (!nodeEndpoint) {
      Logger.error('Endpoint not found', { endpoint });
      return ProtocolBuilder.buildException(request, {
        code: 404,
        message: `Endpoint not found: ${endpoint}`,
      });
    }
    
    const response = await nodeEndpoint.service(request);
    
    if (response.exception) {
      Logger.error('Service request failed', { 
        endpoint, 
        code: response.exception.code, 
        message: response.exception.message 
      });
    } else {
      Logger.info('Service request completed', { endpoint });
    }
    
    return response;
  }

  static get netPoolSize(): number {
    return this._netPool.size;
  }

  static get endpointCount(): number {
    return this._endpointRegistry.size;
  }

  static getEndpointRegistry(): IterableIterator<[string, Endpoint]> {
    return this._endpointRegistry.entries();
  }
}
