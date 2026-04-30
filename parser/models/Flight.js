import mongoose from 'mongoose';

/**
 * Flight модель с автоудалением через 7 дней
 * Реальный парсер сохраняет данные в эту схему
 */
const flightSchema = new mongoose.Schema({
  origin: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true,
    length: 3
  },
  destination: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true,
    length: 3
  },
  price: { 
    type: Number, 
    required: true,
    min: 1000,
    max: 100000
  },
  airline: {
    type: String,
    required: true
  },
  departureDate: {
    type: Date,
    required: true
  },
  source: { 
    type: String, 
    default: 'manual',
    enum: ['kupibilet.ru', 'aviasales.ru', 'yandex.travel', 'pobeda.aero', 'manual']
  },
  // Поле для автоудаления: документ исчезнет из базы через 7 дней после создания
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: '7d' 
  }
}, {
  timestamps: true
});

// Индекс для быстрого поиска по городам и цене
flightSchema.index({ origin: 1, destination: 1, price: 1 });

// Индекс для поиска по дате вылета
flightSchema.index({ departureDate: 1 });

// Индекс для поиска по источнику
flightSchema.index({ source: 1 });

const Flight = mongoose.model('Flight', flightSchema);

export default Flight;
