import { GatewayConfig } from "../config";
import { MetaType } from "../protocol";
import { Logger } from "../util/Logger";
import type { INet } from "../net/INet";
import type { INode } from "../node/INode";
import type { RequestProtocol, ResponseProtocol } from "../protocol/Protocol";
import { RouteGateway } from "./route/RouteGateway";

export type NetEventType = 'register' | 'unregister' | 'empty';
export type NetEventHandler = (net: INet, origin: string) => void | Promise<void>;

export interface IGateway {
    config: GatewayConfig;
    logger: Logger;
    types: Map<string, MetaType<any>>;
    on(event: NetEventType, handler: NetEventHandler): void;
    off(event: NetEventType, handler: NetEventHandler): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    registerNode(node: INode): void;
    unregisterNode(nodePath: string): void;
    findNode(endpoint: string): INode | undefined;
    request(request: RequestProtocol, node: INode): Promise<ResponseProtocol>;
    service(request: RequestProtocol): Promise<ResponseProtocol>;
    getNodeRegistry(): IterableIterator<[string, INode]>;
}

export const Gateway: IGateway = new RouteGateway();