import mongoose from 'mongoose';

/**
 * Профессиональная схема для хранения цен на авиабилеты
 * TTL Index автоматически удаляет документы через 7 дней
 * Compound Index обеспечивает быстрый поиск по flight_number и scraped_at
 */
const PriceSchema = new mongoose.Schema({
  flight_number: {
    type: String,
    required: true,
    index: true,
    description: 'Номер рейса (например, DP123)'
  },
  airline: {
    type: String,
    required: true,
    description: 'Название авиакомпании'
  },
  price: {
    type: Number,
    required: true,
    min: 1000,
    max: 100000,
    description: 'Цена билета в рублях'
  },
  departure_date: {
    type: Date,
    required: true,
    index: true,
    description: 'Дата и время вылета'
  },
  origin: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    length: 3,
    description: 'IATA код города вылета (например, MOW)'
  },
  destination: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    length: 3,
    description: 'IATA код города прилета (например, LED)'
  },
  is_with_baggage: {
    type: Boolean,
    default: false,
    description: 'Включен ли багаж в стоимость'
  },
  scraped_at: {
    type: Date,
    default: Date.now,
    expires: '7d',
    index: true,
    description: 'Время парсинга данных (автоудаление через 7 дней)'
  },
  source: {
    type: String,
    required: true,
    enum: ['pobeda.aero', 'aviasales.ru', 'yandex.travel', 'kupibilet.ru'],
    description: 'Источник данных'
  },
  booking_url: {
    type: String,
    description: 'Прямая ссылка на покупку билета'
  }
}, {
  timestamps: true
});

// Compound Index для быстрого поиска по flight_number и scraped_at
PriceSchema.index({ flight_number: 1, scraped_at: -1 });

// Compound Index для поиска по маршруту и дате
PriceSchema.index({ origin: 1, destination: 1, departure_date: 1 });

// Index для поиска по цене (сортировка)
PriceSchema.index({ price: 1 });

// Index для поиска по источнику
PriceSchema.index({ source: 1, scraped_at: -1 });

/**
 * Статический метод для получения средней цены по маршруту
 */
PriceSchema.statics.getAveragePrice = async function(origin, destination, dateRange) {
  const result = await this.aggregate([
    {
      $match: {
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departure_date: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      }
    },
    {
      $group: {
        _id: null,
        averagePrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result[0] || { averagePrice: 0, minPrice: 0, maxPrice: 0, count: 0 };
};

/**
 * Статический метод для получения самых дешевых рейсов
 */
PriceSchema.statics.getCheapestFlights = async function(origin, limit = 10) {
  return this.find({ origin: origin.toUpperCase() })
    .sort({ price: 1, departure_date: 1 })
    .limit(limit)
    .lean();
};

/**
 * Метод экземпляра для валидации цены
 */
PriceSchema.methods.isValidPrice = function() {
  return this.price >= 1000 && this.price <= 100000;
};

const Price = mongoose.model('Price', PriceSchema);

export default Price;
