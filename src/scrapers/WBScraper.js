import BaseScraper from './BaseScraper.js';

export default class WBScraper extends BaseScraper {
  constructor(origin, destination, dateStr) {
    super();
    this.origin = origin;
    this.destination = destination;
    this.dateStr = dateStr;
    this.results = [];
  }

  async scrape() {
    const page = await this.launch();
    try {
      console.log(`🔍 Скрапинг WB Travel: ${this.origin} → ${this.destination} на ${this.dateStr}`);
      
      // Переходим на главную страницу
      await page.goto('https://vmeste.wildberries.ru/avia', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      
      // Заполняем форму поиска
      await this.fillSearchForm(page);
      
      // Ждем загрузки результатов
      await page.waitForTimeout(10000);
      
      // Пытаемся получить данные через API или DOM
      const apiData = await this.interceptAPI(page);
      
      if (apiData.length > 0) {
        this.results = apiData;
        console.log(`✅ WB: Получено ${apiData.length} билетов через API`);
      } else {
        console.log(`⚠️ WB: API не вернул данных, пробуем DOM парсинг`);
        this.results = await this.parseDOM(page);
      }
      
      return this.results;
    } finally {
      await this.close();
    }
  }

  async fillSearchForm(page) {
    try {
      // Заполняем поле "Откуда"
      await page.fill('input[placeholder*="Откуда"], input[name*="from"], input[data-testid*="from"]', this.origin);
      await page.waitForTimeout(1000);
      
      // Заполняем поле "Куда"
      await page.fill('input[placeholder*="Куда"], input[name*="to"], input[data-testid*="to"]', this.destination);
      await page.waitForTimeout(1000);
      
      // Заполняем дату
      await page.fill('input[type="date"], input[placeholder*="дата"], input[data-testid*="date"]', this.dateStr);
      await page.waitForTimeout(1000);
      
      // Кликаем кнопку поиска
      await page.click('button[type="submit"], button.search-button, button[data-testid*="search"]');
      console.log('✅ Форма WB заполнена и отправлена');
    } catch (error) {
      console.error('❌ Ошибка при заполнении формы WB:', error.message);
    }
  }

  async interceptAPI(page) {
    return new Promise((resolve) => {
      let settled = false;
      const potentialResults = [];

      const handler = async (response) => {
        if (settled) return;
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';

        // Ищем JSON API ответы с данными о билетах
        if (contentType.includes('application/json') && (url.includes('/api/') || url.includes('/flight'))) {
          try {
            const json = await response.json();
            const extracted = this.extractFromJSON(json);
            if (extracted.length > 0) {
              potentialResults.push(...extracted);
              if (!settled) {
                settled = true;
                setTimeout(() => resolve(potentialResults), 2000);
              }
            }
          } catch (_) {
            // не JSON или не релевантно
          }
        }
      };

      page.on('response', handler);

      // Navigate to WB Travel search page
      const url = `https://vmeste.wildberries.ru/avia/search?from=${this.origin}&to=${this.destination}&date=${this.dateStr}`;
      console.log(`🔗 WB URL: ${url}`);
      page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});

      // Timeout - если ничего не перехватили за 25 секунд
      setTimeout(() => {
        if (!settled) {
          settled = true;
          page.off('response', handler);
          resolve(potentialResults);
        }
      }, 25000);
    });
  }

  extractFromJSON(json) {
    // WB Travel может возвращать данные в разных форматах
    // Проверяем несколько возможных структур
    const tickets = json?.data?.tickets || json?.tickets || json?.flights || json?.offers || [];
    if (!Array.isArray(tickets)) return [];

    return tickets.map((ticket, index) => ({
      airline: ticket.airline || ticket.carrier || ticket.carrierName || ticket.company || 'Unknown Airline',
      flightNumber: ticket.flightNumber || ticket.flightCode || ticket.number || ticket.flightId || `WB-${index}`,
      price: this.parsePrice(ticket.price || ticket.cost || ticket.amount),
      origin: this.origin,
      destination: this.destination,
      departureDate: new Date(this.dateStr),
      source: 'WB'
    })).filter(t => t.price > 0);
  }

  async parseDOM(page) {
    try {
      await page.waitForTimeout(10000);
      
      const flights = await page.$$eval('.ticket, .flight, .offer, .card', (elements) => {
        return elements.map(el => {
          const airline = el.querySelector('.airline, .carrier, .company')?.textContent?.trim() || '';
          const priceText = el.querySelector('.price, .cost, .amount')?.textContent?.trim() || '0';
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
        source: 'WB'
      })).filter(f => f.price > 0);
    } catch (error) {
      console.error('❌ Ошибка при DOM парсинге WB:', error.message);
      return [];
    }
  }

  parsePrice(raw) {
    if (typeof raw === 'number') return Math.round(raw);
    if (!raw) return 0;
    const cleaned = raw.replace(/[^\d]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }
}
