import 'reflect-metadata';

import { Logger } from '../lib/qins-net/net';
import { main } from './examples/client';

Logger.info('Qins Net initialized');

export { Logger } from '../lib/qins-net/net';
export * from '../lib/qins-net/net';

main();