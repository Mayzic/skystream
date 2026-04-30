FROM python:3.11-slim

# Устанавливаем системные зависимости для Playwright
RUN apt-get update && apt-get install -y \
    gcc \
    wget \
    gnupg \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    fonts-liberation \
    libu2f-udev \
    libvulkan1 \
    xdg-utils \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Создаем рабочую директорию
WORKDIR /app

# Копируем requirements
COPY requirements.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем файлы проекта
COPY . .

# Создаем директории для данных
RUN mkdir -p /app/data /app/logs /app/screenshots

# Порт
EXPOSE 3000

# Запуск сервера
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3000"]
