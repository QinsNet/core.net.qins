import { HTTPRequestFramework, HTTPServiceFramework, NetProperties, WSFramework } from "../config/Net";
import { INet, IRequestNet, IServiceNet } from "../net/INet";
import { HTTPNet } from "../net/http";
import { EmptyServiceNet } from "../net/http/service/EmptyServiceNet";

export function getNetTypeFromNode(node: string): "http" | "ws" {
  if (node.startsWith("ws://") || node.startsWith("wss://")) {
    return "ws";
  }
  return "http";
}

export function getOriginFromNode(node: string): string {
  const url = new URL(node);
  return url.host;
}

export async function newNetInstance(origin: string, framework: NetProperties['framework']): Promise<INet> {
  const url = new URL(origin);
  const type = url.protocol.replace(":", "");
  let net: INet | undefined = undefined;

  if (type === "ws") {
    if (framework.ws.type === WSFramework.WS) {
      const { WSOfficialNet } = await import("../net/ws/WSOfficialNet");
      net = new WSOfficialNet();
    } else {
      throw new Error("WS framework not supported");
    }
  } else if (type === "http") {
    const requestFramework = framework.request.type;
    const serviceFramework = framework.service.type;

    let requestNet: IRequestNet;
    let serviceNet: IServiceNet;

    if (requestFramework === HTTPRequestFramework.Fetch) {
      const { FetchRequestNet } = await import("../net/http/request/FetchRequestNet");
      requestNet = new FetchRequestNet();
    } else {
      throw new Error("HTTP request framework not supported");
    }
    if(serviceFramework === HTTPServiceFramework.Empty) {
      serviceNet = new EmptyServiceNet();
    }
    else if (serviceFramework === HTTPServiceFramework.Express) {
      const { ExpressServiceNet } = await import("../net/http/service/ExpressServiceNet");
      serviceNet = new ExpressServiceNet();
    } else {
      throw new Error("HTTP service framework not supported");
    }

    net = new HTTPNet(requestNet, serviceNet);
  } else {
    throw new Error(`Unsupported protocol type: ${type}`);
  }
  return net;
}
