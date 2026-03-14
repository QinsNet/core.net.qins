import { getClassConfig, getMethodConfig, hasSendConfig } from '..';
import { GlobalNet } from '../decorators/Global';
import type { MethodConfig } from '../decorators/Method';
import { buildSendData, applyReceiveData } from '../serialize/Serialize';
import type { RequestProtocol, ResponseProtocol } from '../types/Protocol';
import { createRequestProtocol } from '../types/Protocol';

async function sendRequest(
  url: string,
  data: RequestProtocol,
  init: RequestInit,
  timeout: number = 30000
): Promise<ResponseProtocol | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    signal: controller.signal,
    ...init,
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
  const classConfig = getClassConfig(instance);

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

        const routeName = methodConfig.name;
        const mergedInit: RequestInit = {
          ...GlobalNet.config.net,
          ...classConfig.net,
          ...methodConfig.net,
        };

        const requestProtocol = buildRequestProtocol(
          routeName,
          target,
          args,
          methodConfig
        );

        const responseProtocol = await sendRequest(
          `${methodConfig.baseUrl}/${routeName}`,
          requestProtocol,
          mergedInit
        );

        if (responseProtocol) {
          if (responseProtocol.Exception) {
            throw new Error(`${responseProtocol.Exception.code}: ${responseProtocol.Exception.message}`);
          }

          if (methodConfig.receive.length > 0 && responseProtocol.Actor) {
            applyReceiveData(target, responseProtocol.Actor, methodConfig.receive);
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
  if (methodConfig.send.length > 0) {
    instanceData = buildSendData(instance, methodConfig.send);
  }

  return createRequestProtocol(routeName, params, instanceData);
}
