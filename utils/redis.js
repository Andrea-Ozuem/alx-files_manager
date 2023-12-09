import redis from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = redis.createClient();
    this.client.on('error', (err) => console.log(err.message));
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const asyncGet = promisify(this.client.GET).bind(this.client);
    const val = await asyncGet(key);
    return val;
  }

  async set(key, val, time) {
    const asyncSet = promisify(this.client.SET).bind(this.client);
    await asyncSet(key, val, 'EX', time);
  }

  async del(key) {
    const delAsync = promisify(this.client.DEL).bind(this.client);
    await delAsync(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
