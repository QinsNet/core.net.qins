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

```typescript
import "reflect-metadata";

import { Gateway, HTTPServiceFramework, ActorNode, ActionNode, OperateType, VoidType, TypeNode, ParameterNode, AttributeNode } from "@qinsteam/net-core";
import { Pack } from "./pack";
import { deserializePack, serializePack } from "./serialize";

Gateway.config.net.framework = {
  service: { type: HTTPServiceFramework.Express },
};
Gateway.config.net.endpoint = "http://localhost:8080";
@ActorNode()
class User {
  id: string = "";
  name: string = "";
  email: string = "";
  password: string = "";
  @AttributeNode({ name: "packages", type: { type: [],name: "Pack[]",serialize: serializePack, deserialize: deserializePack } })
  packages: Pack[] = [];

  @ActionNode({
    pact: {
      request: {
        actor: {
          id: OperateType.Local,
          password: OperateType.Local,
        }
      },
      response: {
        actor: {
          name: OperateType.Local,
          email: OperateType.Local,
          password: OperateType.Local,
        }
      }
    },
    result: {
      type: VoidType(),
    },
  })
  async getUser(): Promise<void> {
    if (this.id == "123" && this.password == "1234") {
      this.name = "Ether";
      this.email = "Ether@example.com";
      this.password = "";
    }
    return Promise.resolve();
  }

  @ActionNode({
    pact: {
      request: {
        actor: {},
        parameters: {
          pack: {
            id: OperateType.Local,
          },
        },
      },
      response: {
        actor: {
          packages: OperateType.Local,
        },
        result: {
          name: OperateType.Local,
          version: OperateType.Local,
        },
      },
    },
    result: {
      type: TypeNode(Pack),
    },
  })
  async addPackage(@ParameterNode({ name: "pack" }) pack: Pack): Promise<Pack> {
    if (pack.id == "aaaa") {
      this.packages.push(pack);
      pack.id = "bbbb";
      pack.version = "1.0.0";
      pack.name = "test";
      pack.description = "test package";
    }
    return Promise.resolve(pack);
  }
}

Gateway.on("register", (_net, origin) => {
  console.log(`Net registered: ${origin}`);
});

Gateway.on("unregister", (_net, origin) => {
  console.log(`Net unregistered: ${origin}`);
});

Gateway.on("empty", () => {
  console.log("All nets stopped.");
});

async function main() {
  console.log("Server started.",User.name);
  await Gateway.start();
}

main().catch(console.error);

```
## 序列化与反序列化
```typescript
import { Pack } from "./pack";

export function serializePack(value: Pack[]) {
  return JSON.stringify(value);
}
export function deserializePack(value: string) {
  const json = JSON.parse(value) as Object[];
  return json.map((item) => {
    return Object.assign(new Pack(), item);
  }) as Pack[];
}
```