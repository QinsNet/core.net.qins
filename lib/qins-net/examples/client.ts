import 'reflect-metadata';
import { EndpointGlobal, OperateType } from '../net';
import { Actor } from '../decorators/Actor';
import { Action } from '../decorators/Method';
import { Pack } from './pack';

EndpointGlobal.config.listen = false;

@Actor({ endpoint: 'http://localhost:8080/user' })
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