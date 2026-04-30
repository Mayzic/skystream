# SkyStream

Multi-source flight price aggregator for Russian domestic flights.

## 🚀 Features

- **Multi-source aggregation**: Collects flight data from Tutu.ru and Wildberries Travel simultaneously
- **Parallel scraping**: Uses Promise.allSettled for concurrent data collection
- **DOM parsing**: Extracts prices from Tutu.ru using Playwright with stealth
- **API interception**: Captures JSON responses from Wildberries Travel
- **MongoDB storage**: Stores flight data with automatic TTL (7 days)
- **Web interface**: Streamlit dashboard for data visualization
- **REST API**: Express.js API server for data access

## 📋 Requirements

- Node.js 18+
- Python 3.8+
- MongoDB 7.0+
- npm

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/skystream.git
cd skystream
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Install Python dependencies

```bash
pip install -r web/requirements.txt
```

### 4. Install Playwright browsers

```bash
npx playwright install chromium
```

### 5. Start MongoDB

```bash
# Using Docker
docker-compose up -d

# Or locally
mongod --dbpath ./data --port 27017
```

## 🎯 Quick Start

### Using startup scripts (recommended)

```bash
# Make scripts executable
chmod +x start.sh stop.sh

# Start all services
./start.sh

# Stop all services
./stop.sh
```

### Manual startup

```bash
# Terminal 1: Start MongoDB
mongod --dbpath ./data --port 27017

# Terminal 2: Start API server
npm run api

# Terminal 3: Start web interface
npm run web

# Terminal 4: Run scraper (optional)
npm run scrape
```

## 📁 Project Structure

```
skystream/
├── src/
│   ├── scrapers/
│   │   ├── BaseScraper.js          # Base scraper class
│   │   ├── TutuScraper.js          # Tutu.ru DOM parser
│   │   ├── WBScraper.js            # Wildberries Travel API interceptor
│   │   └── KupibiletScraper.js     # Legacy scraper (deprecated)
│   ├── models/
│   │   └── Flight.js               # MongoDB Flight model
│   ├── app.js                     # Main scraper aggregator
│   └── api-server.js              # Express API server
├── web/
│   ├── app.py                     # Streamlit dashboard
│   ├── requirements.txt           # Python dependencies
│   └── .streamlit/               # Streamlit config
├── parser_py/                     # Python API server (legacy)
├── data/                          # MongoDB data directory
├── logs/                          # Application logs
├── start.sh                       # Startup script
├── stop.sh                        # Stop script
├── package.json                   # Node.js dependencies
├── docker-compose.yml             # Docker configuration
└── README.md                      # This file
```

## 🔌 API Endpoints

### Search flights by route and date

```
GET /api/search?origin=MOW&destination=LED&date=2026-05-14
```

Response:
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

### Get cheapest flights from origin

```
GET /api/cheapest?origin=MOW&date=2026-05-14
```

### Get all flights

```
GET /api/flights
```

## 🌐 Web Interface

Access the Streamlit dashboard at: **http://localhost:8501**

Features:
- Search flights by route and date
- Find cheapest flights by destination
- View price charts and statistics
- Filter by airline and source

## 📊 Data Sources

### Tutu.ru
- **Method**: DOM parsing with Playwright
- **URL format**: `https://avia.tutu.ru/f/{from}/{to}/?departure={date}`
- **Data extracted**: airline, price
- **Stealth**: Uses playwright-extra with stealth plugin

### Wildberries Travel
- **Method**: API interception
- **URL format**: `https://vmeste.wildberries.ru/avia/search?from={origin}&to={destination}&date={date}`
- **Data extracted**: airline, price, flight number
- **Fallback**: DOM parsing if API fails

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
MONGO_URI=mongodb://localhost:27017/skyscout
PORT=3000
```

### Scraper Configuration

Edit `src/app.js` to change:
- Origin/destination cities
- Search date
- Scraping sources

## 📝 Scripts

```bash
npm start          # Run scraper
npm run api        # Start API server
npm run web        # Start web interface
npm run dev        # Start API + web interface
npm run scrape     # Run scraper
```

## 🗄️ MongoDB Schema

### Flight Model

```javascript
{
  flightNumber: String,      // Flight number (optional)
  airline: String,           // Airline name (optional)
  price: Number,             // Price in rubles (required)
  origin: String,            // Origin IATA code (required)
  destination: String,       // Destination IATA code (required)
  departureDate: Date,       // Departure date (required)
  source: String,            // Data source (required)
  createdAt: Date,           // Creation timestamp
  expires: 7d                // TTL index
}
```

## 🚨 Troubleshooting

### MongoDB connection error

```bash
# Check if MongoDB is running
lsof -i :27017

# Start MongoDB manually
mongod --dbpath ./data --port 27017
```

### Playwright browser not installed

```bash
npx playwright install chromium
```

### Port already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Scraper finds no results

- Check if the URL format is correct
- Verify that the search date is valid
- Ensure the website structure hasn't changed
- Check browser logs for errors

## 📈 Performance

- **Parallel scraping**: ~20-30 seconds for both sources
- **MongoDB queries**: <100ms
- **API response time**: <200ms
- **Data retention**: 7 days (TTL)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This project is for educational purposes only. Please respect the terms of service of the websites being scraped. Use responsibly and at your own risk.

## 📞 Support

For issues and questions, please open an issue on GitHub.
