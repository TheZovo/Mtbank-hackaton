# MTB Galaxy Document Alignment Design

**Goal**

Встроить требования из внешнего `.docx` в текущий монорепозиторий `apps/mobile + apps/api + packages/contracts`, не создавая параллельную legacy-структуру.

**Scope**

- Добавить в backend домены `friends`, `gifts`, `payment_requests` и ручки, ожидаемые мобильным сценарием из документа.
- Перевести contracts-генерацию на `apps/api`, чтобы mobile брал типы из актуального backend API.
- Добавить в mobile недостающие экраны `Friends`, `AI`, `QR` и расширить `Profile` под nickname-flow.
- Сохранить текущие существующие сценарии auth, planets, games, referrals, profile и не ломать уже работающие `/v1/*` ручки.

**Architecture**

- `apps/api` остается единственным backend. Новые сценарии добавляются как новые модули FastAPI и SQLAlchemy-модели с отдельной миграцией.
- `packages/contracts` остается точкой правды для mobile-клиента; OpenAPI и generated types должны отражать `apps/api`, а не mock server.
- `apps/mobile` получает новые feature-модули и обновленную навигацию, используя текущие shared patterns: `react-query`, `zustand`, `shared/api/client.ts`, `Screen`, `SectionCard`.

**Backend Design**

- `users` расширяется полем `nickname`, при этом `display_name/name` сохраняются для обратной совместимости текущего UI и auth-flow.
- Добавляются таблицы дружбы, выданных подарков и платежных запросов.
- Добавляются ручки:
  - `POST /v1/users`
  - `GET /v1/users?nickname=...`
  - `POST /v1/friends`
  - `GET /v1/friends/{user_id}`
  - `POST /v1/play-together`
  - `POST /v1/payment-requests`
  - `GET /v1/payment-requests/{request_id}`
  - `POST /v1/payment-requests/{request_id}/pay`
- Новые ручки должны работать поверх существующей SQLAlchemy-инфраструктуры и тестового SQLite-пути.

**Contracts Design**

- Экспорт OpenAPI должен поднимать `apps/api` и сохранять схему в `contracts/openapi.yaml`.
- После обновления схемы generated types синхронизируются в:
  - `contracts/generated/api.ts`
  - `packages/contracts/src/generated/api.ts`
- Mobile использует новые типы без ручного дублирования shape-объектов.

**Mobile Design**

- Добавляются feature-модули:
  - `apps/mobile/src/features/friends`
  - `apps/mobile/src/features/ai`
  - `apps/mobile/src/features/qr`
- `FriendsScreen` реализует поиск пользователя по nickname, добавление в друзья, список друзей, запуск совместной игры и выдачу gift/promo modal.
- `AIScreen` работает локально на мок-транзакциях и не требует backend.
- `QRScreen` создает платежный запрос, показывает QR-представление и поддерживает mock scan/pay flow без аппаратной камеры как обязательного условия для тестов.
- `ProfileScreen` дополняется nickname editing flow поверх существующего профиля.
- `RootNavigator` и tab bar обновляются так, чтобы новые экраны были доступны без поломки текущих routes.

**Testing**

- Сначала добавляются backend tests на nickname/friends/gifts/payment requests.
- Затем обновляются mobile tests на profile nickname-flow и добавляются tests для friends flow.
- Verification: точечные backend/mobile tests на новые сценарии, затем полные relevant test suites.

**Non-Goals**

- Не создается отдельный `backend/` каталог из документа.
- Не переводится production backend полностью на SQLite; SQLite остается гарантированным test/dev path.
- Не внедряется полноценный camera-native scanning как обязательная часть verification в этой итерации.
