import { HTTPRequestFramework, WSFramework, HTTPServiceFramework } from "../config";
import { INet, IRequestNet, IServiceNet } from "../net/INet";
import { HTTPNet } from "../net/http";
import { EmptyServiceNet } from "../net/http/service/EmptyServiceNet";

export function getNetTypeFromEndpoint(endpoint: string): "http" | "ws" {
  if (endpoint.startsWith("ws://") || endpoint.startsWith("wss://")) {
    return "ws";
  }
  return "http";
}

export function getOriginFromEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
  return url.host;
}

export async function newNetInstance(origin: string, isListen: boolean, framework: { ws: WSFramework, request: HTTPRequestFramework, service: HTTPServiceFramework }): Promise<INet> {
  const url = new URL(origin);
  const type = url.protocol.replace(":", "");
  let net: INet | undefined = undefined;

  if (type === "ws") {
    if (isListen) {
      throw new Error("WS net must be created with isListen set to true");
    }
    if (framework.ws === WSFramework.WS) {
      const { WSOfficialNet } = await import("../net/ws/WSOfficialNet");
      net = new WSOfficialNet();
    } else {
      throw new Error("WS framework not supported");
    }
  } else if (type === "http") {
    const requestFramework = framework.request;
    const serviceFramework = framework.service;

    let requestNet: IRequestNet;
    let serviceNet: IServiceNet;

    if (requestFramework === HTTPRequestFramework.Fetch) {
      const { FetchRequestNet } = await import("../net/http/request/FetchRequestNet");
      requestNet = new FetchRequestNet();
    } else {
      throw new Error("HTTP request framework not supported");
    }
    if (!isListen) {
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
