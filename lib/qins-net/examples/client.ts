import 'reflect-metadata';
import {  HTTPServiceFramework, OperateType } from '../net';
import { ActorNode } from '../decorators/Actor';
import { Action } from '../decorators/Action';
import { Pack } from './pack';
import { Gateway } from '../node/Gateway';
import { registerClassTransformerTypeProtocol, registerVoidTypeProtocol } from '../serialize/SerializeFunction';

Gateway.config.net.framework = { service: { type: HTTPServiceFramework.Empty } }
Gateway.config.net.endpoint = 'http://localhost:8080';
@ActorNode()
class User {
  id: string = '';
  name: string = '';
  email: string = '';
  password: string = '';
  packages: Pack[] = [];

  @Action({
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
    return Promise.resolve();
  }


  @Action({
      request: {
        actor: {},
        parameters: {
          pack: {
            name: OperateType.Local,
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

void User;

export async function main() {
  const user = new User();
  user.id = '123';
  user.password = '1234';

  console.log('Sending request with id:', user.id);

  try {
    await user.getUser();
    console.log('Response:');
    console.log('  name:', JSON.stringify(user));
    const pack = new Pack()
    pack.id = 'aaaa';
    await user.addPackage(pack);
    console.log('  packages:', JSON.stringify(user));
  } catch (error) {
    console.error('Error:', error);
  }
}

main();