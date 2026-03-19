import 'reflect-metadata';

// 2. 获取方法参数类型的装饰器
function LogParams() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      // 获取方法的参数类型
      const paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey);
      if (!paramTypes) {
        throw new Error(`方法 ${propertyKey} 没有参数类型元数据`);
      }
      console.log(`调用方法: ${propertyKey}`);
      console.log('参数类型:', paramTypes?.map((t: any) => t.name));
      console.log('参数值:', args);
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

class UserService {
  constructor(
  ) {}
  
  @LogParams()
  createUser(name: string, age: number, isAdmin: boolean = false) {
    return { name, age, isAdmin };
  }
}

// 模拟的类

// 测试获取design:paramtypes
console.log('=== 获取构造函数参数类型 ===');
const constructorParamTypes = Reflect.getMetadata('design:paramtypes', UserService);
console.log('构造函数参数类型:');
constructorParamTypes?.forEach((type: any, index: number) => {
  console.log(`参数${index}: ${type.name}`);
});

// 测试方法调用
console.log('\n=== 测试方法调用 ===');
const service = new UserService();
service.createUser('张三', 25, true);