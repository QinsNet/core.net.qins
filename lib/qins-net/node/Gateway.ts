import 'reflect-metadata';
import type { INet } from '../net/INet';
import type { RequestProtocol, ResponseProtocol, TypeProtocol } from '../protocol/Protocol';
import type { INode } from './INode';
import { Logger } from '../util/Logger';
import { ProtocolBuilder } from '../util/Protocol';
import { newNetInstance } from '../util/Netutil';
import { GatewayConfig } from '../config/Gateway';

export type NetEventType = 'register' | 'unregister' | 'empty';
export type NetEventHandler = (net: INet, origin: string) => void | Promise<void>;

export class Gateway {
  private static _running: boolean = false;
  private static _netPool: Map<string, INet> = new Map();
  private static _nodeRegistry: Map<string, INode> = new Map();
  private static _eventHandlers: Map<NetEventType, Set<NetEventHandler>> = new Map();
  private static _resolveEmpty: (() => void) | null = null;
  public static config: GatewayConfig = new GatewayConfig();
  public static types: Map<string, TypeProtocol<unknown>> = new Map();

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

  private static getOriginFromNode(node: INode): string {
    return `${node.config.net.type}://${node.config.net.host}`;
  }

  private static countNodesByOrigin(origin: string): number {
    let count = 0;
    for (const node of this._nodeRegistry.values()) {
      if (this.getOriginFromNode(node) === origin) {
        count++;
      }
    }
    return count;
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

    for (const node of this._nodeRegistry.values()) {
      console.log("NodeGateway start", node.config.net.endpoint);
      await Gateway.getOrCreateNetInstance(node);
    }
    return new Promise((resolve) => {
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

  static registerNode(node: INode): void {
    //根据情况开始确定Node

    const nodePath = node.config.net.endpoint;
    const origin = this.getOriginFromNode(node);
    Logger.info('Registering node', { node: nodePath });

    this._nodeRegistry.set(nodePath, node);

    if (this._running) {
      Logger.info('Gateway running, creating net instance for new node', { origin });
      this.getOrCreateNetInstance(node)
        .then((net) => {
          net.addCors(node.config.net.cors);
          this.emit('register', net, origin);
        })
        .catch((err) => {
          Logger.error('Failed to create net instance', { origin, error: err instanceof Error ? err.message : String(err) });
        });
    }

    Logger.debug('Node registered', { node: nodePath, totalNodes: this._nodeRegistry.size });
  }

  static unregisterNode(nodePath: string): void {
    Logger.info('Unregistering node', { node: nodePath });

    const node = this._nodeRegistry.get(nodePath);
    if (!node) {
      Logger.warn('Node not found for unregister', { node: nodePath });
      return;
    }

    const origin = this.getOriginFromNode(node);
    this._nodeRegistry.delete(nodePath);

    if (this._running && this._netPool.has(origin)) {
      const count = this.countNodesByOrigin(origin);
      Logger.debug('Checking if net instance should be destroyed', { origin, remainingNodes: count });

      if (count === 0) {
        Logger.info('No more nodes for origin, destroying net instance', { origin });
        this.destroyNetInstance(origin).catch((err) => {
          Logger.error('Failed to destroy net instance', { origin, error: err instanceof Error ? err.message : String(err) });
        });
      }
    }

    Logger.debug('Node unregistered', { node: nodePath, totalNodes: this._nodeRegistry.size });
  }

  static matchNode(node: string): INode | undefined {
    return this._nodeRegistry.get(node);
  }

  static async getOrCreateNetInstance(node: INode): Promise<INet> {
    const origin = Gateway.getOriginFromNode(node);
    if (Gateway._netPool.has(origin)) {
      return Gateway._netPool.get(origin)!;
    }
    Logger.info('Creating net instance', { origin });
    const net = await newNetInstance(origin, node.config.net.framework);
    await net.start?.(origin);
    this._netPool.set(origin, net);
    await this.emit('register', net, origin);
    return net;
  }

  static async request(request: RequestProtocol, node: INode): Promise<ResponseProtocol> {
    Logger.info('Sending request', {
      node: request.node,
      method: request.method,
      hasActor: !!request.actor,
      paramCount: request.parameters?.length ?? 0
    });

    const net = await this.getOrCreateNetInstance(node);
    const response = await net.request(request, node.config.net.framework.request.options);

    if (response.exception) {
      Logger.error('Request failed', {
        node: request.node,
        code: response.exception.code,
        message: response.exception.message
      });
    } else {
      Logger.info('Request succeeded', { node: request.node });
    }
    return response;
  }

  static async service(request: RequestProtocol): Promise<ResponseProtocol> {
    const node = request.node;
    Logger.info('Processing service request', {
      node,
      method: request.method,
      hasActor: !!request.actor,
      paramCount: request.parameters?.length ?? 0,
      request
    });

    const nodeNode = Gateway.matchNode(node);

    if (!nodeNode) {
      Logger.error('Node not found', { node });
      return ProtocolBuilder.buildException(request, {
        code: 404,
        message: `Node not found: ${node}`,
      });
    }

    const response = await nodeNode.service(request);

    if (response.exception) {
      Logger.error('Service request failed', {
        node,
        code: response.exception.code,
        message: response.exception.message
      });
    } else {
      Logger.info('Service request completed', { node });
    }

    return response;
  }

  static get netPoolSize(): number {
    return this._netPool.size;
  }

  static get nodeCount(): number {
    return this._nodeRegistry.size;
  }

  static getNodeRegistry(): IterableIterator<[string, INode]> {
    return this._nodeRegistry.entries();
  }
  static findNode(endpoint: string): INode | undefined {
    return this._nodeRegistry.get(endpoint);
  }
}