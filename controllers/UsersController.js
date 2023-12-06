import dbClient from '../utils/db';

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
