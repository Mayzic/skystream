#!/bin/bash
# Flight Price Monitor - Simple wrapper script for Russian routes

set -e

cd "$(dirname "$0")"

# Проверяем аргументы
if [ $# -lt 3 ]; then
    echo "Usage: ./monitor.sh <origin> <destination> <date> [wait_time]"
    echo "Example: ./monitor.sh MOW LED 2026-05-01 30"
    echo ""
    echo "Origin/destination: IATA codes (e.g., MOW, LED, AER, KZN)"
    echo "Date: YYYY-MM-DD format"
    echo "Wait time: seconds to wait for prices (default: 30)"
    exit 1
fi

ORIGIN=$1
DESTINATION=$2
DATE=$3
WAIT_TIME=${4:-30}

echo "🚀 Starting flight price monitor..."
echo "Route: $ORIGIN → $DESTINATION"
echo "Date: $DATE"
echo "Wait time: $WAIT_TIME seconds"
echo ""

# Запускаем монитор для сбора цен
python3 monitor_prices.py "$ORIGIN" "$DESTINATION" "$DATE" "$WAIT_TIME"

# Парсим и отображаем результаты
echo ""
echo "📊 Parsing captured prices..."
python3 parse_prices.py

echo ""
echo "✅ Done!"
echo ""
echo "📊 Results saved to:"
echo "   - flight_prices.csv (main price database - appends each run)"
echo "   - screenshots/aviasales_screenshot_*.png (visual confirmation)"
echo "   - data/api_responses_*.json (raw data)"
echo ""
echo "💡 View price history: python3 view_history.py"
