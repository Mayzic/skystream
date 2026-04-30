"""
Ozon Travel API Service
Дополнительный источник данных для российских рейсов
"""

import httpx
from datetime import datetime
from typing import List
from utils.russian_cities import isRussianCity


class OzonTravelAPI:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_base = "https://api.ozon.travel"

    async def get_prices_for_date(self, origin: str, destination: str, date: str) -> List[dict]:
        """Получить цены на авиабилеты через Ozon Travel"""
        try:
            if not isRussianCity(origin) or not isRussianCity(destination):
                print(f"Пропуск: {origin} → {destination} (не российские города)")
                return []

            url = f"{self.api_base}/flights/search"
            params = {
                "apikey": self.api_key,
                "origin": origin,
                "destination": destination,
                "departure_date": date
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    print(f"Ozon API error: {response.status_code}")
                    return []
                
                data = response.json()
                
                if not data or "offers" not in data:
                    return []
                
                flights = []
                for offer in data.get("offers", []):
                    flight = {
                        "origin": origin,
                        "destination": destination,
                        "price": offer.get("price", 0),
                        "airline": offer.get("airline", "Unknown"),
                        "departure_date": datetime.fromisoformat(offer.get("departure_date", "").replace("Z", "+00:00")),
                        "source": "ozon_travel_api",
                        "flight_number": offer.get("flight_number"),
                        "booking_url": f"https://www.ozon.ru/travel/flights/?origin={origin}&destination={destination}&date={date}"
                    }
                    flights.append(flight)
                
                return flights
                
        except Exception as e:
            print(f"Ozon API request failed: {e}")
            return []
