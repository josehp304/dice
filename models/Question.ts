import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBet {
  userId: mongoose.Types.ObjectId;
  username: string;
  side: 'yes' | 'no';
  amount: number;
  potentialReturn: number;
  odds: number;
  settled: boolean;
  payout: number;
  placedAt: Date;
}

export interface IQuestion extends Document {
  title: string;
  description: string;
  category: string;
  createdBy: mongoose.Types.ObjectId;
  creatorUsername: string;
  status: 'open' | 'closed' | 'resolved';
  outcome: 'yes' | 'no' | null;
  expiresAt: Date;
  totalYesBets: number;
  totalNoBets: number;
  totalYesAmount: number;
  totalNoAmount: number;
  bets: IBet[];
  createdAt: Date;
  updatedAt: Date;
  getYesOdds(): number;
  getNoOdds(): number;
  getYesProbability(): number;
  getNoProbability(): number;
}

const BetSchema = new Schema<IBet>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  side: { type: String, enum: ['yes', 'no'], required: true },
  amount: { type: Number, required: true, min: 1 },
  potentialReturn: { type: Number, required: true },
  odds: { type: Number, required: true },
  settled: { type: Boolean, default: false },
  payout: { type: Number, default: 0 },
  placedAt: { type: Date, default: Date.now },
});

const QuestionSchema = new Schema<IQuestion>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Sports', 'Politics', 'Crypto', 'Entertainment', 'Science', 'Technology', 'Finance', 'Other'],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    creatorUsername: { type: String, required: true },
    status: { type: String, enum: ['open', 'closed', 'resolved'], default: 'open' },
    outcome: { type: String, enum: ['yes', 'no', null], default: null },
    expiresAt: { type: Date, required: true },
    totalYesBets: { type: Number, default: 0 },
    totalNoBets: { type: Number, default: 0 },
    totalYesAmount: { type: Number, default: 0 },
    totalNoAmount: { type: Number, default: 0 },
    bets: [BetSchema],
  },
  { timestamps: true }
);

// Calculate odds using parimutuel system:
// If more money on YES, YES odds are lower (lower payout)
// odds = totalPool / sideAmount (before this bet)
QuestionSchema.methods.getYesProbability = function (): number {
  const total = this.totalYesAmount + this.totalNoAmount;
  if (total === 0) return 0.5;
  return this.totalYesAmount / total;
};

QuestionSchema.methods.getNoProbability = function (): number {
  const total = this.totalYesAmount + this.totalNoAmount;
  if (total === 0) return 0.5;
  return this.totalNoAmount / total;
};

// Returns the multiplier you get for betting on YES (e.g. 1.8x)
// If yes has 80% of money, multiplier = 1 / 0.8 = 1.25
QuestionSchema.methods.getYesOdds = function (): number {
  const total = this.totalYesAmount + this.totalNoAmount;
  if (total === 0 || this.totalYesAmount === 0) return 2.0;
  const prob = this.totalYesAmount / total;
  return Math.max(1.01, (1 / prob) * 0.95); // 5% house edge
};

QuestionSchema.methods.getNoOdds = function (): number {
  const total = this.totalYesAmount + this.totalNoAmount;
  if (total === 0 || this.totalNoAmount === 0) return 2.0;
  const prob = this.totalNoAmount / total;
  return Math.max(1.01, (1 / prob) * 0.95); // 5% house edge
};

const Question: Model<IQuestion> =
  mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
export default Question;
