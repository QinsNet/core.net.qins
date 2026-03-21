import { registerVoidTypeProtocol } from "../serialize/SerializeFunction";
import { ActorProperties } from "./Actor";
import { MethodProperties } from "./Action";
import { HTTPRequestFramework, HTTPServiceFramework, NetProperties, NetType, WSFramework } from "./Net";
import { NodeType } from "./Protocol";

export class NodeProperties {
    name: string = '';
    node: string = '';
    enabled: boolean = true;
    net = {
        node: '',
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
        netType: NetType.HTTP,
        timeout: 0,
    } as NetProperties;
    protocol = { nodeType: NodeType.Path };
    actor = {
        name: '',
        type: registerVoidTypeProtocol(),
        attributes: {},
    } as ActorProperties;
    method = {
        name: '',
        request: {},
        response: {},
        handler: () => Promise.resolve(),
        isStatic: false,
        parameters: {},
        result: registerVoidTypeProtocol(),
    } as MethodProperties;
}