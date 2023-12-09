import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const crypto = require('crypto');

exports.postNew = (async (req, res) => {
  const { email, password } = req.body;

  if (!email) return res.status(400).json({ error: 'Missing email' });
  if (!password) return res.status(400).json({ error: 'Missing password' });

  const collection = dbClient.client.db().collection('users');

  // if email exists in db err
  if (await collection.findOne({ email })) {
    return res.status(400).json({ error: 'Already exist' });
  }

  const hashed = crypto.createHash('sha1').update(password).digest('hex');
  const inserted = await collection.insertOne({ email, password: hashed });
  return res.status(201).json({ id: inserted.insertedId, email }).end();
});

exports.getMe = (async (req, res) => {
  const token = req.headers['x-token'];
  const userSess = await redisClient.get(`auth_${token}`);
  if (!userSess) res.status(401).send({ error: 'Unauthorized' }).end();
  const user = await dbClient.findU('_id', userSess);
  res.send({ id: user._id, email: user.email });
});
