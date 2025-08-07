# Webflow Score Webhook Processor

Оптимизированный сервис для обработки webhook'ов от Webflow с интеграцией HubSpot и real-time WebSocket уведомлениями.

## 🚀 Основные улучшения

### Архитектура
- **Модульная структура**: Код разделен на логические модули (services, controllers, middleware, utils)
- **Разделение ответственности**: Каждый класс имеет четко определенную роль
- **Конфигурационное управление**: Централизованная конфигурация с валидацией

### Производительность
- **HTTP клиент с retry логикой**: Автоматические повторы при сбоях API
- **Кеширование в памяти**: Оптимизация повторных запросов
- **Оптимизированные WebSocket соединения**: Heartbeat, управление соединениями
- **Graceful shutdown**: Корректное завершение работы

### Надежность
- **Централизованная обработка ошибок**: Структурированные ответы об ошибках
- **Валидация данных**: Проверка входящих данных
- **Логирование**: Подробные логи запросов и ошибок
- **Health checks**: Мониторинг состояния сервиса

## 📁 Структура проекта

```
/
├── index.js                 # Главный файл приложения
├── src/
│   ├── config/
│   │   └── index.js        # Конфигурация и переменные окружения
│   ├── services/
│   │   ├── webflowService.js    # Работа с Webflow API
│   │   ├── hubspotService.js    # Работа с HubSpot API
│   │   ├── scoreService.js      # Работа с Score API
│   │   └── websocketManager.js  # Управление WebSocket соединениями
│   ├── controllers/
│   │   └── webhookController.js # Контроллер для обработки webhook'ов
│   ├── middleware/
│   │   ├── errorHandler.js     # Обработка ошибок
│   │   └── logger.js           # Логирование запросов
│   └── utils/
│       ├── httpClient.js       # HTTP клиент с retry логикой
│       ├── validator.js        # Валидация данных
│       └── cache.js           # Система кеширования
```

## 🔧 Установка и запуск

### Переменные окружения

Создайте файл `.env` со следующими переменными:

```env
# Server
PORT=3000
NODE_ENV=production

# Webflow
WEBFLOW_TOKEN=your_webflow_token
SITE_ID=your_site_id
WEBHOOK_URL=your_webhook_url
FORM_NAME=your_form_name

# HubSpot
HUBSPOT_TOKEN=your_hubspot_token
```

### Запуск

```bash
# Установка зависимостей
npm install

# Запуск в продакшене
npm start

# Запуск в режиме разработки (с автоперезагрузкой)
npm run dev
```

## 📡 API Endpoints

### Основные эндпоинты

- `POST /` - Обработка webhook'ов от Webflow
- `GET /health` - Проверка здоровья сервиса
- `GET /ws-stats` - Статистика WebSocket соединений
- `GET /cache-stats` - Статистика кеша

### Примеры ответов

#### Health Check
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 50000000,
    "heapTotal": 30000000,
    "heapUsed": 20000000
  },
  "websocket": {
    "connectedClients": 5,
    "maxConnections": 1000
  }
}
```

#### WebSocket Stats
```json
{
  "connectedClients": 5,
  "maxConnections": 1000,
  "heartbeatInterval": 30000
}
```

## 🔌 WebSocket Integration

### Подключение
```javascript
const ws = new WebSocket('ws://your-server.com');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Типы сообщений

#### Score Update
```json
{
  "type": "score_update",
  "data": {
    "score": 85,
    "self_service": true,
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Connection
```json
{
  "type": "connection",
  "message": "Connected successfully",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## ⚡ Оптимизации производительности

### HTTP клиент
- Автоматические повторы при сбоях (3 попытки)
- Настраиваемые таймауты (10 секунд по умолчанию)
- Экспоненциальная задержка между попытками

### WebSocket менеджер
- Heartbeat для проверки живых соединений (30 сек)
- Лимит подключений (1000 по умолчанию)
- Автоматическая очистка мертвых соединений

### Кеширование
- In-memory кеш с TTL
- Статистика hit/miss ratio
- Автоматическая очистка по истечении времени

## 🛡️ Обработка ошибок

### Типы ошибок
- **ValidationError**: Ошибки валидации данных (400)
- **HttpError**: Ошибки внешних API (502)
- **Server Error**: Внутренние ошибки сервера (500)

### Пример ответа об ошибке
```json
{
  "error": "Validation Error",
  "message": "Invalid email format",
  "field": "leadEmail",
  "errors": [
    {
      "field": "leadEmail",
      "message": "Email is required"
    }
  ]
}
```

## 📊 Мониторинг

### Логи
- Подробное логирование всех запросов
- Логи ошибок с stack trace
- Логи WebSocket соединений
- Логи кеша (hit/miss)

### Метрики
- Время ответа API
- Количество активных WebSocket соединений
- Статистика кеша
- Использование памяти

## 🔄 Graceful Shutdown

Приложение корректно обрабатывает сигналы завершения:
- Закрывает HTTP сервер
- Завершает WebSocket соединения
- Очищает кеш
- Устанавливает таймаут принудительного завершения (10 сек)

## 🚀 Deployment

### Heroku
Приложение готово к деплою на Heroku:
- `Procfile` настроен
- Поддержка переменных окружения
- Graceful shutdown для корректной работы с dyno cycling

### Docker (опционально)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Масштабирование

Для горизонтального масштабирования рекомендуется:
- Использовать Redis для кеша вместо in-memory
- Настроить load balancer для WebSocket соединений
- Добавить мониторинг (Prometheus/Grafana)
- Использовать внешнюю очередь сообщений (Redis/RabbitMQ)