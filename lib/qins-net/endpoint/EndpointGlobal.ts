import { GlobalEndpointConfig, HTTPRequestFramework, WSFramework } from "../config";

export class EndpointGlobal {
    static config: GlobalEndpointConfig = { listen: false, framework: { ws: WSFramework.WS, request: HTTPRequestFramework.Fetch }}
}