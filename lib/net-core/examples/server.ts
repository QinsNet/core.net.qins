import "reflect-metadata";
import { AttributeNode, HTTPServiceFramework, OperateType } from "..";
import { Pack } from "./pack";
import { ActionNode } from "../decorators/Action";
import { ActorNode } from "../decorators/Actor";
import { Gateway } from "../gateway/IGateway";
import { TypeNode, VoidType } from "../serialize/SerializeFunction";
import { ParameterNode } from "../decorators/Parameter";

Gateway.config.net.framework = {
  service: { type: HTTPServiceFramework.Express },
};
Gateway.config.net.endpoint = "http://localhost:8080";
@ActorNode()
class User {
  @AttributeNode({ name: "id" })
  id: string = "";
  @AttributeNode({ name: "name" })
  name: string = "";
  @AttributeNode({ name: "email" })
  email: string = "";
  @AttributeNode({ name: "password" })
  password: string = "";
  @AttributeNode({ name: "packages" })
  packages: Pack[] = [];

  @ActionNode({
    view: {
      request: {
        actor: {
          id: [OperateType.Request],
          password: [OperateType.Request],
        }
      },
      response: {
        actor: {
          name: [OperateType.Request],
          email: [OperateType.Request],
          password: [OperateType.Request],
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
    view: {
      request: {
        actor: {},
        parameters: {
          pack: {
            id: [OperateType.Request],
          },
        },
      },
      response: {
        actor: {
          packages: [OperateType.Request],
        },
        result: {
          name: [OperateType.Request],
          version: [OperateType.Request],
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
