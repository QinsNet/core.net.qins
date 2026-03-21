import { ActorConfig } from "./Actor";
import { MethodConfig } from "./Method";

export class EndpointConfig {
    name: string = '';
    endpoint: string = '';
    enabled: boolean = true;
    actor: ActorConfig = new ActorConfig();
    method: MethodConfig = new MethodConfig();
}