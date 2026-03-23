import { CorsProperties, NetProperties } from '../../config/Net';
import type { RequestProtocol, ResponseProtocol } from '../../protocol/Protocol';
import type { INet, IRequestNet, IServiceNet } from '../INet';

export class HTTPNet implements INet {
  public config: NetProperties;
  private _requestNet: IRequestNet;
  private _serviceNet: IServiceNet;

  constructor(requestNet: IRequestNet, serviceNet: IServiceNet, config: NetProperties) {
    this.config = config;
    this._requestNet = requestNet;
    this._serviceNet = serviceNet;  
  }

  async request(data: RequestProtocol, options?: object, timeout?: number): Promise<ResponseProtocol> {
    return this._requestNet.request(data, options, timeout);
  }

  async service(data: RequestProtocol): Promise<ResponseProtocol> {
    return this._serviceNet.service(data);
  }

  async start(host: string, cors?: CorsProperties): Promise<void> {
    return this._serviceNet.start?.(host, cors);
  }

  async stop(): Promise<void> {
    return this._serviceNet.stop?.();
  }
}