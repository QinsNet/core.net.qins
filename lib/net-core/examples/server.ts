import "reflect-metadata";
import { HTTPServiceFramework, OperateType } from "..";
import { Pack } from "./pack";
import { ActionNode } from "../decorators/Action";
import { ActorNode } from "../decorators/Actor";
import { Gateway } from "../node/Gateway";
import { TypeNode, VoidType } from "../serialize/SerializeFunction";
import { ParameterNode } from "../decorators/Parameter";

Gateway.Config.net.framework = {
  service: { type: HTTPServiceFramework.Express },
};
Gateway.Config.net.endpoint = "http://localhost:8080";
@ActorNode()
class User {
  id: string = "";
  name: string = "";
  email: string = "";
  password: string = "";
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
  await Gateway.start();
}

main().catch(console.error);
