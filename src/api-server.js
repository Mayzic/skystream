import express from 'express';
import mongoose from 'mongoose';
import Flight from './models/Flight.js';
import cors from 'cors';

const app = express();
const PORT = 3000;
const MONGO_URI = 'mongodb://localhost:27017/skyscout';

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ API Server: Connected to MongoDB'))
  .catch(err => console.error('❌ API Server: MongoDB connection error:', err));

// API: Search flights by route and date
app.get('/api/search', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;
    
    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'Missing required parameters: origin, destination, date' });
    }
    
    const searchDate = new Date(date);
    const nextDay = new Date(searchDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const flights = await Flight.find({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate: {
        $gte: searchDate,
        $lt: nextDay
      }
    }).sort({ price: 1 });
    
    // Преобразуем данные в формат ожидаемый веб-интерфейсом
    const formattedFlights = flights.map(f => ({
      flightNumber: f.flightNumber,
      airline: f.airline,
      price: f.price,
      origin: f.origin,
      destination: f.destination,
      departureDate: f.departureDate.getTime(),
      source: f.source
    }));
    
    res.json({
      origin,
      destination,
      flights: formattedFlights,
      total: formattedFlights.length
    });
  } catch (error) {
    console.error('Error in /api/search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get cheapest flights from origin by date
app.get('/api/cheapest', async (req, res) => {
  try {
    const { origin, date } = req.query;
    
    if (!origin || !date) {
      return res.status(400).json({ error: 'Missing required parameters: origin, date' });
    }
    
    const searchDate = new Date(date);
    const nextDay = new Date(searchDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const flights = await Flight.find({
      origin: origin.toUpperCase(),
      departureDate: {
        $gte: searchDate,
        $lt: nextDay
      }
    }).sort({ price: 1 });
    
    // Группируем по направлениям и берем самый дешевый
    const cheapestByDestination = {};
    flights.forEach(f => {
      const key = f.destination;
      if (!cheapestByDestination[key] || f.price < cheapestByDestination[key].price) {
        cheapestByDestination[key] = f;
      }
    });
    
    const formattedFlights = Object.values(cheapestByDestination).map(f => ({
      flightNumber: f.flightNumber,
      airline: f.airline,
      price: f.price,
      origin: f.origin,
      destination: f.destination,
      departureDate: f.departureDate.getTime(),
      source: f.source
    }));
    
    res.json({
      origin,
      flights: formattedFlights,
      total: formattedFlights.length
    });
  } catch (error) {
    console.error('Error in /api/cheapest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: Get all flights
app.get('/api/flights', async (req, res) => {
  try {
    const flights = await Flight.find().sort({ departureDate: 1 });
    
    const formattedFlights = flights.map(f => ({
      flightNumber: f.flightNumber,
      airline: f.airline,
      price: f.price,
      origin: f.origin,
      destination: f.destination,
      departureDate: f.departureDate.getTime(),
      source: f.source
    }));
    
    res.json({
      flights: formattedFlights,
      total: formattedFlights.length
    });
  } catch (error) {
    console.error('Error in /api/flights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
});
