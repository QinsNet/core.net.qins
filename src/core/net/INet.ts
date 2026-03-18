import type { RequestProtocol, ResponseProtocol } from '../protocol/Protocol';

export type RouteHandler = (request: RequestProtocol) => Promise<ResponseProtocol>;

export interface INet {
    request(data: RequestProtocol, init?: RequestInit, timeout?: number): Promise<ResponseProtocol>;
    service(data: RequestProtocol): Promise<ResponseProtocol>;
    start?(host: string): Promise<void>;
    stop?(): Promise<void>;
}
