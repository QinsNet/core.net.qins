import { GatewayConfig } from "../config";
import { TypeProtocol } from "../protocol";
import { Logger } from "../util/Logger";

export interface IGateway {
    config: GatewayConfig;
    logger: Logger;
    types: Map<string, TypeProtocol<any>>;
    
}
