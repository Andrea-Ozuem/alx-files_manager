import { v4 } from 'uuid';
import { ObjectID } from 'mongodb';
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
    return res.status(400).send(`error: ${!name ? 'Missing name' : (!type || (!['folder', 'file', 'image'].includes(type)))
      ? 'Missing type' : 'Missing data'}`).end();
  }
  if (parentId) {
    const folder = await dbClient.findU('files', '_id', parentId);
    if (!folder) res.status(400).send({ error: 'Parent not found' }).end();
    if (folder.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' }).end();
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
    });
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
  });
});

exports.getShow = (async (req, res) => {
  const token = req.header('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = await dbClient.findU('users', '_id', userId);
  const { id } = req.params;

  const coll = dbClient.client.db().collection('files');
  const file = await coll.findOne({ _id: ObjectID(id), userId: user._id });
  if (!file) return res.status(404).json({ error: 'Not found' });
  return res.status(200).json({
    id: file._id,
    userId: file.userId,
    name: file.name,
    type: file.type,
    isPublic: file.isPublic,
    parentId: file.parentId,
  });
});

exports.getIndex = (async (req, res) => {
  const token = req.header('X-Token');
  const userId = await redisClient.get(`auth_${token}`);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = await dbClient.findU('users', '_id', userId);
  const { parentId = 0, page = 0 } = req.query;
  const filesPerPage = 20;
  const skip = filesPerPage * page;

  const pipeline = [
    { $match: { userId: user._id, parentId: parentId ? new ObjectID(parentId) : '0' } },
    { $skip: skip },
    { $limit: filesPerPage },
  ];
  const files = await dbClient.aggFiles(pipeline);
  for (const file of files) {
    file.id = file._id;
    delete file._id;
    delete file.localPath;
  }
  return res.status(200).json(files);
});
