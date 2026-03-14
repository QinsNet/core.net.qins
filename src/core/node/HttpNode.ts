import type { MethodConfig } from '../decorators/Annotations';
import { GlobalNet, getClassNetConfig, getMethodConfig, hasSendConfig } from '../decorators/Annotations';
import { buildSendData, applyReceiveData } from '../serialize/Serialize';
import type { RequestProtocol, ResponseProtocol } from '../types/Protocol';
import { createRequestProtocol } from '../types/Protocol';

export type { ClassNetConfig, MethodNetConfig } from '../decorators/Annotations';
export { GlobalNet } from '../decorators/Annotations';

async function sendRequest(
  url: string,
  data: RequestProtocol,
  timeout: number,
  headers: Record<string, string>
): Promise<ResponseProtocol | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, requestInit);
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json() as ResponseProtocol;
    }
    return null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export function net<T extends object>(instance: T): T {
  const classConfig = getClassNetConfig(instance);

  const baseUrl = classConfig?.baseUrl || GlobalNet.baseUrl || '';
  const defaultTimeout = classConfig?.timeout || GlobalNet.timeout;
  const defaultHeaders = { ...GlobalNet.headers, ...classConfig?.headers };

  return new Proxy(instance, {
    get(target: T, prop: string | symbol) {
      const value = Reflect.get(target, prop);
      
      if (typeof value !== 'function') {
        return value;
      }

      const methodName = String(prop);
      
      if (!hasSendConfig(target, methodName)) {
        return value;
      }

      const methodConfig = getMethodConfig(target, methodName);
      
      return async (...args: unknown[]): Promise<unknown> => {
        if (!methodConfig) {
          return;
        }

        const methodNet = methodConfig.net || {};
        const timeout = methodNet.timeout || defaultTimeout;
        const routeName = methodNet.name || methodName;

        const requestProtocol = buildRequestProtocol(
          routeName,
          target,
          args,
          methodConfig
        );

        const responseProtocol = await sendRequest(
          `${baseUrl}/${routeName}`,
          requestProtocol,
          timeout,
          defaultHeaders
        );

        if (responseProtocol) {
          if (responseProtocol.Exception) {
            throw new Error(`${responseProtocol.Exception.code}: ${responseProtocol.Exception.message}`);
          }

          if (methodConfig.receivePaths.length > 0 && responseProtocol.Actor) {
            applyReceiveData(target, responseProtocol.Actor, methodConfig.receivePaths);
          }

          return responseProtocol.Result;
        }

        return null;
      };
    },
  });
}

function buildRequestProtocol(
  routeName: string,
  instance: object,
  args: unknown[],
  methodConfig: MethodConfig
): RequestProtocol {
  const params: Record<string, unknown> = {};
  
  args.forEach((arg, index) => {
    params[`param${index}`] = arg;
  });

  let instanceData: Record<string, unknown> | undefined;
  if (methodConfig.sendPaths.length > 0) {
    instanceData = buildSendData(instance, methodConfig.sendPaths);
  }

  return createRequestProtocol(routeName, params, instanceData);
}
