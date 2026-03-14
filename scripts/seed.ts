import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dicebet';

// Simple embedded schemas for seeding
const UserSchema = new mongoose.Schema({
  username: String, email: String, password: String, balance: { type: Number, default: 1000 }, avatar: String,
}, { timestamps: true });

const BetSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId, username: String, side: String,
  amount: Number, potentialReturn: Number, odds: Number, settled: Boolean, payout: Number, placedAt: Date,
});

const QuestionSchema = new mongoose.Schema({
  title: String, description: String, category: String,
  createdBy: mongoose.Schema.Types.ObjectId, creatorUsername: String,
  status: { type: String, default: 'open' }, outcome: { type: String, default: null },
  expiresAt: Date, totalYesBets: Number, totalNoBets: Number,
  totalYesAmount: Number, totalNoAmount: Number, bets: [BetSchema],
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Question = mongoose.model('Question', QuestionSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Question.deleteMany({});
  console.log('Cleared existing data');

  // Create users
  const hashedPw = await bcrypt.hash('password123', 12);
  const users = await User.insertMany([
    { username: 'alice', email: 'alice@example.com', password: hashedPw, balance: 5000 },
    { username: 'bob', email: 'bob@example.com', password: hashedPw, balance: 2500 },
    { username: 'charlie', email: 'charlie@example.com', password: hashedPw, balance: 1200 },
  ]);
  console.log(`Created ${users.length} users`);

  const future = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  // Create sample questions with bets
  const questions = [
    {
      title: 'Will Bitcoin reach $150,000 before end of 2025?',
      description: 'Bitcoin has been surging. Will it hit $150K this year with the ETF inflows and halving effect?',
      category: 'Crypto',
      createdBy: users[0]._id,
      creatorUsername: 'alice',
      status: 'open',
      expiresAt: future(30),
      totalYesBets: 3, totalNoBets: 2,
      totalYesAmount: 700, totalNoAmount: 200,
      bets: [
        { userId: users[0]._id, username: 'alice', side: 'yes', amount: 300, potentialReturn: 342, odds: 1.14, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[1]._id, username: 'bob', side: 'no', amount: 100, potentialReturn: 450, odds: 4.5, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[2]._id, username: 'charlie', side: 'yes', amount: 200, potentialReturn: 228, odds: 1.14, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[1]._id, username: 'bob', side: 'yes', amount: 200, potentialReturn: 228, odds: 1.14, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[0]._id, username: 'alice', side: 'no', amount: 100, potentialReturn: 450, odds: 4.5, settled: false, payout: 0, placedAt: new Date() },
      ],
    },
    {
      title: 'Will Manchester City win the Premier League 2024/25?',
      description: 'They are currently 3rd in the table. Can they mount a comeback and win the title?',
      category: 'Sports',
      createdBy: users[1]._id,
      creatorUsername: 'bob',
      status: 'open',
      expiresAt: future(45),
      totalYesBets: 2, totalNoBets: 3,
      totalYesAmount: 150, totalNoAmount: 600,
      bets: [
        { userId: users[0]._id, username: 'alice', side: 'yes', amount: 100, potentialReturn: 493, odds: 4.93, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[2]._id, username: 'charlie', side: 'no', amount: 200, potentialReturn: 285, odds: 1.43, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[1]._id, username: 'bob', side: 'no', amount: 200, potentialReturn: 285, odds: 1.43, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[0]._id, username: 'alice', side: 'yes', amount: 50, potentialReturn: 246, odds: 4.93, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[2]._id, username: 'charlie', side: 'no', amount: 200, potentialReturn: 285, odds: 1.43, settled: false, payout: 0, placedAt: new Date() },
      ],
    },
    {
      title: 'Will AI pass a medical board exam with >90% accuracy by July 2025?',
      description: 'GPT-4 already scores well. The question is whether any AI can cross the 90% threshold on an official USMLE test.',
      category: 'Technology',
      createdBy: users[0]._id,
      creatorUsername: 'alice',
      status: 'open',
      expiresAt: future(60),
      totalYesBets: 4, totalNoBets: 1,
      totalYesAmount: 900, totalNoAmount: 100,
      bets: [
        { userId: users[0]._id, username: 'alice', side: 'yes', amount: 300, potentialReturn: 317, odds: 1.06, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[1]._id, username: 'bob', side: 'yes', amount: 200, potentialReturn: 211, odds: 1.06, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[2]._id, username: 'charlie', side: 'no', amount: 100, potentialReturn: 950, odds: 9.5, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[1]._id, username: 'bob', side: 'yes', amount: 250, potentialReturn: 265, odds: 1.06, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[2]._id, username: 'charlie', side: 'yes', amount: 150, potentialReturn: 159, odds: 1.06, settled: false, payout: 0, placedAt: new Date() },
      ],
    },
    {
      title: 'Will Ethereum merge to Proof-of-Stake 2.0 by Q3 2025?',
      description: 'Ethereum has been announcing major upgrades. Will the next big milestone hit this quarter?',
      category: 'Crypto',
      createdBy: users[2]._id,
      creatorUsername: 'charlie',
      status: 'open',
      expiresAt: future(20),
      totalYesBets: 1, totalNoBets: 1,
      totalYesAmount: 250, totalNoAmount: 250,
      bets: [
        { userId: users[0]._id, username: 'alice', side: 'yes', amount: 250, potentialReturn: 475, odds: 1.9, settled: false, payout: 0, placedAt: new Date() },
        { userId: users[1]._id, username: 'bob', side: 'no', amount: 250, potentialReturn: 475, odds: 1.9, settled: false, payout: 0, placedAt: new Date() },
      ],
    },
    {
      title: 'Will the US Fed cut interest rates at least 3 times in 2025?',
      description: 'Fed Chair Powell has hinted at rate cuts. Will they deliver at least 3 cuts this year?',
      category: 'Finance',
      createdBy: users[1]._id,
      creatorUsername: 'bob',
      status: 'open',
      expiresAt: future(90),
      totalYesBets: 0, totalNoBets: 0,
      totalYesAmount: 0, totalNoAmount: 0,
      bets: [],
    },
  ];

  await Question.insertMany(questions);
  console.log(`Created ${questions.length} questions`);

  console.log('\n✅ Seed complete!');
  console.log('👤 Test accounts:');
  console.log('   alice@example.com / password123 (balance: 5000)');
  console.log('   bob@example.com / password123 (balance: 2500)');
  console.log('   charlie@example.com / password123 (balance: 1200)');
  await mongoose.disconnect();
}

seed().catch(console.error);
