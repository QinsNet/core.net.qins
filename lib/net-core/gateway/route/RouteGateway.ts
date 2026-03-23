import 'reflect-metadata';
import type { INet } from '../../net/INet';
import type { RequestProtocol, ResponseProtocol, TypeProtocol } from '../../protocol/Protocol';
import type { INode } from '../../node/INode';
import { ProtocolBuilder } from '../../util/Protocol';
import { newNetInstance } from '../../util/Netutil';
import { GatewayConfig } from '../../config/Gateway';
import { Logger } from '../../util/Logger';
import { IGateway, NetEventType, NetEventHandler } from '../IGateway';

export class RouteGateway implements IGateway {
  private _running: boolean = false;
  private _netPool: Map<string, INet> = new Map();
  private _nodeRegistry: Map<string, INode> = new Map();
  private _eventHandlers: Map<NetEventType, Set<NetEventHandler>> = new Map();
  private _resolveEmpty: (() => void) | null = null;
  public config: GatewayConfig = new GatewayConfig();
  public types: Map<string, TypeProtocol<any>> = new Map();
  public logger = new Logger('gateway');

  get running(): boolean {
    return this._running;
  }

  get netPoolSize(): number {
    return this._netPool.size;
  }

  get nodeCount(): number {
    return this._nodeRegistry.size;
  }

  on(event: NetEventType, handler: NetEventHandler): void {
    if (!this._eventHandlers.has(event)) {
      this._eventHandlers.set(event, new Set());
    }
    this._eventHandlers.get(event)!.add(handler);
  }

  off(event: NetEventType, handler: NetEventHandler): void {
    this._eventHandlers.get(event)?.delete(handler);
  }

  private async emit(event: NetEventType, net: INet, origin: string): Promise<void> {
    const handlers = this._eventHandlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        await handler(net, origin);
      }
    }
  }

  private getOriginFromNode(node: INode): string {
    return `${node.config.net.type}://${node.config.net.host}`;
  }

  private countNodesByOrigin(origin: string): number {
    let count = 0;
    for (const node of this._nodeRegistry.values()) {
      if (this.getOriginFromNode(node) === origin) {
        count++;
      }
    }
    return count;
  }

  private async destroyNetInstance(origin: string): Promise<void> {
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

  async start(): Promise<void> {
    if(this.config.log.level) this.logger.setLogLevel(this.config.log.level);
    if (this._running) {
      return;
    }

    this.logger.info('Gateway starting');
    this._running = true;

    for (const node of this._nodeRegistry.values()) {
      await this.getOrCreateNetInstance(node);
    }
    return new Promise((resolve) => {
      this._resolveEmpty = resolve;
    });
  }

  async stop(): Promise<void> {
    if (!this._running) {
      return;
    }

    this.logger.info('Gateway stopping');
    this._running = false;

    for (const [origin] of this._netPool) {
      await this.destroyNetInstance(origin);
    }

    await this.emit('empty', null as unknown as INet, '');
    this.logger.info('Gateway stopped');
  }

  registerNode(node: INode): void {
    const nodePath = node.config.net.endpoint;
    this._nodeRegistry.set(nodePath, node);
    this.logger.info('Node registered', {
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
          this.logger.error('Failed to create net instance', { origin: nodePath, error: err instanceof Error ? err.message : String(err) });
        });
    }
  }

  unregisterNode(nodePath: string): void {
    const node = this._nodeRegistry.get(nodePath);
    if (!node) {
      return;
    }

    this._nodeRegistry.delete(nodePath);
    this.logger.info('Node unregistered', {
      endpoint: node.config.net.endpoint,
      actor: node.config.actor.name,
      method: node.config.method.name
    });

    if (this._running && this._netPool.has(this.getOriginFromNode(node))) {
      const count = this.countNodesByOrigin(this.getOriginFromNode(node));
      if (count === 0) {
        this.destroyNetInstance(this.getOriginFromNode(node)).catch((err) => {
          this.logger.error('Failed to destroy net instance', { origin: this.getOriginFromNode(node), error: err instanceof Error ? err.message : String(err) });
        });
      }
    }
  }

  matchNode(node: string): INode | undefined {
    return this._nodeRegistry.get(node);
  }

  async getOrCreateNetInstance(node: INode): Promise<INet> {
    const origin = this.getOriginFromNode(node);
    if (this._netPool.has(origin)) {
      return this._netPool.get(origin)!;
    }
    const net = await newNetInstance(origin, node.config.net.framework, node.config.net);
    await net.start?.(origin);
    this._netPool.set(origin, net);
    await this.emit('register', net, origin);
    return net;
  }

  async request(request: RequestProtocol, node: INode): Promise<ResponseProtocol> {
    const net = await this.getOrCreateNetInstance(node);
    const response = await net.request(request, node.config.net.framework.request.options);
    return response;
  }

  async service(request: RequestProtocol): Promise<ResponseProtocol> {
    const nodeNode = this.matchNode(request.node);

    if (!nodeNode) {
      return ProtocolBuilder.buildException(request, {
        code: 404,
        message: `Node not found: ${request.node}`,
      });
    }

    const response = await nodeNode.service(request);
    return response;
  }

  getNodeRegistry(): IterableIterator<[string, INode]> {
    return this._nodeRegistry.entries();
  }
  findNode(endpoint: string): INode | undefined {
    return this._nodeRegistry.get(endpoint);
  }
}
