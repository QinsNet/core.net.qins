import { Net, Send, Receive, net, GlobalNet } from '../core';

interface UserPack {
  name: string;
  value: string;
}

GlobalNet.baseUrl = 'http://localhost:3000';
GlobalNet.timeout = 5000;
GlobalNet.headers = { 'X-Global-Header': 'value' };

@Net({
  baseUrl: 'http://localhost:3000',
  timeout: 3000,
  headers: {
    'X-Class-Header': 'value',
  },
})
class UserService {
  private pack: UserPack = { name: '', value: '' };

  @Net({ name: '获取用户', timeout: 10000 })
  @Send('this.pack.name,this.pack.value')
  async getUser(_userId: string): Promise<{ id: number; name: string }> {
    return { id: 0, name: '' };
  }

  @Net({ name: '更新用户' })
  @Receive('this.pack.name,this.pack.value')
  async updateUser(_user: { id: number; name: string }): Promise<boolean> {
    return true;
  }

  @Net({ name: '删除用户', timeout: 5000 })
  @Send('this.pack.name')
  async deleteUser(_userId: string): Promise<void> {
  }

  getPack(): UserPack {
    return this.pack;
  }
}

async function example() {
  const service = net(new UserService());
  
  try {
    const user = await service.getUser('123');
    console.log('User:', user);
    
    const success = await service.updateUser({ id: 1, name: 'Test' });
    console.log('Update success:', success);
    
    console.log('Pack after update:', service.getPack());
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
