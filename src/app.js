import mongoose from 'mongoose';
import TutuScraper from './scrapers/TutuScraper.js';
import WBScraper from './scrapers/WBScraper.js';
import Flight from './models/Flight.js';
import { addDays, format } from 'date-fns';

const MONGO_URI = 'mongodb://localhost:27017/skyscout';

// Target route: 14 days from today
function getTargetRoute() {
  const departDate = addDays(new Date(), 14);
  const dateStr = format(departDate, 'yyyy-MM-dd');
  
  console.log(`📅 Используем дату: ${dateStr}`);

  return {
    origin: 'MOW',
    destination: 'LED',
    date: dateStr
  };
}

async function main() {
  // Connect to MongoDB
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const route = getTargetRoute();
  const allFlights = [];

  console.log(`\n� Запуск параллельного скрапинга: ${route.origin} → ${route.destination} на ${route.date}`);
  console.log('📊 Источники: Tutu.ru (DOM) + WB Travel (API)');

  // Запускаем оба скрапера параллельно с Promise.allSettled
  const results = await Promise.allSettled([
    new TutuScraper(route.origin, route.destination, route.date).scrape(),
    new WBScraper(route.origin, route.destination, route.date).scrape()
  ]);

  // Обрабатываем результаты
  const tutuFlights = results[0].status === 'fulfilled' ? results[0].value : [];
  const wbFlights = results[1].status === 'fulfilled' ? results[1].value : [];

  console.log(`\n📈 Результаты:`);
  console.log(`   Tutu.ru: ${tutuFlights.length} билетов`);
  console.log(`   WB Travel: ${wbFlights.length} билетов`);

  if (results[0].status === 'rejected') {
    console.error(`   ❌ Tutu.ru ошибка: ${results[0].reason.message}`);
  }
  if (results[1].status === 'rejected') {
    console.error(`   ❌ WB Travel ошибка: ${results[1].reason.message}`);
  }

  allFlights.push(...tutuFlights, ...wbFlights);

  if (allFlights.length > 0) {
    // Save to MongoDB
    await Flight.insertMany(allFlights);
    console.log(`\n✅ Сохранено ${allFlights.length} билетов в MongoDB`);
  } else {
    console.log(`\n⚠️  Не получено ни одного билета`);
  }

  console.log(`\n📊 Итого: ${allFlights.length} билетов`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

main().catch(console.error);
