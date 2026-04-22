# MTB Galaxy

MTB Galaxy теперь собран как mobile-first monorepo: пользовательский клиент живет в `React Native`, а backend работает на полностью асинхронном `FastAPI + PostgreSQL`.

## Что внутри

- `apps/mobile` - новый мобильный клиент на `Bare React Native + TypeScript`.
- `apps/api` - async backend на `FastAPI`, `SQLAlchemy 2 async`, `PostgreSQL`, `Alembic`, `Redis`.
- `packages/contracts` - TypeScript-контракты новой versioned API.
- `packages/shared` - общие продуктовые типы и метаданные.
- `packages/game-core` - platform-neutral логика мини-игр.

## Основные принципы

- Только mobile user app. Старый web-клиент и админка удалены из активной архитектуры.
- Backend authoritative: прогресс, награды, мастерство, стрики, леджер и результаты мини-игр принадлежат серверу.
- Аутентификация построена вокруг `телефон + OTP`.
- PostgreSQL - основная база данных, Redis - вспомогательный runtime для OTP и фоновых задач.

## Структура

```text
apps/
  api/
    src/
      core/
      common/
      db/
      infrastructure/
      modules/
  mobile/
    src/
      app/
      navigation/
      features/
      shared/
packages/
  contracts/
  shared/
  game-core/
```

## Быстрый старт

Поднимите инфраструктуру:

```bash
docker compose up -d
```

Установите Python-зависимости API:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e apps/api[dev]
```

При необходимости создайте `.env`:

```bash
copy apps\api\.env.example apps\api\.env
```

Сгенерируйте OpenAPI-контракты:

```bash
npm install
npm run contracts:generate
```

Запустите backend:

```bash
npm run dev:api
```

Запустите Metro для mobile-клиента:

```bash
npm run dev:mobile
```

Затем отдельно поднимите платформу:

```bash
npm run android
npm run ios
```

## API

Базовый префикс всех ручек: `/v1`.

### Auth

- `POST /v1/auth/request-otp`
- `POST /v1/auth/verify-otp`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/me`

### User Flow

- `GET /v1/profile`
- `PATCH /v1/profile/focus-planet`
- `GET /v1/quests`
- `POST /v1/quests/{quest_id}/claim`
- `GET /v1/rewards/ledger`
- `GET /v1/referrals`
- `POST /v1/referrals`
- `GET /v1/leaderboard`
- `POST /v1/games/{game_code}/runs`
- `GET /v1/games/summary`

## Миграции

Alembic настроен на `apps/api/src/db/migrations`.

```bash
cd apps/api
alembic upgrade head
```

## Сиды

Для локальной разработки можно засеять справочники и тестового пользователя:

```bash
python apps/api/scripts/seed_dev_data.py
```

## Тесты

Backend:

```bash
npm run test:api
```

Mobile:

```bash
npm run test:mobile
```
