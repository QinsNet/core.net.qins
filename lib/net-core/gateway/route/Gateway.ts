import 'reflect-metadata';
import type { INet } from '../../net/INet';
import type { RequestProtocol, ResponseProtocol, TypeProtocol } from '../../protocol/Protocol';
import type { INode } from '../../node/INode';
import { ProtocolBuilder } from '../../util/Protocol';
import { newNetInstance } from '../../util/Netutil';
import { GatewayConfig } from '../../config/Gateway';
import { Logger } from '../../util/Logger';

export type NetEventType = 'register' | 'unregister' | 'empty';
export type NetEventHandler = (net: INet, origin: string) => void | Promise<void>;

export class Gateway {
  private static _running: boolean = false;
  private static _netPool: Map<string, INet> = new Map();
  private static _nodeRegistry: Map<string, INode> = new Map();
  private static _eventHandlers: Map<NetEventType, Set<NetEventHandler>> = new Map();
  private static _resolveEmpty: (() => void) | null = null;
  public static Config: GatewayConfig = new GatewayConfig();
  public static Types: Map<string, TypeProtocol<any>> = new Map();
  public static Logger = new Logger('gateway');

  static get running(): boolean {
    return this._running;
  }

  static on(event: NetEventType, handler: NetEventHandler): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(handler);
  }

  static off(event: NetEventType, handler: NetEventHandler): void {
    this._eventHandlers.get(event)?.delete(handler);
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
    const net = this._netPool.get(origin);
    if (!net) return;

    await net.stop?.();
    this._netPool.delete(origin);
    await this.emit('unregister', net, origin);

    if (this._netPool.size === 0 && this._resolveEmpty) {
      this._resolveEmpty();
      this._resolveEmpty = null;
    }
  }

  static async start(): Promise<void> {
    if(Gateway.Config.log.level)Gateway.Logger.setLogLevel(Gateway.Config.log.level);
    if (this._running) {
      return;
    }

    Gateway.Logger.info('Gateway starting');
    this._running = true;

    for (const node of this._nodeRegistry.values()) {
      await Gateway.getOrCreateNetInstance(node);
    }
    return new Promise((resolve) => {
      this._resolveEmpty = resolve;
    });
  }

  static async stop(): Promise<void> {
    if (!this._running) {
      return;
    }

    Gateway.Logger.info('Gateway stopping');
    this._running = false;

    for (const [origin] of this._netPool) {
      await this.destroyNetInstance(origin);
    }

    await this.emit('empty', null as unknown as INet, '');
    Gateway.Logger.info('Gateway stopped');
  }

  static registerNode(node: INode): void {
    const nodePath = node.config.net.endpoint;
    this._nodeRegistry.set(nodePath, node);
    Gateway.Logger.info('Node registered', { 
      endpoint: node.config.net.endpoint,
      actor: node.config.actor.name,
      method: node.config.method.name
    });

    if (this._running) {
      this.getOrCreateNetInstance(node)
        .then((net) => {
          this.emit('register', net, nodePath);
        })
        .catch((err) => {
          Gateway.Logger.error('Failed to create net instance', { origin: nodePath, error: err instanceof Error ? err.message : String(err) });
        });
    }
  }

  static unregisterNode(nodePath: string): void {
    const node = this._nodeRegistry.get(nodePath);
    if (!node) {
      return;
    }

    this._nodeRegistry.delete(nodePath);
    Gateway.Logger.info('Node unregistered', {
      endpoint: node.config.net.endpoint,
      actor: node.config.actor.name,
      method: node.config.method.name
    });

    if (this._running && this._netPool.has(this.getOriginFromNode(node))) {
      const count = this.countNodesByOrigin(this.getOriginFromNode(node));
      if (count === 0) {
        this.destroyNetInstance(this.getOriginFromNode(node)).catch((err) => {
          Gateway.Logger.error('Failed to destroy net instance', { origin: this.getOriginFromNode(node), error: err instanceof Error ? err.message : String(err) });
        });
      }
    }
  }

  static matchNode(node: string): INode | undefined {
    return this._nodeRegistry.get(node);
  }

  static async getOrCreateNetInstance(node: INode): Promise<INet> {
    const origin = Gateway.getOriginFromNode(node);
    if (Gateway._netPool.has(origin)) {
      return Gateway._netPool.get(origin)!;
    }
    const net = await newNetInstance(origin, node.config.net.framework, node.config.net);
    await net.start?.(origin);
    this._netPool.set(origin, net);
    await this.emit('register', net, origin);
    return net;
  }

  static async request(request: RequestProtocol, node: INode): Promise<ResponseProtocol> {
    const net = await this.getOrCreateNetInstance(node);
    const response = await net.request(request, node.config.net.framework.request.options);
    return response;
  }

  static async service(request: RequestProtocol): Promise<ResponseProtocol> {
    const nodeNode = Gateway.matchNode(request.node);

    if (!nodeNode) {
      return ProtocolBuilder.buildException(request, {
        code: 404,
        message: `Node not found: ${request.node}`,
      });
    }

    const response = await nodeNode.service(request);
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