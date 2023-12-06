const { MongoClient } = require('mongodb');

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
}

const dbClient = new DBClient();
export default dbClient;
