import { CorsProperties, NetProperties } from '../config/Net';
import type { RequestProtocol, ResponseProtocol } from '../protocol/Protocol';

export interface IRequestNet {
    request(data: RequestProtocol, options?: object, timeout?: number): Promise<ResponseProtocol>;
}
export interface IServiceNet {
    service(data: RequestProtocol): Promise<ResponseProtocol>;
    start?(host: string, cors?: CorsProperties): Promise<void>;
    stop?(): Promise<void>;
}
export interface INet extends IRequestNet, IServiceNet {
    config: NetProperties;
}
