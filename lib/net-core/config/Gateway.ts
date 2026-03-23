import { LoggerProperties } from "./Logger";
import { NetProperties } from "./Net";
import { ProtocolProperties } from "./Protocol";
import { Object } from "ts-toolbelt"

export class GatewayConfig {
    name: string = '';
    enabled: boolean = true;
    net: Object.Partial<NetProperties,'deep'> = {};
    protocol: Object.Partial<ProtocolProperties,'deep'> = {};
    log: Object.Partial<LoggerProperties,'deep'> = {
        level: "info",
    }
}
