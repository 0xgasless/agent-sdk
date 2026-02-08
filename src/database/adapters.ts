/**
 * Database Adapters for Session Key Manager
 * 
 * Provides adapters for common databases (PostgreSQL, MongoDB, etc.)
 */

import { DatabaseAdapter } from '../wallet/SessionKeyManager';

// Example: Prisma adapter (PostgreSQL)
export class PrismaDatabaseAdapter implements DatabaseAdapter {
  private prisma: any; // PrismaClient instance
  
  constructor(prismaClient: any) {
    this.prisma = prismaClient;
  }
  
  async create(data: any): Promise<any> {
    return this.prisma.sessionKey.create({ data });
  }
  
  async findOne(where: any): Promise<any | null> {
    return this.prisma.sessionKey.findFirst({ where });
  }
  
  async findMany(where: any): Promise<any[]> {
    return this.prisma.sessionKey.findMany({ where });
  }
  
  async update(where: any, data: any): Promise<any> {
    return this.prisma.sessionKey.updateMany({ where, data });
  }
  
  async delete(where: any): Promise<any> {
    return this.prisma.sessionKey.deleteMany({ where });
  }
}

// Example: MongoDB adapter
export class MongoDBAdapter implements DatabaseAdapter {
  private collection: any; // MongoDB collection
  
  constructor(collection: any) {
    this.collection = collection;
  }
  
  async create(data: any): Promise<any> {
    const result = await this.collection.insertOne(data);
    return { ...data, _id: result.insertedId };
  }
  
  async findOne(where: any): Promise<any | null> {
    return this.collection.findOne(where);
  }
  
  async findMany(where: any): Promise<any[]> {
    return this.collection.find(where).toArray();
  }
  
  async update(where: any, data: any): Promise<any> {
    const result = await this.collection.updateMany(where, { $set: data });
    return result;
  }
  
  async delete(where: any): Promise<any> {
    const result = await this.collection.deleteMany(where);
    return result;
  }
}

// Example: Simple in-memory adapter (for testing)
export class InMemoryAdapter implements DatabaseAdapter {
  private data: Map<string, any> = new Map();
  
  async create(data: any): Promise<any> {
    this.data.set(data.id, data);
    return data;
  }
  
  async findOne(where: any): Promise<any | null> {
    for (const [key, value] of this.data.entries()) {
      let matches = true;
      for (const [k, v] of Object.entries(where)) {
        if (value[k] !== v) {
          matches = false;
          break;
        }
      }
      if (matches) return value;
    }
    return null;
  }
  
  async findMany(where: any): Promise<any[]> {
    const results: any[] = [];
    for (const [key, value] of this.data.entries()) {
      let matches = true;
      for (const [k, v] of Object.entries(where)) {
        if (value[k] !== v) {
          matches = false;
          break;
        }
      }
      if (matches) results.push(value);
    }
    return results;
  }
  
  async update(where: any, data: any): Promise<any> {
    let updated = 0;
    for (const [key, value] of this.data.entries()) {
      let matches = true;
      for (const [k, v] of Object.entries(where)) {
        if (value[k] !== v) {
          matches = false;
          break;
        }
      }
      if (matches) {
        this.data.set(key, { ...value, ...data });
        updated++;
      }
    }
    return { modifiedCount: updated };
  }
  
  async delete(where: any): Promise<any> {
    const keysToDelete: string[] = [];
    for (const [key, value] of this.data.entries()) {
      let matches = true;
      for (const [k, v] of Object.entries(where)) {
        if (value[k] !== v) {
          matches = false;
          break;
        }
      }
      if (matches) keysToDelete.push(key);
    }
    keysToDelete.forEach(key => this.data.delete(key));
    return { deletedCount: keysToDelete.length };
  }
}

