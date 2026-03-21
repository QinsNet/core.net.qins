import { registerVoidTypeProtocol } from "../serialize/SerializeFunction";
import { ActorProperties } from "./Actor";
import { MethodProperties } from "./Action";
import { HTTPRequestFramework, HTTPServiceFramework, NetProperties, NetType, WSFramework } from "./Net";
import { NodeType, ProtocolProperties } from "./Protocol";

export class NodeProperties {
    name: string = '';
    enabled: boolean = true;
    net: NetProperties = {
        endpoint: '',
        host: '',
        framework: {
            request: {
                type: HTTPRequestFramework.Fetch,
                options: {},
            },
            service: {
                type: HTTPServiceFramework.Empty,
                options: {},
            },
            ws: {
                type: WSFramework.WS,
                options: {},
            },
        },
        type: NetType.HTTP,
        timeout: 0,
    };
    protocol: ProtocolProperties = { type: NodeType.Path };
    actor: ActorProperties = {
        name: '',
        type: registerVoidTypeProtocol(),
        attributes: {},
    };
    method: MethodProperties = {
        name: '',
        request: {},
        response: {},
        handler: () => Promise.resolve(),
        isStatic: false,
        parameters: {},
        result: {
            type: registerVoidTypeProtocol(),
        },
    };
}