import BaseScraper from './BaseScraper.js';

export default class TutuScraper extends BaseScraper {
  constructor(origin, destination, dateStr) {
    super();
    this.origin = origin;
    this.destination = destination;
    this.dateStr = dateStr;
    this.results = [];
    
    // Маппинг IATA кодов на названия городов транслитом для tutu.ru
    this.cityNames = {
      'MOW': 'Moskva',
      'LED': 'Sankt-Peterburg',
      'AER': 'Sochi',
      'KZN': 'Kazan',
      'SVX': 'Ekaterinburg',
      'OVB': 'Novosibirsk',
      'KRR': 'Krasnodar',
      'SIP': 'Simferopol',
      'KGD': 'Kaliningrad',
      'GOJ': 'Nizhnii-Novgorod',
      'MRV': 'Mineralnye-Vody',
      'ROV': 'Rostov-na-Donu',
      'UFA': 'Ufa',
      'VOG': 'Volgograd',
      'PEE': 'Perm',
      'KJA': 'Krasnoyarsk',
      'IKT': 'Irkutsk',
      'VVO': 'Vladivostok',
      'KHV': 'Khabarovsk'
    };
  }

  async scrape() {
    const page = await this.launch();
    try {
      console.log(`🔍 Скрапинг avia.tutu.ru: ${this.origin} → ${this.destination} на ${this.dateStr}`);
      
      // Формируем URL в формате tutu.ru: https://avia.tutu.ru/f/{from}/{to}/?departure={date}&adults=1&children=0&infants=0&klass=economy
      const originCity = this.cityNames[this.origin] || this.origin;
      const destCity = this.cityNames[this.destination] || this.destination;
      const url = `https://avia.tutu.ru/f/${originCity}/${destCity}/?departure=${this.dateStr}&adults=1&children=0&infants=0&klass=economy`;
      console.log(`🔗 URL: ${url}`);
      
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      console.log('⏳ Страница загружена. Ждем 10 секунд для прогрузки React...');
      await page.waitForTimeout(10000);
      
      this.results = await this.parseDOM(page);
      console.log(`✅ Tutu: Получено ${this.results.length} билетов через DOM`);
      
      return this.results;
    } finally {
      await this.close();
    }
  }

  async parseDOM(page) {
    try {
      // Ждем появления элементов с ценами (на основе примера с tutu.ru)
      await page.waitForSelector('[class*="price"], [data-test="price"], span[data-test="price"]', { timeout: 15000 });
      
      const flights = await page.$$eval('[class*="price"], [data-test="price"], span[data-test="price"]', (elements) => {
        return elements.map(el => {
          // Ищем ближайший родительский элемент с информацией о билете
          const ticketEl = el.closest('.ticket, .flight, .offer, .b-ticket, .ticket-card, .offer-card, [class*="flight"], [class*="offer"]');
          
          const airline = ticketEl?.querySelector('.airline, .carrier, .company, .b-airline, .carrier-name, [class*="airline"], [class*="carrier"]')?.textContent?.trim() || '';
          const priceText = el.textContent?.trim() || '0';
          const price = parseInt(priceText.replace(/\D/g, '')) || 0;
          
          return { airline, price };
        });
      });
      
      return flights.map(f => ({
        airline: f.airline,
        price: f.price,
        origin: this.origin,
        destination: this.destination,
        departureDate: new Date(this.dateStr),
        source: 'Tutu'
      })).filter(f => f.price > 0);
    } catch (error) {
      console.error('❌ Ошибка при парсинге DOM Tutu:', error.message);
      return [];
    }
  }
}
