import redisClient from '../utils/redis';
import dbClient from '../utils/db';

exports.getStatus = (async (req, res) => {
  const redisAlive = redisClient.isAlive();
  const dbAlive = dbClient.isAlive();
  res.send({'redis': redisAlive, 'db': dbAlive});
});

exports.getStats = (async (req, res) => {
  const nbU = await dbClient.nbUsers();
  const nbF = await dbClient.nbFiles();
  res.send({'users': nbU, 'files': nbF});
});
