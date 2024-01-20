const { MongoClient, ObjectId } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    this.client = new MongoClient(`mongodb://${host}:${port}/${database}`);
    this.client.connect();
  }

  isAlive() {
    return this.client.isConnected();
  }

  async nbUsers() {
    const nb = await this.client.db().collection('users').countDocuments();
    return nb;
  }

  async nbFiles() {
    const nb = await this.client.db().collection('files').countDocuments();
    return nb;
  }

  async findU(coll, key, val) {
    const collection = this.client.db().collection(coll);
    let user = null;
    if (key === '_id') {
      const id = new ObjectId(val);
      user = await collection.findOne({ [key]: id });
    } else {
      user = await collection.findOne({ [key]: val });
    }
    return user;
  }
  
  async aggFiles(pipeline) {
    const files = await this.client.db().collection('files').aggregate(pipeline).toArray();
    return files
  }

  async inserFile(userId, name, type, isPublic, parentId, localPath) {
    const coll = this.client.db().collection('files');
    if (!localPath) {
      const rec = await coll.insertOne({ userId: new ObjectId(userId),
                                         name,
                                         type,
                                         isPublic: isPublic ? isPublic : false,
                                         parentId: parentId ? new ObjectId(parentId) : '0' });
      return rec;
    } else {
      const rec = await coll.insertOne({ userId: new ObjectId(userId),
                                         name,
                                         type,
                                         isPublic: isPublic ? isPublic : false,
                                         parentId: parentId ? new ObjectId(parentId) : '0',
                                         localPath });
      return rec;
    }
  }
}

const dbClient = new DBClient();
export default dbClient;
