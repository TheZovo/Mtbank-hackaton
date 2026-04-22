# MTB Galaxy Mock Server

Этот каталог содержит отдельный мок-сервер для параллельной разработки мобильного клиента, backend-команды и API-контрактов.

## Что внутри

- `mock_server.py` - FastAPI сервер с in-memory состоянием.
- `requirements.txt` - минимальные Python зависимости для запуска и проверки.
- `tests/` - smoke-тесты ключевого поведения из ТЗ.

## Быстрый старт

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r mock-server/requirements.txt
python mock-server/mock_server.py
```

Сервер поднимется на `http://localhost:8001`.

## Переменные окружения

- `MOCK_SERVER_PORT` - порт сервера, по умолчанию `8001`.
- `MOCK_SERVER_LOG_LEVEL` - уровень логирования, по умолчанию `INFO`.

## Валидация

```bash
python -m pytest mock-server/tests
```

## Генерация контрактов

Из корня репозитория:

```bash
npm run generate:api
```
