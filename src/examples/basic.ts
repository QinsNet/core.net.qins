import { NodeManager, NodeClass, NodeMethod, Send, Receive } from "../core";
import { OperateType } from "../core/decorators/Method";
import { EndpointGlobal } from "../core/node/EndpointGlobal";

EndpointGlobal.config = {
  endpoint: 'http://localhost:8080',
}

@NodeClass()
class UserService {
  username: string = '';
  token: string = '';
  isLogin: boolean = false;

  @NodeMethod({
    request: {
      actor: { username: OperateType.Opaque, token: OperateType.Opaque },
      parameters: { username: OperateType.Opaque, password: OperateType.Opaque }
    },
    response: {
      actor: { isLogin: OperateType.Opaque }
    }
  })
  async login(_username: string, _password: string): Promise<boolean> {
    return true;
  }
}
