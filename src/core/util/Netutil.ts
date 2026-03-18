
export function getNetTypeFromEndpoint(endpoint: string): 'http' | 'ws' {
  if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
    return 'ws';
  }
  return 'http';
}

export function getOriginFromEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
    return url.host;
}
