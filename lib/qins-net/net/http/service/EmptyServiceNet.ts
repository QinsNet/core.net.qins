import { CorsConfig } from "../../../config";
import { RequestProtocol, ResponseProtocol } from "../../../net";
import logger from "../../../util/Logger";
import { IServiceNet } from "../../INet";

export class EmptyServiceNet implements IServiceNet {
    service(data: RequestProtocol): Promise<ResponseProtocol> {
        throw new Error("Method not implemented." + JSON.stringify(data));
    }
    start?(host: string, cors?: CorsConfig): Promise<void> {
        logger.info("EmptyServiceNet start", host, cors);
        return Promise.resolve();
    }
    stop?(): Promise<void> {
        return Promise.resolve();
    }
    addCors(cors?: CorsConfig): void {
        logger.info("EmptyServiceNet addCors", cors);
        // Do nothing
    }
}