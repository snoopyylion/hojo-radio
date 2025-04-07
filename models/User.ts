import mongoose, { Document, Schema, Model } from "mongoose";

// Define the TypeScript interface for the User document
export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Create the Mongoose schema
const UserSchema: Schema<IUser> = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    image: { type: String, required: false },
  },
  {
    timestamps: true,
    _id: false, // since you are manually setting _id as a String
  }
);

// Define and export the model
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
