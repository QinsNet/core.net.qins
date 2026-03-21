import 'reflect-metadata';
import { HTTPServiceFramework, OperateType } from '../net';
import { Pack } from './pack';
import { ActionNode } from '../decorators/Action';
import { ActorNode } from '../decorators/Actor';
import { Gateway } from '../node/Gateway';
import { registerClassTransformerTypeProtocol, registerVoidTypeProtocol } from '../serialize/SerializeFunction';
import { ParameterNode } from '../decorators/Parameter';

Gateway.config.net.framework = { service: { type: HTTPServiceFramework.Express } }
Gateway.config.net.endpoint = 'http://localhost:8080';
@ActorNode()
class User {
  id: string = '';
  name: string = '';
  email: string = '';
  password: string = '';
  packages: Pack[] = [];

  @ActionNode({
    request: {
      actor: {
        id: OperateType.Local,
        password: OperateType.Local,
      },
    },
    response: {
      actor: {
        name: OperateType.Local,
        email: OperateType.Local,
        password: OperateType.Local,
      },
    },
    result: {
      type: registerVoidTypeProtocol(),
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


    @ActionNode({
      request: {
        actor: {},
        parameters: {
          pack: {
            id: OperateType.Local,
          },
        }
      },
      response: {
        actor: {
          packages: OperateType.Local,
        },
        result: {
          name: OperateType.Local,
          version: OperateType.Local,
        }
      },
      result: {
        type: registerClassTransformerTypeProtocol(Pack),
      },
    })
    async addPackage(@ParameterNode({name: 'pack'}) pack: Pack): Promise<Pack> {
      if(pack.id == 'aaaa'){
        this.packages.push(pack);
        pack.id = 'bbbb';
        pack.version = '1.0.0';
        pack.name = 'test';
        pack.description = 'test package';
      }
      return Promise.resolve(pack);
    }
}

Gateway.on('register', (_net, origin) => {
  console.log(`Net registered: ${origin}`);
});

Gateway.on('unregister', (_net, origin) => {
  console.log(`Net unregistered: ${origin}`);
});

Gateway.on('empty', () => {
  console.log('All nets stopped.');
});

async function main() {
  console.log('Gateway running:', Gateway.running);
  console.log('Nodes registered:', Gateway.nodeCount);
  
  console.log('\nStarting gateway...');
  await Gateway.start();
  console.log('Gateway started, running:', Gateway.running);
  console.log('Nets running:', Gateway.netPoolSize);  
  
  console.log('\nGateway is now running and waiting...');
  console.log('Press Ctrl+C to stop.');
  console.log(User)
}

main().catch(console.error);
