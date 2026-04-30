"""
Travelpayouts API Service
Надежный источник данных через API вместо веб-скрапинга
Primary source для получения цен на авиабилеты
"""

import httpx
from datetime import datetime
from typing import List, Optional
from utils.russian_cities import isRussianCity


class TravelpayoutsAPI:
    def __init__(self, token: str):
        self.token = token
        self.api_base = "https://api.travelpayouts.com/aviasales/v3"

    async def get_prices_for_date(self, origin: str, destination: str, date: str) -> List[dict]:
        """
        Получить цены на авиабилеты через Travelpayouts API
        
        Args:
            origin: IATA код города вылета
            destination: IATA код города прилета
            date: Дата вылета в формате YYYY-MM-DD
            
        Returns:
            Список найденных рейсов
        """
        try:
            # Проверяем, что оба города российские
            if not isRussianCity(origin) or not isRussianCity(destination):
                print(f"Пропуск: {origin} → {destination} (не российские города)")
                return []

            url = f"{self.api_base}/prices_for_dates"
            params = {
                "origin": origin,
                "destination": destination,
                "departure_at": date,
                "token": self.token,
                "currency": "rub",
                "limit": 100
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    print(f"Travelpayouts API error: {response.status_code}")
                    return []
                
                data = response.json()
                
                if not data or "data" not in data:
                    return []
                
                flights = []
                for item in data.get("data", []):
                    flight = {
                        "origin": item.get("origin"),
                        "destination": item.get("destination"),
                        "price": item.get("price", 0),
                        "airline": item.get("airline", "Unknown"),
                        "departure_date": datetime.fromisoformat(item.get("departure_at", "").replace("Z", "+00:00")),
                        "source": "travelpayouts_api",
                        "flight_number": item.get("flight_number"),
                        "booking_url": f"https://www.aviasales.ru/search/{origin}{date.replace('-', '')}{destination}1"
                    }
                    flights.append(flight)
                
                return flights
                
        except Exception as e:
            print(f"Travelpayouts API request failed: {e}")
            return []

    async def get_cheapest_flights(self, origin: str, destination: str, limit: int = 10) -> List[dict]:
        """Получить самые дешевые билеты"""
        date = datetime.now().strftime("%Y-%m-%d")
        flights = await self.get_prices_forDate(origin, destination, date)
        return sorted(flights, key=lambda x: x["price"])[:limit]
