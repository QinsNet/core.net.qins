import 'reflect-metadata';

export interface NetConfig {
  baseUrl: string;
  net: RequestInit;
}

export interface GlobalConfig extends NetConfig {
  name: string;
}

export class GlobalNet {
  static config: GlobalConfig = {
    name: 'GlobalNet',
    baseUrl: '',
    net: {},
  };
}
