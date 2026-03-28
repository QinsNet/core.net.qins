import { ActorProperties } from "./Actor";
import { MethodProperties } from "./Action";
import { HTTPRequestFramework, HTTPServiceFramework, NetProperties, NetType, WSFramework } from "./Net";
import { NodeProtocolType, ProtocolProperties } from "./Protocol";
import { LoggerLevel, LoggerProperties } from "./Logger";
import { ReactionProtocolType } from "../protocol";
import { TypeNode } from "../serialize";

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
    };
    method: MethodProperties = {
        name: '',
        handler: () => Promise.resolve(),
        isStatic: false,
    };
    reaction: ReactionProtocolType = {
        type: TypeNode(void 0),
    };
    log: LoggerProperties = {
        level: LoggerLevel.Error,
    }
    description: Record<string, string> = {};
}