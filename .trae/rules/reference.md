***

## alwaysApply: false

# 项目介绍

# 设计思想

你可以参考本项目`C:\Users\Ether\Documents\GitHub\QinsNet_Java`下的网络对象实现细节，以此来解决开发新版本TS网络框架的任务需要，但不同的地方在于，TS使用Proxy，而Java使用的是动态代理，另外Java的数据同步是根据对象池里ID进行全局同步，而TS是则通过键值索引，会返回相应的JSON对象，有对应的值就代替。比如 @Send("this.pack.name,param1.card.name") 查找this.pack.name这个键值，有对应的值就代替。

不用参考Java版本的节点设计，我们以HTTP请求实现单次调用，类上面指定一下节点地址就可以了,不需要IOC容器，类似reactive(),ref()这种。

# 协议格式

协议的简单格式是：

```json
{
  "Version": "1",
  "Actor": {
    "id": 1,
    "name": "user",
    "pack": {
      "name": "user.pack.name",
      "value": "user.pack.value"
    }
  },
  "Method": "method.name",
  "Parameters": [
    {
      "name": "param.name",
      "value": "param.value"
    },
    {
      "name": "param.name2",
      "value": "param.value2"
    }
  ]
}
```

# 工作存放目录

所有核心接口都放在/src/core目录下，包括网络对象、协议解析器、网络服务器、网络客户端等，后续会迁移到独立的npm包中
其他地方是围绕该项目的可视化Quasar界面

# 要求类型
1.改为以下注解：
@Send
@Receive
@Event
@Node（地址可从环境变量获取）
2.不使用MetaClass继承，改为Proxy拦截，也不用缓存
3.序列化先用JSON.stringify()，允许重写toJSON()方法

