import 'reflect-metadata';
import { EndpointGlobal, EndpointGateway, NodeClass, NodeMethod, OperateType } from '../core';
import { Type } from 'class-transformer';

EndpointGlobal.config.listen = true;

@NodeClass({ endpoint: 'http://localhost:8080/user' })
class User {
  id: string = '';
  name: string = '';
  email: string = '';
  password: string = '';

  @NodeMethod({
    request: {
      actor: {
        id: OperateType.Opaque,
        password: OperateType.Opaque,
      },
    },
    response: {
      actor: {
        name: OperateType.Opaque,
        email: OperateType.Opaque,
        password: OperateType.Opaque,
      },
    },
  })
  async getUser(): Promise<void> {
    if(this.id == '123' && this.password == '123456'){
      this.name = 'Ether';
      this.email = 'Ether@example.com';
      this.password = '';
    }
    return Promise.resolve();
  }
}

EndpointGateway.on('register', (_net, origin) => {
  console.log(`Net registered: ${origin}`);
});

EndpointGateway.on('unregister', (_net, origin) => {
  console.log(`Net unregistered: ${origin}`);
});

EndpointGateway.on('empty', () => {
  console.log('All nets stopped.');
});

async function main() {
  console.log('Gateway running:', EndpointGateway.running);
  console.log('Endpoints registered:', EndpointGateway.endpointCount);
  
  console.log('\nStarting gateway...');
  await EndpointGateway.start();
  console.log('Gateway started, running:', EndpointGateway.running);
  console.log('Nets running:', EndpointGateway.netPoolSize);
  
  console.log('\nGateway is now running and waiting...');
  console.log('Press Ctrl+C to stop.');
}

main().catch(console.error);
