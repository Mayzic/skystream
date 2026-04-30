import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import protobuf from 'protobufjs';
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import TravelpayoutsAPI from './services/TravelpayoutsAPI.js';
import YandexTravelAPI from './services/YandexTravelAPI.js';
import TutuAPI from './services/TutuAPI.js';
import OzonTravelAPI from './services/OzonTravelAPI.js';
import OneTwoTripAPI from './services/OneTwoTripAPI.js';
import { isRussianCity } from './utils/russianCities.js';

chromium.use(stealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/skystream';

app.use(cors());
app.use(express.json());

// Настройка логирования в файлы
const LOGS_DIR = '/app/logs';
const DATA_DIR = '/app/data';

// Создаем директории если не существуют
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Функция логирования в файл с датой
function logToFile(message, type = 'info') {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0];
  const logFileName = `${LOGS_DIR}/parser_${dateStr}.log`;

  const logMessage = `[${timeStr}] [${type.toUpperCase()}] ${message}\n`;
  fs.appendFileSync(logFileName, logMessage, 'utf8');
  console.log(message);
}

// Очистка старых логов (оставляем только сегодня и вчера)
function cleanupOldLogs() {
  try {
    const files = fs.readdirSync(LOGS_DIR);
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    files.forEach(file => {
      if (file.startsWith('parser_') && file.endsWith('.log')) {
        const filePath = path.join(LOGS_DIR, file);
        const stats = fs.statSync(filePath);
        const fileDate = new Date(stats.mtime);

        // Удаляем файлы старше 2 дней
        if (fileDate < twoDaysAgo) {
          fs.unlinkSync(filePath);
          logToFile(`Удален старый лог файл: ${file}`, 'cleanup');
        }
      }
    });
  } catch (error) {
    console.error('Ошибка при очистке логов:', error);
  }
}

// Очистка старых данных (оставляем только 3 дня и сегодня)
function cleanupOldData() {
  try {
    const files = fs.readdirSync(DATA_DIR);
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(DATA_DIR, file);
        const stats = fs.statSync(filePath);
        const fileDate = new Date(stats.mtime);

        // Удаляем файлы старше 3 дней
        if (fileDate < threeDaysAgo) {
          fs.unlinkSync(filePath);
          logToFile(`Удален старый файл данных: ${file}`, 'cleanup');
        }
      }
    });
  } catch (error) {
    console.error('Ошибка при очистке данных:', error);
  }
}

// Загрузка Protobuf схемы
let protoType;
async function loadProtoSchema() {
  const root = await protobuf.load('/app/proto/flight.proto');
  protoType = root.lookupType('skystream.FlightData');
}

// Проверка и очистка MongoDB при достижении лимита 10 ГБ
async function checkAndCleanupMongoDB() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db('skystream');
    const stats = await db.command({ dbStats: 1, scale: 1024 * 1024 }); // в МБ

    const dbSizeMB = stats.dataSize;
    const dbSizeGB = dbSizeMB / 1024;

    logToFile(`Размер базы данных: ${dbSizeGB.toFixed(2)} ГБ`);

    // Если размер превышает 8 ГБ (с запасом до 10 ГБ), удаляем старые данные
    if (dbSizeGB > 8) {
      logToFile('Превышен лимит базы данных. Удаляем старые данные...');

      const collection = db.collection('flights');

      // Удаляем данные старше 7 дней
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const timestamp = sevenDaysAgo.getTime();

      const result = await collection.deleteMany({
        collected_at: { $lt: timestamp }
      });

      logToFile(`Удалено ${result.deletedCount} старых записей`);

      // Проверяем размер после очистки
      const newStats = await db.command({ dbStats: 1, scale: 1024 * 1024 });
      const newSizeGB = newStats.dataSize / 1024;
      logToFile(`Новый размер базы данных: ${newSizeGB.toFixed(2)} ГБ`);
    }
  } catch (error) {
    logToFile(`Ошибка при проверке размера базы: ${error.message}`, 'error');
  } finally {
    await client.close();
  }
}

// Сохранение цен в отдельный файл для диаграмм
async function savePricesToFile(flights) {
  const prices = flights.map(f => ({
    price: f.price,
    source: f.source,
    departure_date: f.departure_date,
    timestamp: Date.now()
  }));

  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const filePath = `${DATA_DIR}/prices_${dateStr}.json`;

  try {
    // Читаем существующие данные за сегодня
    let existingPrices = [];
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      existingPrices = JSON.parse(data);
    }

    // Добавляем новые цены
    const allPrices = [...existingPrices, ...prices];

    // Сохраняем
    fs.writeFileSync(filePath, JSON.stringify(allPrices, null, 2));
    logToFile(`Сохранено ${prices.length} цен в файл ${filePath}. Всего: ${allPrices.length}`);
  } catch (error) {
    logToFile(`Ошибка при сохранении цен в файл: ${error.message}`, 'error');
  }
}

// Сохранение данных из MongoDB в JSON файл
async function saveMongoDataToFile(flights, origin, destination) {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const filePath = `${DATA_DIR}/flights_${dateStr}.json`;

  try {
    // Читаем существующие данные за сегодня
    let existingFlights = [];
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      existingFlights = JSON.parse(data);
    }

    // Добавляем новые рейсы
    const allFlights = [...existingFlights, ...flights];

    // Сохраняем
    fs.writeFileSync(filePath, JSON.stringify(allFlights, null, 2));
    logToFile(`Сохранено ${flights.length} рейсов в файл ${filePath}. Всего: ${allFlights.length}`);
  } catch (error) {
    logToFile(`Ошибка при сохранении рейсов в файл: ${error.message}`, 'error');
  }
}

// Расчет и сохранение средних цен по направлениям
async function saveAveragePrices(flights) {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const filePath = `${DATA_DIR}/average_prices_${dateStr}.json`;

  try {
    // Группируем по направлениям
    const routes = {};
    flights.forEach(f => {
      const route = `${f.origin || 'unknown'} → ${f.destination || 'unknown'}`;
      if (!routes[route]) {
        routes[route] = [];
      }
      routes[route].push(f.price);
    });

    // Рассчитываем средние цены
    const averagePrices = {};
    Object.keys(routes).forEach(route => {
      const prices = routes[route];
      const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      averagePrices[route] = {
        average: Math.round(avg),
        min: min,
        max: max,
        count: prices.length
      };
    });

    // Сохраняем
    fs.writeFileSync(filePath, JSON.stringify(averagePrices, null, 2));
    logToFile(`Сохранены средние цены по ${Object.keys(averagePrices).length} направлениям в файл ${filePath}`);
  } catch (error) {
    logToFile(`Ошибка при сохранении средних цен: ${error.message}`, 'error');
  }
}

// Парсинг с поиском на выбранную дату + 3 дня вперед (оптимизация скорости)
// Временно отключен - реальный парсинг теперь через app.js
async function parseFlightsWithDateRange(origin, destination, startDate, days = 3) {
  logToFile('parseFlightsWithDateRange временно отключен. Используйте app.js для реального парсинга.');
  return [];
}

// API endpoint для поиска билетов
app.get('/api/search', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;

    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'Missing required parameters: origin, destination, date' });
    }

    const searchDate = new Date(date);
    const dateStr = searchDate.toISOString().split('T')[0];

    logToFile(`Поиск билетов: ${origin} → ${destination} с ${dateStr}`);

    // Проверяем, что оба города российские
    if (!isRussianCity(origin) || !isRussianCity(destination)) {
      return res.status(400).json({ error: 'Поиск доступен только для российских городов' });
    }

    // Проверяем размер базы данных перед парсингом
    await checkAndCleanupMongoDB();

    // Очищаем старые логи и данные
    cleanupOldLogs();
    cleanupOldData();

    let allFlights = [];
    const sources = [];

    // Параллельное получение данных из всех источников
    logToFile('Параллельный запрос ко всем источникам данных...');
    
    const [travelpayoutsFlights, yandexFlights, tutuFlights, ozonFlights, onetwotripFlights] = await Promise.allSettled([
      TravelpayoutsAPI.getPricesForDate(origin, destination, dateStr),
      YandexTravelAPI.getPricesForDate(origin, destination, dateStr),
      TutuAPI.getPricesForDate(origin, destination, dateStr),
      OzonTravelAPI.getPricesForDate(origin, destination, dateStr),
      OneTwoTripAPI.getPricesForDate(origin, destination, dateStr)
    ]);

    // Обработка результатов от каждого источника
    if (travelpayoutsFlights.status === 'fulfilled' && travelpayoutsFlights.value.length > 0) {
      logToFile(`Travelpayouts API: ${travelpayoutsFlights.value.length} рейсов`);
      allFlights.push(...travelpayoutsFlights.value);
      sources.push('travelpayouts_api');
    }

    if (yandexFlights.status === 'fulfilled' && yandexFlights.value.length > 0) {
      logToFile(`Yandex Travel API: ${yandexFlights.value.length} рейсов`);
      allFlights.push(...yandexFlights.value);
      sources.push('yandex_travel_api');
    }

    if (tutuFlights.status === 'fulfilled' && tutuFlights.value.length > 0) {
      logToFile(`Tutu API: ${tutuFlights.value.length} рейсов`);
      allFlights.push(...tutuFlights.value);
      sources.push('tutu_api');
    }

    if (ozonFlights.status === 'fulfilled' && ozonFlights.value.length > 0) {
      logToFile(`Ozon Travel API: ${ozonFlights.value.length} рейсов`);
      allFlights.push(...ozonFlights.value);
      sources.push('ozon_travel_api');
    }

    if (onetwotripFlights.status === 'fulfilled' && onetwotripFlights.value.length > 0) {
      logToFile(`OneTwoTrip API: ${onetwotripFlights.value.length} рейсов`);
      allFlights.push(...onetwotripFlights.value);
      sources.push('onetwotrip_api');
    }

    // Fallback: веб-скрапинг если API не вернули данных
    if (allFlights.length === 0) {
      logToFile('API не вернули данных, используем fallback на веб-скрапинг');
      allFlights = await parseFlightsWithDateRange(origin, destination, searchDate, 3);
      sources.push('web_scraping');
    }

    if (allFlights.length === 0) {
      return res.status(404).json({ error: 'Билеты не найдены' });
    }

    // Удаляем дубликаты по цене и авиакомпании
    const uniqueFlights = allFlights.filter((flight, index, self) =>
      index === self.findIndex(f => 
        f.price === flight.price && 
        f.airline === flight.airline &&
        f.departureDate.getTime() === flight.departureDate.getTime()
      )
    );

    logToFile(`Всего найдено: ${uniqueFlights.length} уникальных рейсов из ${sources.length} источников`);

    // Сохраняем данные в MongoDB
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db('skystream');
    const collection = db.collection('raw_prices');

    for (const flight of uniqueFlights) {
      await collection.insertOne({
        ...flight,
        scraped_at: new Date()
      });
    }

    await client.close();

    // Сохраняем данные в файлы
    await saveMongoDataToFile(uniqueFlights, origin, destination);
    await savePricesToFile(uniqueFlights);

    // Добавляем origin и destination для расчета средних цен
    const flightsWithRoute = uniqueFlights.map(f => ({
      ...f,
      origin: origin,
      destination: destination
    }));
    await saveAveragePrices(flightsWithRoute);

    res.json({
      origin,
      destination,
      flights: uniqueFlights,
      total: uniqueFlights.length,
      sources: sources,
      sourcesCount: sources.length
    });
  } catch (error) {
    console.error('Ошибка поиска:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint для истории цен
app.get('/api/price-history', async (req, res) => {
  try {
    const { origin, destination, days } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: 'Missing required parameters: origin, destination' });
    }

    const daysLimit = parseInt(days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysLimit);

    logToFile(`Получение истории цен: ${origin} → ${destination} за ${daysLimit} дней`);

    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db('skystream');
    const collection = db.collection('raw_prices');

    const history = await collection.find({
      origin: origin,
      destination: destination,
      scraped_at: { $gte: startDate }
    }).sort({ scraped_at: -1 }).toArray();

    await client.close();

    // Группируем по датам
    const groupedByDate = {};
    history.forEach(flight => {
      const date = new Date(flight.scraped_at).toISOString().split('T')[0];
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(flight);
    });

    // Вычисляем статистику для каждой даты
    const stats = Object.keys(groupedByDate).map(date => {
      const flights = groupedByDate[date];
      const prices = flights.map(f => f.price);
      return {
        date,
        count: flights.length,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        sources: [...new Set(flights.map(f => f.source))]
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      origin,
      destination,
      days: daysLimit,
      history: stats,
      totalRecords: history.length
    });
  } catch (error) {
    console.error('Ошибка получения истории цен:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint для поиска дешевых билетов по всем направлениям ("Мне куда угодно")
app.get('/api/cheapest', async (req, res) => {
  try {
    const { origin, date } = req.query;

    if (!origin || !date) {
      return res.status(400).json({ error: 'Missing required parameters: origin, date' });
    }

    const searchDate = new Date(date);

    logToFile(`Поиск дешевых билетов из ${origin} с ${searchDate.toISOString().split('T')[0]}`);

    // Проверяем размер базы данных перед парсингом
    await checkAndCleanupMongoDB();

    // Очищаем старые логи и данные
    cleanupOldLogs();
    cleanupOldData();

    // Популярные направления для парсинга (уменьшено для скорости)
    const destinations = ['LED', 'KZN', 'AER', 'SVX', 'KRR'];
    const allFlights = [];

    // Парсим все направления параллельно (только выбранный день)
    const flightPromises = destinations.map(dest =>
      parseFlightsWithDateRange(origin, dest, searchDate, 1)
    );

    const results = await Promise.all(flightPromises);

    // Собираем все рейсы
    results.forEach((flights, index) => {
      flights.forEach(flight => {
        allFlights.push({
          ...flight,
          destination: destinations[index]
        });
      });
    });

    if (allFlights.length === 0) {
      return res.status(404).json({ error: 'Билеты не найдены' });
    }

    // Сортируем по цене (от дешевых к дорогим)
    allFlights.sort((a, b) => a.price - b.price);

    // Берем топ-20 самых дешевых
    const cheapestFlights = allFlights.slice(0, 20);

    // Сохраняем данные в файлы
    await saveMongoDataToFile(cheapestFlights, origin, 'multiple');
    await savePricesToFile(cheapestFlights);

    // Добавляем origin для расчета средних цен
    const flightsWithOrigin = cheapestFlights.map(f => ({
      ...f,
      origin: origin
    }));
    await saveAveragePrices(flightsWithOrigin);

    res.json({
      origin,
      flights: cheapestFlights,
      total: cheapestFlights.length
    });
  } catch (error) {
    console.error('Ошибка поиска дешевых билетов:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Запуск сервера
async function start() {
  await loadProtoSchema();
  app.listen(PORT, () => {
    console.log(`Parser API running on port ${PORT}`);
  });
}

start().catch(console.error);
