# SkyStream

Многоисточниковый агрегатор цен на авиабилеты по России.

## 🚀 Возможности

- **Многоисточниковая агрегация**: Сбор данных о рейсах с Tutu.ru и Wildberries Travel одновременно
- **Параллельный скрапинг**: Использование Promise.allSettled для одновременного сбора данных
- **DOM парсинг**: Извлечение цен с Tutu.ru с помощью Playwright и stealth
- **Перехват API**: Перехват JSON ответов от Wildberries Travel
- **Хранение в MongoDB**: Сохранение данных о рейсах с автоматическим TTL (7 дней)
- **Веб-интерфейс**: Дашборд Streamlit для визуализации данных
- **REST API**: Express.js API сервер для доступа к данным

## 📋 Требования

- Node.js 18+
- Python 3.8+
- MongoDB 7.0+
- npm

## 🛠️ Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/Mayzic/skystream.git
cd skystream
```

### 2. Установка зависимостей Node.js

```bash
npm install
```

### 3. Установка зависимостей Python

```bash
pip install -r web/requirements.txt
```

### 4. Установка браузеров Playwright

```bash
npx playwright install chromium
```

### 5. Запуск MongoDB

```bash
# Используя Docker
docker-compose up -d

# Или локально
mongod --dbpath ./data --port 27017
```

## 🎯 Быстрый старт

### Использование скриптов запуска (рекомендуется)

```bash
# Сделать скрипты исполняемыми
chmod +x start.sh stop.sh

# Запустить все сервисы
./start.sh

# Остановить все сервисы
./stop.sh
```

### Ручной запуск

```bash
# Терминал 1: Запуск MongoDB
mongod --dbpath ./data --port 27017

# Терминал 2: Запуск API сервера
npm run api

# Терминал 3: Запуск веб-интерфейса
npm run web

# Терминал 4: Запуск скрапера (опционально)
npm run scrape
```

## 📁 Структура проекта

```
skystream/
├── src/
│   ├── scrapers/
│   │   ├── BaseScraper.js          # Базовый класс скрапера
│   │   ├── TutuScraper.js          # DOM парсер Tutu.ru
│   │   ├── WBScraper.js            # Перехватчик API Wildberries Travel
│   │   └── KupibiletScraper.js     # Устаревший скрапер (deprecated)
│   ├── models/
│   │   └── Flight.js               # Модель Flight для MongoDB
│   ├── app.js                     # Главный агрегатор скраперов
│   └── api-server.js              # Express API сервер
├── web/
│   ├── app.py                     # Дашборд Streamlit
│   ├── requirements.txt           # Зависимости Python
│   └── .streamlit/               # Конфигурация Streamlit
├── parser_py/                     # Python API сервер (legacy)
├── data/                          # Директория данных MongoDB
├── logs/                          # Логи приложения
├── start.sh                       # Скрипт запуска
├── stop.sh                        # Скрипт остановки
├── package.json                   # Зависимости Node.js
├── docker-compose.yml             # Конфигурация Docker
└── README.md                      # Этот файл
```

## 🔌 API Endpoints

### Поиск рейсов по маршруту и дате

```
GET /api/search?origin=MOW&destination=LED&date=2026-05-14
```

Ответ:
```json
{
  "origin": "MOW",
  "destination": "LED",
  "flights": [
    {
      "flightNumber": "WB-0",
      "airline": "Unknown Airline",
      "price": 2879,
      "origin": "MOW",
      "destination": "LED",
      "departureDate": 1778716800000,
      "source": "WB"
    }
  ],
  "total": 128
}
```

### Получение самых дешевых рейсов из города отправления

```
GET /api/cheapest?origin=MOW&date=2026-05-14
```

### Получение всех рейсов

```
GET /api/flights
```

## 🌐 Веб-интерфейс

Доступ к дашборду Streamlit: **http://localhost:8501**

Возможности:
- Поиск рейсов по маршруту и дате
- Поиск самых дешевых рейсов по направлениям
- Просмотр графиков цен и статистики
- Фильтрация по авиакомпании и источнику

## 📊 Источники данных

### Tutu.ru
- **Метод**: DOM парсинг с Playwright
- **Формат URL**: `https://avia.tutu.ru/f/{from}/{to}/?departure={date}`
- **Извлекаемые данные**: авиакомпания, цена
- **Stealth**: Использует playwright-extra с stealth плагином

### Wildberries Travel
- **Метод**: Перехват API
- **Формат URL**: `https://vmeste.wildberries.ru/avia/search?from={origin}&to={destination}&date={date}`
- **Извлекаемые данные**: авиакомпания, цена, номер рейса
- **Fallback**: DOM парсинг при неудаче API

## 🔧 Конфигурация

### Переменные окружения

Создайте файл `.env`:

```env
MONGO_URI=mongodb://localhost:27017/skyscout
PORT=3000
```

### Конфигурация скрапера

Отредактируйте `src/app.js` для изменения:
- Городов отправления/назначения
- Даты поиска
- Источников скрапинга

## 📝 Скрипты

```bash
npm start          # Запуск скрапера
npm run api        # Запуск API сервера
npm run web        # Запуск веб-интерфейса
npm run dev        # Запуск API + веб-интерфейса
npm run scrape     # Запуск скрапера
```

## 🗄️ Схема MongoDB

### Модель Flight

```javascript
{
  flightNumber: String,      // Номер рейса (опционально)
  airline: String,           // Название авиакомпании (опционально)
  price: Number,             // Цена в рублях (обязательно)
  origin: String,            // IATA код отправления (обязательно)
  destination: String,       // IATA код назначения (обязательно)
  departureDate: Date,       // Дата отправления (обязательно)
  source: String,            // Источник данных (обязательно)
  createdAt: Date,           // Временная метка создания
  expires: 7d                // TTL индекс
}
```

## 🚨 Устранение проблем

### Ошибка подключения к MongoDB

```bash
# Проверка запущена ли MongoDB
lsof -i :27017

# Ручной запуск MongoDB
mongod --dbpath ./data --port 27017
```

### Браузер Playwright не установлен

```bash
npx playwright install chromium
```

### Порт уже занят

```bash
# Найти процесс использующий порт
lsof -i :3000

# Убить процесс
kill -9 <PID>
```

### Скрапер не находит результаты

- Проверьте правильность формата URL
- Убедитесь в валидности даты поиска
- Убедитесь что структура сайта не изменилась
- Проверьте логи браузера на наличие ошибок

## 📈 Производительность

- **Параллельный скрапинг**: ~20-30 секунд для обоих источников
- **Запросы MongoDB**: <100ms
- **Время ответа API**: <200ms
- **Хранение данных**: 7 дней (TTL)

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте feature branch
3. Внесите изменения
4. Отправьте pull request

## 📄 Лицензия

MIT License - см. файл LICENSE для деталей

## ⚠️ Отказ от ответственности

Этот проект предназначен только для образовательных целей. Пожалуйста, уважайте условия использования сайтов, с которых собираются данные. Используйте ответственно и на свой страх и риск.

## 📞 Поддержка

Для вопросов и проблем, пожалуйста, откройте issue на GitHub.
