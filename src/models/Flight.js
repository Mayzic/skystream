import mongoose from 'mongoose';

const flightSchema = new mongoose.Schema({
  flightNumber: { type: String, default: 'Unknown' },
  airline: { type: String, default: 'Unknown Airline' },
  price: { type: Number, required: true },               // integer roubles
  origin: { type: String, required: true },
  destination: { type: String, required: true },
  departureDate: { type: Date, required: true },
  source: { type: String, required: true, default: 'kupibilet' },
  createdAt: { type: Date, default: Date.now, expires: '7d' }  // TTL index
});

// The 'expires' option automatically creates a TTL index.
export default mongoose.model('Flight', flightSchema);
