import type { RequestProtocol, ResponseProtocol } from '../../../protocol/Protocol';
import type { IRequestNet } from '../../INet';
import { ProtocolBuilder } from '../../../util/Protocol';
import { Gateway } from '../../../node';

export class FetchRequestNet implements IRequestNet {
  async request(
    data: RequestProtocol,
    options?: object,
    timeout: number = 30000
  ): Promise<ResponseProtocol> {
    Gateway.Logger.debug('Net sending', {
      node: data.node,
      method: data.method,
      timeout
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
      ...options,
    };

    try {
      const fullUrl = data.node;
      const response = await fetch(fullUrl, requestInit);
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json() as ResponseProtocol;
        Gateway.Logger.debug('Net response received', {
          node: data.node,
          status: response.status
        });
        return json;
      }

      Gateway.Logger.error('Net request failed', {
        node: data.node,
        status: response.status,
        statusText: response.statusText
      });
      return ProtocolBuilder.buildException(data, {
        code: response.status,
        message: response.statusText,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      Gateway.Logger.error('Net request error', {
        node: data.node,
        error: error instanceof Error ? error.message : String(error)
      });
      return ProtocolBuilder.buildException(data, {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  }
}