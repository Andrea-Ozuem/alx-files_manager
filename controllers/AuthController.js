import { createHash } from 'crypto';
import { v4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

exports.getConnect = (async (req, res) => {
  try {
    const header = req.headers.authorization.split(' ')[1];
    const decoded = Buffer.from(header, 'base64').toString().split(':');
    const user = await dbClient.findU('users', 'email', decoded[0]);
    const pwd = createHash('sha1').update(decoded[1]).digest('hex');
    if (!user || (user && user.password !== pwd)) {
      res.status(401).send({ error: 'Unauthorized' }).end();
    } else {
      const token = v4();
      const key = `auth_${token}`;
      await redisClient.set(key, user._id.toString(), 86400);
      res.status(200).json({ token }).end();
    }
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' }).end();
  }
});

exports.getDisconnect = (async (req, res) => {
  const header = req.headers['x-token'];
  const user = await redisClient.get(`auth_${header}`);
  if (!user) res.status(401).send({ error: 'Unauthorized' }).end();
  await redisClient.del(`auth_${header}`);
  res.status(204).end();
});
