import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

export const connectDB = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");
};
