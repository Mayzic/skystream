import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';

chromium.use(stealthPlugin());

/**
 * Базовый класс для всех парсеров авиабилетов
 * Реализует стелс-режим, защиту от ботов, логирование и обработку ошибок
 */
class BaseFlightScraper extends EventEmitter {
  constructor(sourceName) {
    super();
    this.sourceName = sourceName;
    this.screenshotsDir = path.join(process.cwd(), 'screenshots');
    this.logsDir = path.join(process.cwd(), 'logs');

    // Создаем директории если не существуют
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Ротация User-Agent для стелс-режима
   */
  getRandomUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Случайный размер viewport для имитации разных устройств
   */
  getRandomViewport() {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1440, height: 900 },
      { width: 1536, height: 864 },
      { width: 1280, height: 720 }
    ];
    return viewports[Math.floor(Math.random() * viewports.length)];
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
   * Логирование в файл
   */
  logToFile(message, level = 'info') {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDir, `scraper_${today}.log`);
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${this.sourceName}] ${message}\n`;

    try {
      fs.appendFileSync(logFile, logMessage);
    } catch (error) {
      console.error('Ошибка записи в лог:', error);
    }
  }

  /**
   * Сохранение скриншота при ошибке
   */
  async saveScreenshot(page, error) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(this.screenshotsDir, `${this.sourceName}_error_${timestamp}.png`);

    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      this.logToFile(`Скриншот сохранен: ${screenshotPath}`, 'error');
    } catch (screenshotError) {
      this.logToFile(`Ошибка сохранения скриншота: ${screenshotError.message}`, 'error');
    }
  }

  /**
   * Запуск браузера с полной защитой от ботов
   */
  async launchBrowser() {
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    });

    const context = await browser.newContext({
      userAgent: this.getRandomUserAgent(),
      viewport: this.getRandomViewport(),
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
      permissions: ['geolocation'],
      geolocation: { latitude: 55.7558, longitude: 37.6173 },
      ignoreHTTPSErrors: true
    });

    // Дополнительная защита от детекции
    await context.addInitScript(() => {
      // Скрываем webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });

      // Подменяем плагины
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Подменяем языки
      Object.defineProperty(navigator, 'languages', {
        get: () => ['ru-RU', 'ru', 'en']
      });

      // Подменяем платформу
      Object.defineProperty(navigator, 'platform', {
        get: () => 'MacIntel'
      });

      // Скрываем автоматизацию в Chrome
      window.chrome = {
        runtime: {}
      };

      // Подменяем permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    return { browser, context };
  }

  /**
   * Основной метод получения данных с обработкой ошибок
   */
  async fetchData(url, options = {}) {
    let browser = null;
    let context = null;
    let page = null;

    try {
      this.logToFile(`Запуск парсинга: ${url}`);

      const browserContext = await this.launchBrowser();
      browser = browserContext.browser;
      context = browserContext.context;
      page = await context.newPage();

      // Устанавливаем таймаут
      const timeout = options.timeout || 30000;

      // Human-like поведение
      await this.humanDelay();

      // Переходим на страницу
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: timeout
      });

      await this.humanDelay();
      await this.humanScroll(page);

      // Вызываем метод парсинга (реализуется в наследуемых классах)
      const data = await this.parse(page);

      this.logToFile(`Успешно получено ${data.length} записей`);

      // Эмитируем событие для обработки данных
      this.emit('data_received', data);

      return data;
    } catch (error) {
      this.logToFile(`Ошибка парсинга: ${error.message}`, 'error');

      // Сохраняем скриншот при ошибке
      if (page) {
        await this.saveScreenshot(page, error);
      }

      // Эмитируем событие об ошибке
      this.emit('error', error);

      throw error;
    } finally {
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  /**
   * Абстрактный метод для парсинга (должен быть переопределен)
   */
  async parse(page) {
    throw new Error('Метод parse должен быть переопределен в наследуемом классе');
  }

  /**
   * Метод для генерации URL (должен быть переопределен)
   */
  buildUrl(params) {
    throw new Error('Метод buildUrl должен быть переопределен в наследуемом классе');
  }

  /**
   * Очистка данных (Data Cleaning)
   */
  cleanData(data) {
    return data.filter(item => {
      // Валидация цены
      if (!item.price || item.price < 1000 || item.price > 100000) {
        return false;
      }

      // Валидация обязательных полей
      if (!item.flight_number || !item.airline) {
        return false;
      }

      return true;
    }).map(item => ({
      ...item,
      price: parseInt(item.price),
      flight_number: item.flight_number.trim(),
      airline: item.airline.trim(),
      origin: item.origin?.toUpperCase() || '',
      destination: item.destination?.toUpperCase() || '',
      scraped_at: new Date(),
      source: this.sourceName
    }));
  }
}

export default BaseFlightScraper;
