import mongoose from 'mongoose';
import scrapeKupibilet from './services/Scraper.js';

async function main() {
  // Подключаемся к MongoDB (Docker или локал)
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/skystream';
  
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Запускаем парсинг популярных направлений
  const destinations = ['LED', 'AER', 'KZN', 'OVB']; // Питер, Сочи, Казань, Новосибирск
  const date = '2026-05-15';
  
  for (const dest of destinations) {
    console.log(`Starting parse for MOW -> ${dest}`);
    try {
      const saved = await scrapeKupibilet('MOW', dest, date);
      console.log(`Saved ${saved} tickets for MOW -> ${dest}`);
    } catch (error) {
      console.error(`Failed to parse MOW -> ${dest}:`, error.message);
    }
    // Пауза 5 секунд между городами, чтобы не забанили
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log('All tasks finished!');
  
  // Показываем статистику из БД
  const totalFlights = await mongoose.connection.db.collection('flights').countDocuments();
  console.log(`Total flights in database: ${totalFlights}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
