import "reflect-metadata";

// 1. 先安装 reflect-metadata
// npm install reflect-metadata

// 装饰器来启用元数据收集
function ReflectMethod() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    // 不需要额外操作，装饰器会自动启用元数据
  };
}

// 定义类
class UserService {
  @ReflectMethod()
  getUserById(id: number): string {
    return `User ${id}`;
  }

  @ReflectMethod()
  async getUserAsync(id: number): Promise<string> {
    return `Async User ${id}`;
  }

  @ReflectMethod()
  getUsers(): string[] {
    return ["Alice", "Bob"];
  }
}

// 反射函数
function getMethodReturnType(target: any, methodName: string): any {
  return Reflect.getMetadata("design:returntype", target, methodName);
}

// 使用示例
const userService = new UserService();

// 方法必须用装饰器装饰过，才能获取元数据
const returnType1 = getMethodReturnType(UserService.prototype, "getUserById");
console.log("getUserById 返回值类型:", returnType1?.name); // String

const returnType2 = getMethodReturnType(UserService.prototype, "getUserAsync");
console.log("getUserAsync 返回值类型:", returnType2?.name); // Promise

const returnType3 = getMethodReturnType(UserService.prototype, "getUsers");
console.log("getUsers 返回值类型:", returnType3?.name); // Array

// 也可以获取参数类型
function getMethodParamTypes(target: any, methodName: string): any[] {
  return Reflect.getMetadata("design:paramtypes", target, methodName) || [];
}

const paramTypes = getMethodParamTypes(UserService.prototype, "getUserById");
console.log("getUserById 参数类型:", paramTypes.map(t => t.name)); // [Number]