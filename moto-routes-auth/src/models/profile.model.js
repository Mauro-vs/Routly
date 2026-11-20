import mongoose from "mongoose";

// Solo para crear el perfil vacío en el registro: todo usuario tiene uno (lo gestiona la API)
const profileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, autoIndex: false }
);

export const Profile = mongoose.model("Profile", profileSchema);
