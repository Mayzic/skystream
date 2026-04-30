const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Ротация User-Agent для стелс-режима
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
];

/**
 * Базовый класс парсера (Strategy Pattern)
 * Содержит общую логику для всех парсеров: запуск браузера, логирование, защита от ботов
 */
class BaseParser {
  constructor(sourceName) {
    this.sourceName = sourceName;
    this.logsDir = path.join(__dirname, '../../logs');
  }

  /**
   * Логирование в файл
   */
  logToFile(message, level = 'info') {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `parser_${today}.log`);
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    try {
      fs.appendFileSync(logFile, logMessage);
    } catch (error) {
      console.error('Ошибка записи в лог:', error);
    }
  }

  /**
   * Получить случайный User-Agent
   */
  getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  /**
   * Human-like задержка (2-4 секунды)
   */
  async humanDelay() {
    const delay = Math.random() * 2000 + 2000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Имитация скролла страницы
   */
  async humanScroll(page) {
    await page.evaluate(() => {
      window.scrollBy(0, Math.random() * 500 + 200);
    });
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  }

  /**
   * Запуск браузера с защитой от ботов
   */
  async launchBrowser() {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
      permissions: ['geolocation'],
      geolocation: { latitude: 55.7558, longitude: 37.6173 }
    });

    // Скрываем признаки автоматизации
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['ru-RU', 'ru', 'en'] });
    });

    return { browser, context };
  }

  /**
   * Очистка данных (Data Cleaning)
   * Нормализация цен, валидация, унификация дат
   */
  cleanData(flights) {
    return flights.filter(flight => {
      // Валидация цены
      if (!flight.price || flight.price < 1000 || flight.price > 100000) {
        return false;
      }

      // Валидация названия рейса
      if (!flight.flight_name || flight.flight_name.trim() === '') {
        flight.flight_name = 'Рейс';
      }

      return true;
    }).map(flight => ({
      ...flight,
      price: parseInt(flight.price),
      flight_name: flight.flight_name.trim(),
      source: this.sourceName
    }));
  }

  /**
   * Абстрактный метод для парсинга (должен быть переопределен в наследниках)
   */
  async parse(origin, destination, date) {
    throw new Error('Метод parse должен быть переопределен в наследуемом классе');
  }

  /**
   * Основной метод запуска парсинга с защитой от ботов и очисткой данных
   */
  async execute(origin, destination, date) {
    let browser = null;
    let context = null;

    try {
      this.logToFile(`Запуск парсера ${this.sourceName} для ${origin} → ${destination} на ${date.toISOString().split('T')[0]}`);

      const browserContext = await this.launchBrowser();
      browser = browserContext.browser;
      context = browserContext.context;

      const page = await context.newPage();

      // Human-like поведение
      await this.humanDelay();
      await this.humanScroll(page);

      // Парсинг (реализуется в наследуемых классах)
      const flights = await this.parse(origin, destination, date, page);

      // Очистка данных
      const cleanedFlights = this.cleanData(flights);

      this.logToFile(`${this.sourceName}: найдено ${cleanedFlights.length} рейсов после очистки`);

      return cleanedFlights;
    } catch (error) {
      this.logToFile(`Ошибка парсера ${this.sourceName}: ${error.message}`, 'error');
      return [];
    } finally {
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }
}

module.exports = BaseParser;
