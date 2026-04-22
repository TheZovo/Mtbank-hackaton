# MTB Galaxy

Этот репозиторий содержит мобильный монорепозиторий MTB Galaxy и отдельный мок-сервер для параллельной разработки интерфейсов, backend-логики и API-контрактов.

## Что добавлено по ТЗ

- `mock-server/` - FastAPI мок-сервер с in-memory состоянием, auth, CORS и логированием.
- `contracts/openapi.yaml` - OpenAPI-спецификация всех ручек из документа.
- `contracts/generated/api.ts` - сгенерированные TypeScript-типы для фронтенда.
- `contracts/generate.js` - скрипт повторной генерации спецификации и типов.

## Установка

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r mock-server/requirements.txt
npm install
```

## Запуск мок-сервера

Один из двух вариантов:

```bash
python mock-server/mock_server.py
```

или

```bash
npm run mock
```

По умолчанию сервер стартует на `http://localhost:8001`.

### Переменные окружения

- `MOCK_SERVER_PORT` - порт, по умолчанию `8001`.
- `MOCK_SERVER_LOG_LEVEL` - уровень логирования, по умолчанию `INFO`.

## Эндпоинты

Все ручки доступны по префиксу `/v1`.

### Auth

- `POST /v1/auth/request-otp`
- `POST /v1/auth/verify-otp`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`

### Планеты и прогресс

- `GET /v1/planets/list`
- `GET /v1/planets/{planet_id}/progress`
- `PATCH /v1/planets/{planet_id}/focus`

### Игры и лидерборд

- `POST /v1/games/{game_code}/runs`
- `GET /v1/leaderboard/planet/{planet_id}?period=week`

### Профиль, промокоды и рефералы

- `GET /v1/me`
- `GET /v1/promocodes`
- `GET /v1/referrals`
- `POST /v1/referrals`

### Администрирование мок-сервера

- `POST /v1/admin/reset`
- `POST /v1/admin/end_period`

## Генерация OpenAPI и TypeScript-типов

```bash
npm run generate:api
```

Команда:

1. Создаёт `contracts/openapi.yaml` из FastAPI приложения.
2. Генерирует `contracts/generated/api.ts` через `openapi-typescript`.

## Проверка

```bash
python -m pytest mock-server/tests
```

## Примеры curl-запросов

### Запросить OTP

```bash
curl -X POST http://localhost:8001/v1/auth/request-otp ^
  -H "Content-Type: application/json" ^
  -d "{\"phone\":\"+79991234567\"}"
```

### Подтвердить OTP

```bash
curl -X POST http://localhost:8001/v1/auth/verify-otp ^
  -H "Content-Type: application/json" ^
  -d "{\"phone\":\"+79991234567\",\"code\":\"123456\",\"name\":\"Тестовый\"}"
```

### Получить профиль

```bash
curl http://localhost:8001/v1/me ^
  -H "Authorization: Bearer mock_access_token"
```

### Отправить результат игры

```bash
curl -X POST http://localhost:8001/v1/games/halva_snake/runs ^
  -H "Authorization: Bearer mock_access_token" ^
  -H "Content-Type: application/json" ^
  -d "{\"score\":180,\"planet_id\":\"apteki\"}"
```

### Завершить период

```bash
curl -X POST http://localhost:8001/v1/admin/end_period
```

### Сбросить состояние

```bash
curl -X POST http://localhost:8001/v1/admin/reset
```

## Как переключить фронтенд на мок-сервер

Используйте базовый URL через переменную окружения `API_BASE_URL`.

Примеры:

- локально в браузере или iOS симуляторе: `API_BASE_URL=http://localhost:8001/v1`
- Android эмулятор: `API_BASE_URL=http://10.0.2.2:8001/v1`
- физическое устройство: `API_BASE_URL=http://<ваш-local-ip>:8001/v1`

## Известные упрощения

- Состояние хранится только в памяти и сбрасывается после перезапуска.
- Любой Bearer токен считается валидным, кроме `invalid-token`.
- Лимит игровых попыток общий на пользователя и сбрасывается только через `POST /v1/admin/reset` или после перезапуска.
- Лидерборд детерминированно генерируется мок-данными и не связан с реальными пользователями.
- Не моделируются бизнес-валидации вроде MCC, антифрода, реальной выдачи промокодов и сложной деградации.
