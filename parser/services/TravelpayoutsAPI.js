/**
 * Travelpayouts API Service
 * Надежный источник данных через API вместо веб-скрапинга
 * Primary source для получения цен на авиабилеты
 */

import { isRussianCity } from '../utils/russianCities.js';

const TRAVELPAYOUTS_TOKEN = process.env.TRAVELPAYOUTS_TOKEN || 'your_token_here';
const API_BASE = 'https://api.travelpayouts.com/aviasales/v3';

/**
 * Получить цены на конкретную дату
 * @param {string} origin - IATA код города вылета (например, MOW)
 * @param {string} destination - IATA код города прилета (например, LED)
 * @param {string} date - Дата вылета в формате YYYY-MM-DD
 * @returns {Promise<Array>} Массив найденных рейсов
 */
async function getPricesForDate(origin, destination, date) {
  try {
    // Проверяем, что оба города российские
    if (!isRussianCity(origin) || !isRussianCity(destination)) {
      console.log(`Пропуск: ${origin} → ${destination} (не российские города)`);
      return [];
    }

    const url = `${API_BASE}/prices_for_dates?currency=rub&origin=${origin}&destination=${destination}&departure_at=${date}&token=${TRAVELPAYOUTS_TOKEN}`;
    
    const response = await fetch(url);
    
    if (response.status !== 200) {
      console.error(`Travelpayouts API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return [];
    }
    
    // Конвертируем данные в формат Flight модели
    return data.data.map(flight => ({
      origin: flight.origin,
      destination: flight.destination,
      price: flight.price,
      airline: flight.airline || 'Unknown',
      departureDate: new Date(flight.departure_at),
      source: 'travelpayouts_api',
      flightNumber: flight.flight_number || null,
      bookingUrl: `https://www.aviasales.ru/search?marker=${TRAVELPAYOUTS_TOKEN}&currency=rub&origin=${origin}&destination=${destination}&departure_at=${date}`
    }));
    
  } catch (error) {
    console.error('Travelpayouts API request failed:', error.message);
    return [];
  }
}

/**
 * Получить цены для диапазона дат
 * @param {string} origin - IATA код города вылета
 * @param {string} destination - IATA код города прилета
 * @param {string} startDate - Начальная дата YYYY-MM-DD
 * @param {string} endDate - Конечная дата YYYY-MM-DD
 * @returns {Promise<Array>} Массив всех найденных рейсов
 */
async function getPricesForDateRange(origin, destination, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const allFlights = [];
  
  for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
    const dateStr = date.toISOString().split('T')[0];
    const flights = await getPricesForDate(origin, destination, dateStr);
    allFlights.push(...flights);
    
    // Небольшая задержка между запросами для избежания rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return allFlights;
}

/**
 * Получить самые дешевые билеты по направлению
 * @param {string} origin - IATA код города вылета
 * @param {string} destination - IATA код города прилета
 * @param {number} limit - Количество результатов
 * @returns {Promise<Array>} Массив самых дешевых рейсов
 */
async function getCheapestFlights(origin, destination, limit = 10) {
  try {
    const url = `${API_BASE}/prices_for_dates?currency=rub&origin=${origin}&destination=${destination}&token=${TRAVELPAYOUTS_TOKEN}`;
    
    const response = await fetch(url);
    
    if (response.status !== 200) {
      console.error(`Travelpayouts API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return [];
    }
    
    // Сортируем по цене и берем limit результатов
    return data.data
      .sort((a, b) => a.price - b.price)
      .slice(0, limit)
      .map(flight => ({
        origin: flight.origin,
        destination: flight.destination,
        price: flight.price,
        airline: flight.airline || 'Unknown',
        departureDate: new Date(flight.departure_at),
        source: 'travelpayouts_api',
        flightNumber: flight.flight_number || null,
        bookingUrl: `https://www.aviasales.ru/search?marker=${TRAVELPAYOUTS_TOKEN}&currency=rub&origin=${origin}&destination=${destination}&departure_at=${flight.departure_at.split('T')[0]}`
      }));
      
  } catch (error) {
    console.error('Travelpayouts API request failed:', error.message);
    return [];
  }
}

/**
 * Получить популярные направления из города
 * @param {string} origin - IATA код города вылета
 * @param {number} limit - Количество направлений
 * @returns {Promise<Array>} Массив популярных направлений
 */
async function getPopularDestinations(origin, limit = 20) {
  try {
    const url = `${API_BASE}/prices_for_dates?currency=rub&origin=${origin}&token=${TRAVELPAYOUTS_TOKEN}`;
    
    const response = await fetch(url);
    
    if (response.status !== 200) {
      console.error(`Travelpayouts API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return [];
    }
    
    // Группируем по направлениям и находим средние цены
    const destinations = {};
    data.data.forEach(flight => {
      if (!destinations[flight.destination]) {
        destinations[flight.destination] = {
          destination: flight.destination,
          prices: [],
          count: 0
        };
      }
      destinations[flight.destination].prices.push(flight.price);
      destinations[flight.destination].count++;
    });
    
    // Сортируем по количеству рейсов и средней цене
    return Object.values(destinations)
      .map(dest => ({
        destination: dest.destination,
        averagePrice: Math.round(dest.prices.reduce((a, b) => a + b, 0) / dest.prices.length),
        flightCount: dest.count
      }))
      .sort((a, b) => a.averagePrice - b.averagePrice)
      .slice(0, limit);
      
  } catch (error) {
    console.error('Travelpayouts API request failed:', error.message);
    return [];
  }
}

export default {
  getPricesForDate,
  getPricesForDateRange,
  getCheapestFlights,
  getPopularDestinations
};
