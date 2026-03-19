import { GlobalEndpointConfig, HTTPRequestFramework, WSFramework } from "../config";

export class EndpointGlobal {
    static config: GlobalEndpointConfig = { listen: false, framework: { ws: WSFramework.WS, request: HTTPRequestFramework.Fetch },  cors: { origin: [], methods: [], allowedHeaders: [], exposedHeaders: [], credentials: false, maxAge: 0 } }
}