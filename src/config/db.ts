import mongoose from "mongoose";

export async function connectDB(uri: string) {
  if (!uri) throw new Error("MongoDB URI is required");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
  });
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
