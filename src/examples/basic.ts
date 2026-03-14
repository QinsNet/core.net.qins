import { MetaClass, MetaMethod, Receive, Send } from "../core";

@MetaClass()
class User{
  constructor(){
    console.log('User constructor');
  }
  username: string = '';
  password: string = '';
  isLogin: boolean = false;

  // 抽象方法不能应用修饰器，修饰器只能用于方法的实现上
  @MetaMethod({send: []})
  async login(username: string, password: string): Promise<boolean>{
    return Promise.resolve(true);
  }
}