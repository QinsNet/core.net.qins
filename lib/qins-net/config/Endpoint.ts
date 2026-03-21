import { registerVoidTypeProtocol } from "../serialize/SerializeFunction";
import { ActorProperties } from "./Actor";
import { MethodProperties } from "./Method";
import { HTTPRequestFramework, HTTPServiceFramework, NetProperties, NetType, WSFramework } from "./Net";
import { EndpointType } from "./Protocol";

export class EndpointProperties {
    name: string = '';
    endpoint: string = '';
    enabled: boolean = true;
    net = {
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
        netType: NetType.HTTP,
        timeout: 0,
    } as NetProperties;
    protocol = { endpointType: EndpointType.Path };
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