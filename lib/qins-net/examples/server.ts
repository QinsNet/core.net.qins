import 'reflect-metadata';
import { NodeGlobal, NodeGateway, OperateType } from '../net';
import { Pack } from './pack';
import { Action } from '../decorators/Action';
import { Actor } from '../decorators/Actor';

NodeGlobal.config.listen = true;
@Actor({ node: 'http://localhost:8080/user'})
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

NodeGateway.on('register', (_net, origin) => {
  console.log(`Net registered: ${origin}`);
});

NodeGateway.on('unregister', (_net, origin) => {
  console.log(`Net unregistered: ${origin}`);
});

NodeGateway.on('empty', () => {
  console.log('All nets stopped.');
});

async function main() {
  console.log('Gateway running:', NodeGateway.running);
  console.log('Nodes registered:', NodeGateway.nodeCount);
  
  console.log('\nStarting gateway...');
  await NodeGateway.start();
  console.log('Gateway started, running:', NodeGateway.running);
  console.log('Nets running:', NodeGateway.netPoolSize);
  
  console.log('\nGateway is now running and waiting...');
  console.log('Press Ctrl+C to stop.');
  console.log(User)
}

main().catch(console.error);
