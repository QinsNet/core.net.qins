# Qins Net
网络框架，用于构建基于Qins的网络应用。
# 配置要求
在`tsconfig.json`中开启反射功能
```json
{
  "compilerOptions": {
    /* Decorator support */
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
  }
}
```
# 使用示例
## Client
```typescript
import 'reflect-metadata';
import {  HTTPServiceFramework, OperateType } from '..';
import { ActorNode } from '../decorators/Actor';
import { Action } from '../decorators/Action';
import { Pack } from './pack';
import { Gateway } from '../node/Gateway';
import { registerClassTransformerTypeProtocol, registerVoidTypeProtocol } from '../serialize/SerializeFunction';
import { ParameterNode } from '../decorators/Parameter';

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
    async addPackage(@ParameterNode({name: 'pack'})  pack: Pack): Promise<Pack> {
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
```
## Server
