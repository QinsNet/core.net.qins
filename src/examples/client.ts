import 'reflect-metadata';
import { EndpointGlobal, OperateType } from '../core';
import { Actor } from '../core/decorators/Actor';
import { Method } from '../core/decorators/Method';

EndpointGlobal.config.listen = false;

@Actor({ endpoint: 'http://localhost:8080/user' })
class User {
  id: string = '';
  name: string = '';
  email: string = '';
  password: string = '';
  
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
    return Promise.resolve();
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
    console.log('  name:', user.name);
    console.log('  email:', user.email);
    console.log('  password:', user.password);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
