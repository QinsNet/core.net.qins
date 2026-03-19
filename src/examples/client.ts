import 'reflect-metadata';
import { EndpointGlobal, OperateType } from '../core';
import { Actor } from '../core/decorators/Actor';
import { Method } from '../core/decorators/Method';
import { Pack } from './pack';

EndpointGlobal.config.listen = false;

@Actor({ endpoint: 'http://localhost:8080/user' })
class User {
  id: string = '';
  name: string = '';
  email: string = '';
  password: string = '';
  packages: Pack[] = [];

  @Method({
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


    @Method({
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

async function main() {
  const user = new User();
  user.id = '123';
  user.password = '123456';

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
