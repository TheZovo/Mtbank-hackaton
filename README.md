# MTB Galaxy

Текущий репозиторий это мобильный монорепозиторий MTB Galaxy с основным backend в `apps/api`, мобильным клиентом в `apps/mobile` и типами/контрактами в `contracts` и `packages/contracts`.

## Основные модули

- `apps/api` - основной FastAPI backend.
- `apps/mobile` - React Native клиент.
- `packages/contracts` - runtime-friendly TS типы для mobile.
- `contracts` - OpenAPI YAML и generated API artifacts.
- `mock-server` - отдельный упрощённый mock backend для параллельной разработки.

## Что реализовано по документу

- Planet map и planet detail/constellation flow в `apps/mobile`.
- Friends flow: поиск по nickname, добавление в друзья, `play-together`, gift promo-code.
- AI screen с локальным анализом мок-транзакций.
- QR flow: создание платежного запроса, генерация QR, payload fallback и runtime camera-scanner path.
- Profile nickname flow.
- Backend endpoints для `users`, `friends`, `play-together`, `payment-requests`.

## Установка

```bash
python -m venv .venv
.venv\Scripts\activate
python -m pip install -e .\apps\api[dev]
npm install
```

## Запуск backend

```bash
npm run dev:api
```

По умолчанию API поднимается на `http://localhost:8000` с префиксом `/v1`.

## Запуск mobile

```bash
npm run android
```

или

```bash
npm run ios
```

Для Android-эмулятора используйте `API_BASE_URL=http://10.0.2.2:8000/v1`.

## Контракты

OpenAPI и generated types теперь строятся из `apps/api`, а не из `mock-server`.

```bash
npm run contracts:generate
```

Команда:

1. Экспортирует `apps/api/openapi.json`.
2. Сохраняет YAML в `contracts/openapi.yaml`.
3. Генерирует `contracts/generated/api.ts`.

## Ключевые document endpoints

Все ручки доступны по префиксу `/v1`.

- `POST /v1/users`
- `GET /v1/users?nickname=...`
- `POST /v1/friends`
- `GET /v1/friends/{user_id}`
- `POST /v1/play-together`
- `POST /v1/payment-requests`
- `GET /v1/payment-requests/{request_id}`
- `POST /v1/payment-requests/{request_id}/pay`

Также сохранены существующие auth/profile/planets/games/leaderboard/referrals/promocodes ручки.

## Проверка

Backend:

```bash
$env:PYTHONPATH='D:\Mtb_new\apps\api\src'
.\.venv\Scripts\python.exe -m pytest apps/api/tests -v
```

Mobile:

```bash
npm run test --workspace @mtb/mobile -- --runInBand
```

## QR scanner note

`apps/mobile` использует:

- `react-native-qrcode-svg` для генерации QR
- `react-native-vision-camera`
- `react-native-vision-camera-barcode-scanner`

В тестовой среде и на неподготовленных runtime-окружениях экран QR продолжает работать через ручную вставку payload. Для реального camera scanning в нативном приложении должны быть настроены platform-specific permissions и пересобран mobile binary.
