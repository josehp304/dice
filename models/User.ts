import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IPortfolioItem {
  symbol: string;
  shares: number;
  averagePrice: number;
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  balance: number;
  portfolio: IPortfolioItem[];
  avatar: string;
  createdAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    balance: { type: Number, default: 1000 },
    portfolio: [
      {
        symbol: { type: String, required: true },
        shares: { type: Number, required: true },
        averagePrice: { type: Number, required: true },
      },
    ],
    avatar: { type: String, default: '' },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return ;
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
export default User;
