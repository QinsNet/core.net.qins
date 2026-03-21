import type { RequestProtocol, ResponseProtocol } from '../../../protocol/Protocol';
import type { IRequestNet } from '../../INet';
import { Logger } from '../../../util/Logger';
import { ProtocolBuilder } from '../../../util/Protocol';

export class FetchRequestNet implements IRequestNet {
  async request(
    data: RequestProtocol,
    options?: object,
    timeout: number = 30000
  ): Promise<ResponseProtocol> {
    Logger.info('FetchRequestNet: HTTP request starting', {
      node: data.node,
      method: data.method,
      timeout
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      Logger.warn('FetchRequestNet: HTTP request timeout', { node: data.node, timeout });
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
      Logger.debug('FetchRequestNet: HTTP request sending', { url: fullUrl });
      const response = await fetch(fullUrl, requestInit);
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json() as ResponseProtocol;
        Logger.info('FetchRequestNet: HTTP request succeeded', {
          node: data.node,
          status: response.status
        });
        return json;
      }

      Logger.error('FetchRequestNet: HTTP request failed', {
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
      Logger.error('FetchRequestNet: HTTP request error', {
        node: data.node,
        error: error instanceof Error ? error.message + error.stack : String(error)
      });
      return ProtocolBuilder.buildException(data, {
        code: 500,
        message: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  }
}