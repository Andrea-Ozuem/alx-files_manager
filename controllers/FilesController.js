import { v4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const path = require('path');
const fs = require('fs');

exports.postUpload = (async (req, res) => {
  // retrieve user based on header
  const header = req.headers['x-token'];
  let user = await redisClient.get(`auth_${header}`);
  if (!user) res.status(401).send({ error: 'Unauthorized' }).end();

  // get file details
  const { name, type, data } = req.body;
  const { isPublic } = req.body || false;
  const { parentId } = req.body || 0;

  if (!name || !type || (!['folder', 'file', 'image'].includes(type)) || (!data && type !== 'folder')) {
    // eslint-disable-next-line no-nested-ternary
    res.status(400).send(`error: ${!name ? 'Missing name' : (!type || (!['folder', 'file', 'image'].includes(type)))
      ? 'Missing type' : 'Missing data'}`).end();
  }
  if (parentId) {
    const folder = await dbClient.findU('files', '_id', parentId);
    if (!folder) res.status(400).send({ error: 'Parent not found' }).end();
    if (folder.type !== 'folder') res.status(400).send({ error: 'Parent is not a folder' }).end();
  }

  user = await dbClient.findU('users', '_id', user);

  // save file to db if folder
  if (type === 'folder') {
    const inserted = await dbClient.inserFile(user._id, name, type, isPublic, parentId, null);
    const opt = inserted.ops[0];
    return res.status(201).json({
      id: opt._id,
      userId: opt.userId,
      name: opt.name,
      type: opt.type,
      isPublic: opt.isPublic !== undefined ? opt.isPublic : false,
      parentId: opt.parentId !== undefined ? opt.parentId : 0,
    }).end();
  }
  // else save file locally and in db
  const fpath = process.env.FOLDER_PATH && process.env.FOLDER_PATH.trim() !== ''
    ? process.env.FOLDER_PATH : '/tmp/files_manager';

  if (!fs.existsSync(fpath)) fs.mkdirSync(fpath, { recursive: true });
  const fn = v4(name);
  const filePath = path.join(fpath, fn);

  const decoded = Buffer.from(data, 'base64').toString();
  fs.writeFile(filePath, decoded, (err) => {
    if (err) console.error(err);
  });
  const rec = await dbClient.inserFile(user._id, name, type, isPublic, parentId, filePath);
  const opt = rec.ops[0];
  return res.status(201).json({
    id: opt._id,
    userId: opt.userId,
    name: opt.name,
    type: opt.type,
    isPublic: opt.isPublic !== undefined ? opt.isPublic : false,
    parentId: opt.parentId !== undefined ? opt.parentId : 0,
  }).end();
});
