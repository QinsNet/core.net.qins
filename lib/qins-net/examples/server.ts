import 'reflect-metadata';
import { EndpointGlobal, EndpointGateway, OperateType } from '../net';
import { Pack } from './pack';
import { Action } from '../decorators/Method';
import { Actor } from '../decorators/Actor';

EndpointGlobal.config.listen = true;
@Actor({ endpoint: 'http://localhost:8080/user'})
class User {
  id: string = '';
  name: string = '';
  email: string = '';
  password: string = '';
  packages: Pack[] = [];

  @Action({
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
    if(this.id == '123' && this.password == '1234'){
      this.name = 'Ether';
      this.email = 'Ether@example.com';
      this.password = '';
    }
    return Promise.resolve();
  }


    @Action({
      request: {
        actor: {},
        parameters: {
          pack: {
            name: OperateType.Opaque,
          },
        }
      },
      response: {
        actor: {
          packages: OperateType.Opaque,
        },
        result: {
          name: OperateType.Opaque,
          version: OperateType.Opaque,
        }
      },
    })
    async addPackage(pack: Pack): Promise<Pack> {
      if(this.id == 'aaaa'){
        this.packages.push(pack);
        pack.version = '1.0.0';
        pack.name = 'test';
        pack.description = 'test package';
      }
      return Promise.resolve(pack);
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
  console.log(User)
}

main().catch(console.error);
