import "reflect-metadata";
import { AttributeNode, HTTPServiceFramework, OperateType } from "..";
import { ActorNode } from "../decorators/Actor";
import { ActionNode } from "../decorators/Action";
import { Pack } from "./pack";
import { Gateway } from "../node/Gateway";
import { TypeNode } from "../serialize/SerializeFunction";
import { ParameterNode } from "../decorators/Parameter";

Gateway.Config.net.framework = {
  service: { type: HTTPServiceFramework.Empty },
};
Gateway.Config.net.endpoint = "http://localhost:8080";
@ActorNode()
class User {
  id: string = "";
  name: string = "";
  email: string = "";
  password: string = "";
  
  @AttributeNode({ name: "packages" })
  packages: Pack[] = [];

  @ActionNode({
    pact: {
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
    },
    result: {
      type: TypeNode(void 0),
    },
  })
  async getUser(): Promise<void> {
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
    console.log(pack);
    throw new Error("Method not implemented.");
  }
}

void User;

export async function main() {
  const user = new User();
  user.id = "123";
  user.password = "1234";

  console.log("Sending request with id:", user.id);

  try {
    await user.getUser();
    console.log(JSON.stringify(user));
    const pack = new Pack();
    pack.id = "aaaa";
    await user.addPackage(pack);
    console.log(JSON.stringify(user));
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
