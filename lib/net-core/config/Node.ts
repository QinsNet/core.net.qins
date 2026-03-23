import { VoidType } from "../serialize/SerializeFunction";
import { ActorProperties } from "./Actor";
import { MethodProperties } from "./Action";
import { HTTPRequestFramework, HTTPServiceFramework, NetProperties, NetType, WSFramework } from "./Net";
import { NodeProtocolType, ProtocolProperties } from "./Protocol";
import { LoggerLevel, LoggerProperties } from "./Logger";

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
    protocol: ProtocolProperties = { type: NodeProtocolType.Path };
    actor: ActorProperties = {
        name: '',
        type: VoidType(),
        attributes: {},
    };
    method: MethodProperties = {
        name: '',
        pact: {
            request: {},
            response: {},
        },
        handler: () => Promise.resolve(),
        isStatic: false,
        parameters: {},
        result: {
            type: VoidType(),
        },
    };
    log: LoggerProperties = {
        level: LoggerLevel.Error,
    }
}