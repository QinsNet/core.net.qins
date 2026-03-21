import { NetProperties } from "./Net";
import { ProtocolProperties } from "./Protocol";

export class GatewayConfig{
    name: string = '';
    enabled: boolean = true;
    net: Partial<NetProperties> = {};
    protocol: Partial<ProtocolProperties> = {};
}
