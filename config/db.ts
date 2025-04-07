import mongoose, { Mongoose } from "mongoose";

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Extend global type to include our mongoose cache
declare global {
  // This makes sure we don’t get a TS error for global.mongoose
  var mongoose: MongooseCache | undefined;
}

// Use or initialize global mongoose cache
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export default async function connectDB(): Promise<Mongoose | null> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    cached.promise = mongoose.connect(process.env.MONGODB_URI).then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    cached.conn = null;
  }

  return cached.conn;
}
