import BaseScraper from './BaseScraper.js';
import fs from 'fs';

export default class KupibiletScraper extends BaseScraper {
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
      console.log(`🔍 Скрапинг avia.tutu.ru: ${this.origin} → ${this.destination} на ${this.dateStr}`);
      
      // Tutu использует search endpoint
      const url = `https://avia.tutu.ru/search/?from=${this.origin}&to=${this.destination}&date=${this.dateStr}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(10000);
      
      this.results = await this.parseDOM(page);
      
      if (this.results.length === 0) {
        await this.autoHeal(page);
      }
      
      return this.cleanResults(this.results);
    } finally {
      await this.close();
    }
  }

  async parseDOM(page) {
    try {
      await page.waitForSelector('.ticket, .flight, .offer, .b-ticket', { timeout: 15000 });
      
      const flights = await page.$$eval('.ticket, .flight, .offer, .b-ticket', (elements) => {
        return elements.map(el => {
          const airline = el.querySelector('.airline, .carrier, .company, .b-airline')?.textContent?.trim() || '';
          const priceText = el.querySelector('.price, .cost, .amount, .b-price')?.textContent?.trim() || '0';
          const price = parseInt(priceText.replace(/\D/g, '')) || 0;
          const flightNumber = el.querySelector('.flight-number, .number, .b-flight-number')?.textContent?.trim() || 'N/A';
          
          return { airline, price, flightNumber };
        });
      });
      
      return flights.map(f => ({
        flightNumber: f.flightNumber,
        airline: f.airline,
        price: f.price,
        origin: this.origin,
        destination: this.destination,
        departureDate: new Date(this.dateStr),
        source: 'tutu'
      })).filter(f => f.price > 0);
    } catch (error) {
      console.error('❌ Ошибка при парсинге DOM:', error.message);
      return [];
    }
  }

  async autoHeal(page) {
    const timestamp = Date.now();
    await page.screenshot({ path: `debug-${timestamp}.png`, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(`debug-${timestamp}.html`, html);
    console.error(`❌ Нет результатов. Скриншот и HTML сохранены как debug-${timestamp}.*`);
  }

  cleanResults(results) {
    return results.filter(r => r.price > 0 && r.airline);
  }
}
