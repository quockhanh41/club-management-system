import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://bkiet:tbkiet123@tkpm-login.fxennwr.mongodb.net/';
const DB_NAME = 'club_system';

let client;
let db;

export async function connectToDatabase() {
  try {
    if (client && db) {
      return { client, db };
    }

    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB Atlas successfully');
    
    return { client, db };
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function getDatabase() {
  if (!db) {
    await connectToDatabase();
  }
  return db;
}

export async function closeConnection() {
  if (client) {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
} 