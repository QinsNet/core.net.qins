import { Gateway } from "../../../node";
import { RequestProtocol, ResponseProtocol } from "../../../protocol";
import { IServiceNet } from "../../INet";

export class EmptyServiceNet implements IServiceNet {
    service(data: RequestProtocol): Promise<ResponseProtocol> {
        throw new Error("Method not implemented." + JSON.stringify(data));
    }
    start?(host: string): Promise<void> {
        Gateway.logger.info("EmptyServiceNet start", host);
        return Promise.resolve();
    }
    stop?(): Promise<void> {
        return Promise.resolve();
    }
}