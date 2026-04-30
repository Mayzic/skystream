FROM python:3.11-slim

WORKDIR /app

# Устанавливаем системные зависимости для matplotlib
RUN apt-get update && apt-get install -y \
    python3-tk \
    && rm -rf /var/lib/apt/lists/*

# Копируем requirements
COPY requirements.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем исходный код
COPY . .

CMD ["python", "analytics.py"]
