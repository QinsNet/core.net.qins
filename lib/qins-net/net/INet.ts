import { CorsConfig } from '../config';
import type { RequestProtocol, ResponseProtocol } from '../protocol/Protocol';

export interface IRequestNet {
    request(data: RequestProtocol, options?: object, timeout?: number): Promise<ResponseProtocol>;
}
export interface IServiceNet {
    service(data: RequestProtocol): Promise<ResponseProtocol>;
    start?(host: string, cors?: CorsConfig): Promise<void>;
    stop?(): Promise<void>;
    addCors(cors?: CorsConfig): void;
}
export interface INet extends IRequestNet, IServiceNet {

}
