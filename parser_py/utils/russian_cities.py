"""
Список российских IATA кодов городов
Используется для фильтрации рейсов только по России
"""

RUSSIAN_IATA_CODES = {
    # Москва и область
    'MOW', 'SVO', 'DME', 'VKO', 'ZIA',
    
    # Санкт-Петербург
    'LED',
    
    # Центральный федеральный округ
    'AER', 'KZN', 'GOJ', 'VVO', 'MRV', 'KGD', 'PEE', 'UUA', 'ARH', 'KLP',
    'OGZ', 'TGK', 'KRT', 'ULV', 'PKV', 'BZK', 'KUF', 'UFA', 'CEK', 'SVX',
    
    # Северо-Западный федеральный округ
    'LED', 'PES', 'KGD', 'ARH', 'VVS', 'ULL', 'AAQ', 'MRV', 'TGK', 'KRT',
    
    # Южный федеральный округ
    'AER', 'KRR', 'ROV', 'VOG', 'ESL', 'MOW', 'SVX', 'KZN', 'GOJ', 'ULV',
    
    # Приволжский федеральный округ
    'KZN', 'UFA', 'SVX', 'KUF', 'GOJ', 'ULV', 'CEK', 'REN', 'SKX', 'OSW',
    
    # Уральский федеральный округ
    'SVX', 'KZN', 'UFA', 'CEK', 'NOZ', 'TJX', 'KRO', 'NYX', 'SGC',
    
    # Сибирский федеральный округ
    'OVB', 'VVO', 'KJA', 'IKT', 'ABA', 'NOZ', 'UUS', 'DYR', 'BQS', 'HTA',
    
    # Дальневосточный федеральный округ
    'VVO', 'KHV', 'UUS', 'YKS', 'MJZ', 'BQS', 'GDX', 'DYR', 'UHH', 'OVS',
    
    # Северо-Кавказский федеральный округ
    'AER', 'KRR', 'MRV', 'OGZ', 'MOW', 'LED', 'SVX', 'KZN', 'GOJ', 'ULV',
    
    # Крым и Севастополь
    'AER', 'KRR', 'ZIW',
    
    # Дополнительные города
    'BTK', 'ELK', 'GRV', 'IJK', 'KGP', 'KHT', 'KMN', 'KOV', 'KRY', 'LTX',
    'NBC', 'NMA', 'NYN', 'OVS', 'PEZ', 'PKV', 'RZN', 'SKX', 'SLY', 'TQS',
    'UEN', 'UUU', 'VGD', 'VKS', 'VVO', 'YKS', 'ZAR'
}


def isRussianCity(iataCode: str) -> bool:
    """Проверяет, является ли город российским по IATA коду"""
    return iataCode.upper() in RUSSIAN_IATA_CODES


def filterRussianFlights(flights: list) -> list:
    """Фильтрует рейсы, оставляя только российские"""
    return [f for f in flights if isRussianCity(f.get('origin')) and isRussianCity(f.get('destination'))]
