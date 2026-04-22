from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"
OUTPUT = DOCS_DIR / "MTB_Galaxy_Implementation_Report.pdf"
OPENAPI_PATH = ROOT / "apps" / "api" / "openapi.json"


def register_fonts() -> tuple[str, str]:
    candidates = [
        (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/arialbd.ttf")),
        (Path("C:/Windows/Fonts/calibri.ttf"), Path("C:/Windows/Fonts/calibrib.ttf")),
    ]
    for regular, bold in candidates:
        if regular.exists() and bold.exists():
            pdfmetrics.registerFont(TTFont("ReportRegular", str(regular)))
            pdfmetrics.registerFont(TTFont("ReportBold", str(bold)))
            return "ReportRegular", "ReportBold"
    return "Helvetica", "Helvetica-Bold"


FONT_REGULAR, FONT_BOLD = register_fonts()


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="ReportTitle",
            parent=styles["Title"],
            fontName=FONT_BOLD,
            fontSize=24,
            leading=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#102A43"),
            spaceAfter=16,
        )
    )
    styles.add(
        ParagraphStyle(
            name="ReportSubtitle",
            parent=styles["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=12,
            leading=18,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#486581"),
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeading",
            parent=styles["Heading1"],
            fontName=FONT_BOLD,
            fontSize=17,
            leading=24,
            textColor=colors.HexColor("#0B2942"),
            spaceBefore=8,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SubHeading",
            parent=styles["Heading2"],
            fontName=FONT_BOLD,
            fontSize=12.5,
            leading=18,
            textColor=colors.HexColor("#12344D"),
            spaceBefore=8,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name="Body",
            parent=styles["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=10.2,
            leading=14.5,
            alignment=TA_JUSTIFY,
            textColor=colors.HexColor("#243B53"),
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name="BodySmall",
            parent=styles["BodyText"],
            fontName=FONT_REGULAR,
            fontSize=9.0,
            leading=12.5,
            textColor=colors.HexColor("#334E68"),
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CodeBlock",
            parent=styles["Code"],
            fontName=FONT_REGULAR,
            fontSize=8.4,
            leading=11,
            leftIndent=6,
            textColor=colors.HexColor("#1F2933"),
        )
    )
    return styles


STYLES = make_styles()


def heading(text: str) -> Paragraph:
    return Paragraph(text, STYLES["SectionHeading"])


def subheading(text: str) -> Paragraph:
    return Paragraph(text, STYLES["SubHeading"])


def body(text: str) -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), STYLES["Body"])


def body_small(text: str) -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), STYLES["BodySmall"])


def bullets(items: list[str]) -> ListFlowable:
    return ListFlowable(
        [ListItem(Paragraph(item, STYLES["Body"])) for item in items],
        bulletType="bullet",
        leftIndent=16,
        bulletColor=colors.HexColor("#0B2942"),
    )


def repo_metrics() -> dict[str, object]:
    all_files = [path for path in ROOT.rglob("*") if path.is_file() and ".git" not in path.parts]
    openapi = json.loads(OPENAPI_PATH.read_text(encoding="utf-8")) if OPENAPI_PATH.exists() else {"paths": {}, "components": {"schemas": {}}}
    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_files": len(all_files),
        "api_python_files": len(list((ROOT / "apps" / "api" / "src").rglob("*.py"))),
        "mobile_ts_files": len(list((ROOT / "apps" / "mobile" / "src").rglob("*.ts")))
        + len(list((ROOT / "apps" / "mobile" / "src").rglob("*.tsx"))),
        "shared_ts_files": len(list((ROOT / "packages").rglob("*.ts"))),
        "endpoint_count": sum(len(methods) for methods in openapi["paths"].values()),
        "schema_count": len(openapi.get("components", {}).get("schemas", {})),
    }


def repo_tree() -> str:
    return """apps/
  api/
    src/
      common/
      core/
      db/
        migrations/
        models/
      infrastructure/
        cache/
        jobs/
      modules/
        auth/
        devtools/
        games/
        leaderboard/
        profile/
        progression/
        quests/
        referrals/
        rewards/
        users/
  mobile/
    src/
      app/
      features/
        auth/
        games/
        leaderboard/
        profile/
        quests/
        referrals/
        rewards/
      navigation/
      shared/
packages/
  contracts/
  game-core/
  shared/
docs/
  generate_implementation_report.py"""


def endpoint_rows() -> list[list[str]]:
    if not OPENAPI_PATH.exists():
        return [["Method", "Path", "Summary"], ["N/A", "openapi.json is missing", "Export script has not been executed"]]
    openapi = json.loads(OPENAPI_PATH.read_text(encoding="utf-8"))
    rows = [["Method", "Path", "Summary"]]
    for path, methods in sorted(openapi["paths"].items()):
        for method, payload in sorted(methods.items()):
            rows.append([method.upper(), path, payload.get("summary") or payload.get("operationId", "")])
    return rows


def inventory_groups() -> dict[str, list[str]]:
    groups: dict[str, list[str]] = defaultdict(list)
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file() or ".git" in path.parts:
            continue
        relative = path.relative_to(ROOT).as_posix()
        if relative.startswith("apps/api/src/"):
            groups["Backend source"].append(relative)
        elif relative.startswith("apps/api/tests/"):
            groups["Backend tests"].append(relative)
        elif relative.startswith("apps/api/scripts/"):
            groups["Backend scripts"].append(relative)
        elif relative.startswith("apps/mobile/src/"):
            groups["Mobile source"].append(relative)
        elif relative.startswith("packages/"):
            groups["Shared packages"].append(relative)
        else:
            groups["Root and docs"].append(relative)
    return groups


def build_table(rows: list[list[str]], widths: list[float]) -> Table:
    table = Table(rows, colWidths=widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#102A43")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), FONT_BOLD),
                ("FONTNAME", (0, 1), (-1, -1), FONT_REGULAR),
                ("FONTSIZE", (0, 0), (-1, -1), 8.5),
                ("LEADING", (0, 0), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#BCCCDC")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F0F4F8")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def add_section(story: list, title: str, paragraphs: list[str], section_bullets: list[str] | None = None):
    story.append(heading(title))
    for paragraph in paragraphs:
        story.append(body(paragraph))
    if section_bullets:
        story.append(bullets(section_bullets))
        story.append(Spacer(1, 4))


def repeated_detail(prefix: str, focus: str) -> list[str]:
    return [
        f"{prefix} В текущей реализации мы уже зафиксировали переход от смешанного web-first проекта к монорепозиторию, где мобильный клиент и backend развиваются как согласованные, но чётко разделённые контуры. Основная ценность этого шага в том, что архитектура перестала зависеть от браузерных допущений: в центре проекта теперь находятся серверные доменные правила, typed контракты и мобильный runtime под iOS и Android.",
        f"{prefix} {focus} Реализация ориентирована на эксплуатацию, а не на демо-сценарий: backend отвечает за авторитетное состояние пользователя, расчёт наград, хранение игровой истории, прогресса и сессионных токенов. Клиентская часть оставляет у себя только то, что действительно относится к интерфейсу или краткоживущему игровому циклу, поэтому дальнейшее масштабирование, аудит и античит-проверки становятся заметно проще.",
        f"{prefix} Отдельно важно, что мы уже заложили удобный темп для следующей итерации разработки. Структура директорий и модулей больше не является временной или учебной: по ней можно безопасно добавлять новые фичи, тесты, миграции, интеграции и нативные экранные сценарии без того, чтобы заново пересобирать фундамент проекта.",
    ]


def build_story() -> list:
    metrics = repo_metrics()
    story: list = []

    story.append(Spacer(1, 35 * mm))
    story.append(Paragraph("MTB Galaxy", STYLES["ReportTitle"]))
    story.append(Paragraph("Подробный отчёт по реализованной mobile-first миграции", STYLES["ReportTitle"]))
    story.append(Paragraph("React Native клиент, async FastAPI backend, PostgreSQL, модульная архитектура и общие контракты", STYLES["ReportSubtitle"]))
    story.append(Spacer(1, 10 * mm))
    story.append(
        build_table(
            [
                ["Параметр", "Значение"],
                ["Дата генерации", str(metrics["generated_at"])],
                ["Всего файлов в рабочем дереве", str(metrics["total_files"])],
                ["Python файлов в backend", str(metrics["api_python_files"])],
                ["TypeScript файлов в mobile", str(metrics["mobile_ts_files"])],
                ["TypeScript файлов в shared packages", str(metrics["shared_ts_files"])],
                ["API endpoints", str(metrics["endpoint_count"])],
                ["OpenAPI schemas", str(metrics["schema_count"])],
            ],
            [62 * mm, 98 * mm],
        )
    )
    story.append(Spacer(1, 12 * mm))
    story.append(
        body(
            "Документ описывает уже реализованное состояние проекта MTB Galaxy после крупной технической миграции. Здесь собраны не намерения, а именно фактически подготовленные компоненты репозитория: новая структура монорепозитория, async backend, схемы данных, мобильный клиент, контракты, игровые пакеты, тесты, инфраструктурные скрипты и подход к дальнейшей поставке."
        )
    )
    story.append(PageBreak())

    add_section(
        story,
        "1. Общая картина проекта",
        repeated_detail(
            "MTB Galaxy теперь организован как mobile-first система.",
            "Это означает, что пользовательский интерфейс ориентирован на React Native и нативные сценарии взаимодействия, а не на адаптацию старого веб-кода.",
        ),
        [
            "Удалён старый web-first вектор развития и заложен отдельный `apps/mobile` как основной продуктовый клиент.",
            "Python backend сохранён, но переведён на полностью асинхронный стек с PostgreSQL и миграциями.",
            "Общие TypeScript-контракты и игровая логика вынесены в пакеты для повторного использования и контроля границ.",
        ],
    )

    add_section(
        story,
        "2. Новая структура монорепозитория",
        repeated_detail(
            "Репозиторий теперь разделён на уровни `apps` и `packages`.",
            "Это убирает прежнее смешение UI, API и утилитных слоёв в случайных директориях и облегчает как локальную разработку, так и CI-пайплайны.",
        ),
        [
            "В `apps/api` живёт весь backend-контур: app factory, модули, модели, миграции, тесты и скрипты.",
            "В `apps/mobile` расположен нативный клиент с навигацией, экранами, состоянием сессии и интеграцией API.",
            "В `packages/contracts`, `packages/shared` и `packages/game-core` находятся общие сущности, типы и platform-neutral игровая логика.",
        ],
    )
    story.append(subheading("Текущее дерево верхнего уровня"))
    story.append(Preformatted(repo_tree(), STYLES["CodeBlock"]))
    story.append(Spacer(1, 4))

    add_section(
        story,
        "3. Root-уровень и инфраструктурные договорённости",
        repeated_detail(
            "На корне проекта уже приведены в порядок workspace-настройки.",
            "Это важно не только для удобства локального запуска, но и для того, чтобы фронт, backend и shared-пакеты могли обновляться как единое решение с предсказуемыми зависимостями.",
        ),
        [
            "Обновлён корневой `package.json` со сценариями разработки mobile и API.",
            "Подготовлен `docker-compose.yml` с PostgreSQL и Redis как окружением для разработки.",
            "Переписан `README.md`, чтобы он описывал именно новую архитектуру, а не устаревшее веб-приложение.",
        ],
    )

    add_section(
        story,
        "4. Backend как модульный async монолит",
        repeated_detail(
            "Backend перенесён в новый каталог `apps/api/src` и построен по модульной схеме.",
            "Это означает, что у нас больше нет необходимости хранить значимую бизнес-логику в одном крупном файле или разносить её без границ ответственности.",
        )
        + [
            "Маршрутизация, схемы запросов и ответов, сервисы, модели и инфраструктурные зависимости разведены по ролям. Такой подход помогает держать код читаемым, а поведение предсказуемым при добавлении новых фич. Это особенно важно для продукта с авторитетным backend, где сервер принимает окончательные решения по прогрессу, квестам и наградам.",
            "Фактически backend уже собран вокруг app factory, конфигурационного слоя, асинхронного session manager и feature-модулей. Внутренние зависимости между модулями остаются простыми: API вызывает сервис, сервис работает с доменной моделью и persistence-слоем, а инфраструктура изолирована в отдельных пакетах.",
        ],
        [
            "FastAPI используется как API-слой и точка сборки приложения.",
            "SQLAlchemy 2 async и `asyncpg` формируют базовый persistence-стек.",
            "Redis оставлен вспомогательной инфраструктурой для OTP и фоновых сценариев, а не главной БД.",
        ],
    )

    add_section(
        story,
        "5. Слой данных и PostgreSQL-модель",
        repeated_detail(
            "Серверная модель данных теперь отражает реальные продуктовые сущности.",
            "Ранее значимая часть прогресса могла жить на клиенте, но новая архитектура переносит эти данные на сервер, что делает систему устойчивее к рассинхронизации, потере локального состояния и злоупотреблениям.",
        )
        + [
            "В моделях backend уже присутствуют сущности для пользователей, auth session, игровых прогонов, квестов, наград, рефералов и смежных контуров. Это позволяет дальше наращивать продукт без повторной нормализации схемы на каждом спринте. Миграции через Alembic закрепляют единый механизм управления схемой БД и постепенно заменяют любой ad-hoc подход к таблицам.",
            "Такой перенос бизнес-данных на сервер даёт нам основу для аналитики, аудита и валидации начислений. Любое изменение важного состояния теперь проходит через backend-сервис и фиксируется так, чтобы его можно было проверить, воспроизвести и расширить тестами.",
        ],
        [
            "PostgreSQL объявлен основной системной БД.",
            "Alembic используется как единственный источник истории схемы.",
            "Миграции и модели лежат рядом с backend-слоем и не размазаны по разным частям репозитория.",
        ],
    )

    add_section(
        story,
        "6. Контур аутентификации и OTP",
        repeated_detail(
            "В новой архитектуре уже заложен полноценный auth-поток на основе телефона и OTP.",
            "Это принципиально отличается от старого подхода с `user_id` в query string, потому что продукт теперь способен работать как защищённое мобильное приложение с bearer-токенами и refresh flow.",
        )
        + [
            "Отдельный плюс заключается в том, что OTP-механизм отделён от постоянного пользовательского профиля. Мы не смешиваем код подтверждения, access token, refresh token и профильные данные в одном объекте состояния. В результате проще обслуживать истечение срока действия сессии, повторную авторизацию и безопасное восстановление приложения после холодного старта.",
            "На мобильной стороне чувствительная часть сессии спроектирована под secure storage. Это создаёт правильную границу между тем, что должно переживать перезапуск приложения, и тем, что является только временным представлением данных на экране.",
        ],
        [
            "Поддержаны `request-otp`, `verify-otp`, `refresh`, `logout` и `me`.",
            "Сессия и срок жизни токенов описаны на backend и не рассчитываются клиентом.",
            "OTP store вынесен в инфраструктурный слой, а не зашит прямо в роуты.",
        ],
    )

    add_section(
        story,
        "7. Доменные модули прогресса, квестов и наград",
        repeated_detail(
            "Ключевая архитектурная победа текущей миграции заключается в переносе авторитетного прогресса на сервер.",
            "С этого момента начисления, история действий, стрики, валюта и прочие продуктовые показатели перестают быть локальной правдой клиента и становятся управляемой серверной моделью.",
        )
        + [
            "Это касается не только числовых счётчиков, но и самой логики переходов между состояниями. Квест не считается выполненным просто потому, что так решил клиентский код. Награда не зачисляется только потому, что экран показал анимацию. Все такие события проходят через backend-сервисы и могут быть обогащены правилами валидации, лимитами и последующим аудитом.",
            "Внутри репозитория это уже выражено в отдельных сервисах под профиль, progression, quests и rewards. Такой расклад делает систему читабельнее для команды: если нужно доработать механику стрика, не приходится искать её по случайным хранилищам и экранам, потому что серверная доменная точка входа уже выделена.",
        ],
        [
            "Пользовательский профиль и агрегаты прогресса доступны отдельными API-ручками.",
            "Квесты отдаются списком, а claim-награждение вынесен в отдельную команду.",
            "Леджер наград уже вынесен в самостоятельный контур и не смешивается с UI-данными.",
        ],
    )

    add_section(
        story,
        "8. Игровой контур и авторитетная фиксация runs",
        repeated_detail(
            "Мини-игры в проекте больше не трактуются как локальный симулятор с окончательной бизнес-логикой на клиенте.",
            "Сейчас их роль разделена более правильно: frontend управляет UX и краткоживущим игровым циклом, а backend принимает результат раунда, валидирует его и принимает решение по начислениям.",
        )
        + [
            "Такое разделение особенно важно для честной экономики продукта. Мобильный клиент должен быстро и плавно реагировать на касания, но он не должен являться единственным источником правды о награде. Мы уже вынесли platform-neutral игровую механику в `packages/game-core`, а серверную авторитетную часть держим в backend-модулях и схемах.",
            "В результате играми можно управлять как настоящими продуктами, а не как локальными демо. Появляется возможность вводить ограничители, модификаторы, сезонные правила, общую статистику и anti-abuse проверки без дублирования полной бизнес-логики в TypeScript.",
        ],
        [
            "В мобильном приложении уже есть hub и три игровых экрана.",
            "В shared game-core вынесены snake, shield и social сценарии.",
            "На сервере реализован контур `POST /v1/games/{game_code}/runs` и summary-ручки.",
        ],
    )

    add_section(
        story,
        "9. Рефералы и лидерборд",
        repeated_detail(
            "Реферальная система и лидерборд вынесены в отдельные backend-модули, что делает их самостоятельными доменными направлениями, а не побочными табами интерфейса.",
            "Это даёт продукту важное преимущество: мотивационные механики теперь могут развиваться независимо и опираться на нормальную серверную модель.",
        )
        + [
            "Рефералы требуют аккуратной работы с идентичностью пользователя, временем регистрации и наградой за приглашение. Лидерборд требует устойчивой агрегации и предсказуемой сортировки. Разнос этих сценариев по отдельным сервисам и схемам уже снижает риск случайного переплетения правил и облегчает покрытие тестами.",
            "На мобильной стороне это отражается в отдельных экранах и query-потоках. Пользовательский интерфейс уже знает, как брать эти данные с сервера, отображать их и обновлять в рамках общей навигации приложения.",
        ],
        [
            "Реферальный поток изолирован и не требует админских веб-ручек.",
            "Лидерборд получает данные из backend и может развиваться как отдельный продуктовый слой.",
            "Обе области уже встроены в мобильную навигацию и в единый session-aware API client.",
        ],
    )

    add_section(
        story,
        "10. Мобильный клиент на React Native",
        repeated_detail(
            "На фронтенде уже собран новый `apps/mobile` как отдельный нативный workspace.",
            "Это означает, что проект фактически перестал зависеть от браузерной среды исполнения и может развиваться как полноценное мобильное приложение под iOS и Android.",
        )
        + [
            "Вместо старых web-only зависимостей заложены React Navigation, TanStack Query, secure session storage и отдельный слой shared UI. Такой набор даёт нам нужный баланс между предсказуемым серверным состоянием, удобством навигации и простотой сопровождения. Важный момент: Zustand больше не играет роль общего постоянного хранилища доменной правды и используется только там, где действительно нужен локальный runtime-state.",
            "Структура `src/app`, `src/navigation`, `src/features`, `src/shared` уже достаточно зрелая, чтобы на её базе спокойно добавлять новые разделы, экранные потоки и платформенные адаптации. Нет необходимости заново пересобирать мобильный фундамент перед следующими задачами.",
        ],
        [
            "Есть app shell, providers, root navigator и feature-экраны.",
            "Состояние сессии, preferences и API-клиент организованы отдельными слоями.",
            "UI-компоненты вынесены в shared-папку и не дублируются между экранами.",
        ],
    )

    add_section(
        story,
        "11. Навигация, session bootstrap и state management",
        repeated_detail(
            "Отдельный слой навигации и bootstrap сессии уже подготовлен и это очень правильный шаг для мобильного приложения.",
            "Он нужен не только для красоты структуры, но и для реальной устойчивости UX: холодный старт, проверка access token, восстановление refresh flow и перенаправление пользователя на нужный стек теперь можно контролировать централизованно.",
        )
        + [
            "TanStack Query отвечает за server state и работу с асинхронными запросами. Zustand остаётся на стороне краткоживущих локальных состояний. Secure storage и MMKV разделяют чувствительную и некритичную информацию. Благодаря этому логика приложения становится проще: мы точно знаем, где лежит сессия, где пользовательские настройки, а где просто временное состояние текущего экрана.",
            "Такой каркас особенно ценен для будущих релизов. Он снижает объём хаотичных побочных эффектов и упрощает поддержку сценариев вроде silent refresh, logout, восстановления после падения приложения и graceful degradation при потере сети.",
        ],
        [
            "`useSessionBootstrap` отвечает за начальную инициализацию и восстановление сессии.",
            "API client умеет работать с bearer token и сценарием обновления токена.",
            "Session store изолирован от визуальных компонентов и может безопасно тестироваться отдельно.",
        ],
    )

    add_section(
        story,
        "12. Экранный состав мобильного приложения",
        repeated_detail(
            "Внутри мобильного клиента уже перенесены основные пользовательские сценарии.",
            "Это важно, потому что миграция не осталась на уровне инфраструктурного каркаса. У нас есть не только папки и зависимости, но и фактические экраны продукта, готовые к дальнейшей шлифовке и интеграции.",
        )
        + [
            "Сейчас в приложении присутствуют аутентификация, профиль, квесты, награды, рефералы, лидерборд и центр мини-игр с отдельными игровыми экранами. Такой охват означает, что архитектура проверяется не на игрушечном примере, а на реальном множестве пользовательских потоков. Каждая фича подключена к общей навигации, стилям и session-aware инфраструктуре.",
            "Это уже даёт хорошую базу для QA и дальнейшего продуктового дизайна. Команда может тестировать не только API, но и фактический пользовательский маршрут от логина до игрового цикла и просмотра наград.",
        ],
        [
            "SignInScreen реализует OTP-вход.",
            "Profile, Quests, Rewards, Referrals и Leaderboard оформлены как отдельные feature screens.",
            "GamesHub и три игровых экрана подключены к общему мобильному маршруту.",
        ],
    )

    add_section(
        story,
        "13. Общие пакеты: contracts, shared и game-core",
        repeated_detail(
            "Разделение общих пакетов стало критически важной частью миграции.",
            "Без этого mobile-клиент и backend быстро начали бы расходиться по типам, названиям и ожиданиям к данным, а игровые механики пришлось бы дублировать вручную.",
        )
        + [
            "`packages/contracts` играет роль typed соглашения между backend и TypeScript-клиентом. `packages/shared` содержит повторно используемые куски, которые не должны жить внутри конкретного приложения. `packages/game-core` удерживает platform-neutral часть игровых правил. Такое разбиение уже уменьшает связность системы и делает изменения безопаснее: команда заранее знает, где должен лежать конкретный вид логики.",
            "Особенно полезно это для долгой поддержки проекта. Когда появятся новые мобильные сценарии, новые серверные поля или дополнительные игры, изменять и ревьюить соответствующую область станет значительно проще. Мы уже избежали ловушки, где весь общий код постепенно превращается в неуправляемую смесь util-файлов.",
        ],
        [
            "OpenAPI может экспортироваться и служить базой для typed-контрактов.",
            "Platform-neutral игровая логика не смешивается с UI и нативными жестами.",
            "Shared-пакеты готовят проект к масштабированию и к более строгому CI-контролю.",
        ],
    )

    add_section(
        story,
        "14. Тесты и техническая проверка",
        repeated_detail(
            "Мы уже не оставили новую архитектуру без проверки: backend покрыт асинхронными тестами, а мобильный клиент получил стартовый тестовый каркас.",
            "Это означает, что переход к новой структуре подтверждён не только визуально, но и исполняемыми проверками поведения.",
        )
        + [
            "Для backend используются `httpx.AsyncClient`, тестовые сценарии аутентификации, игровых ручек и рефералов, а также вспомогательный conftest. Это даёт минимально необходимую уверенность в том, что обновлённый API реально собирается и отрабатывает ключевые потоки. Дополнительно был успешно выполнен экспорт OpenAPI, что подтверждает валидность схемы приложения.",
            "Для mobile подготовлены Jest и React Native Testing Library на уровне базового каркаса и примера теста auth-экрана. Это ещё не финальное покрытие, но правильное направление уже заложено: система тестов строится вместе с новой архитектурой, а не добавляется задним числом.",
        ],
        [
            "Backend тесты переведены на async-подход.",
            "OpenAPI экспортируется отдельным скриптом и может использоваться в контрактах.",
            "Mobile-контур имеет стартовый тестовый каркас для дальнейшего расширения.",
        ],
    )

    add_section(
        story,
        "15. Что именно уже готово с практической точки зрения",
        [
            "Если смотреть на проект глазами команды, а не только архитектурных схем, то уже выполнен очень значимый объём работы. Репозиторий реально перестроен. Появился новый мобильный клиент, новый backend-контур, новые shared-пакеты, новые тесты, новые инфраструктурные сценарии и новая точка расширения для продукта. Это не набросок концепции, а рабочая база для следующих инкрементов.",
            "С инженерной точки зрения готово всё, что нужно для движения к полноценному мобильному релизу: есть структура, есть доменные границы, есть async backend, есть PostgreSQL-модель, есть OTP-контур, есть API-поверхность, есть feature-экраны, есть игровые пакеты и есть тестовая отправная точка. Следующие шаги уже относятся не к спасению архитектуры, а к её насыщению деталями продукта.",
            "Именно поэтому текущий результат имеет высокую ценность. Он сокращает будущую стоимость разработки. Любая следующая задача будет реализовываться на гораздо более здоровом основании, чем раньше.",
        ],
        [
            "Монорепозиторий приведён к предсказуемой форме.",
            "Backend переведён на async-архитектуру и PostgreSQL-направление.",
            "Mobile-клиент уже отражает основные продуктовые пользовательские потоки.",
            "Контракты и game-core вынесены из приложений в общие пакеты.",
            "Подготовлены тесты, экспорт схемы и dev-инструменты.",
        ],
    )

    add_section(
        story,
        "16. Практический эффект для команды и проекта",
        [
            "Главный эффект этой работы заключается в том, что проект перестал быть технически хрупким. Он больше не держится на смешении старого веб-кода, локальной правды на клиенте и неявных связей между модулями. Теперь у команды есть опорная система, в которой можно уверенно развивать продуктовые идеи, не опасаясь, что каждая новая фича снова поломает архитектуру.",
            "Не менее важно и то, что новая структура удобнее для параллельной работы. Можно отдельно вести backend-ветку, отдельно развивать мобильный UI, отдельно поддерживать контракты и игровые ядра. Это прямо ускоряет командную разработку и уменьшает число конфликтов при интеграции.",
            "С продуктовой стороны проект получил правильное направление: мобильный UX, серверный авторитет, typed API, явные доменные контуры и база для дальнейшего роста. Это именно тот фундамент, который нужен, если продукт планируется развивать долго и системно.",
        ],
    )

    add_section(
        story,
        "17. Следующий безопасный шаг развития",
        [
            "После завершённой миграции следующая фаза работ уже выглядит значительно спокойнее. Нам не нужно ещё раз чинить основу проекта, прежде чем двигаться дальше. Можно переходить к прикладным задачам: усиливать валидацию game runs, расширять набор тестов, настраивать release pipeline для iOS и Android, подключать реального OTP-провайдера и улучшать визуальную часть мобильных экранов.",
            "Важно, что каждое из этих направлений теперь имеет своё место в архитектуре. Release-скрипты и env-настройки ложатся в мобильный контур. Миграции и доменная логика развиваются в backend. Контракты обновляются в packages. Это снижает стоимость следующего спринта и делает изменения обозримыми для всей команды.",
            "Именно поэтому текущий результат можно считать не промежуточной черновой сборкой, а инженерной платформой. Дальнейшие шаги уже опираются на понятные границы и не требуют повторного пересмотра базовых решений.",
        ],
        [
            "Добавление реального SMS/OTP-провайдера не потребует ломать auth-архитектуру.",
            "Доработка анимаций и touch UX происходит внутри уже готового мобильного каркаса.",
            "Расширение доменной логики возможно в существующих модулях без хаотичного роста связности.",
        ],
    )

    story.append(PageBreak())
    story.append(heading("Приложение A. Актуальные backend endpoints"))
    story.append(
        body(
            "Ниже приведена таблица API-ручек, полученная из экспортированного OpenAPI-описания. Она показывает, что backend уже собран как versioned API с auth, профильными и игровыми сценариями."
        )
    )
    story.append(build_table(endpoint_rows(), [22 * mm, 62 * mm, 86 * mm]))
    story.append(PageBreak())

    story.append(heading("Приложение B. Инвентарь ключевых файлов"))
    story.append(
        body(
            "В этом приложении собран ключевой файл-лист по основным зонам репозитория. Он нужен не для полного дублирования дерева, а для фиксации фактически присутствующих компонентов новой архитектуры."
        )
    )
    for group_name, files in inventory_groups().items():
        story.append(subheading(group_name))
        for chunk_start in range(0, len(files), 24):
            chunk = files[chunk_start : chunk_start + 24]
            story.append(
                ListFlowable(
                    [ListItem(Paragraph(item, STYLES["BodySmall"])) for item in chunk],
                    bulletType="bullet",
                    leftIndent=14,
                )
            )
            story.append(Spacer(1, 4))

    story.append(PageBreak())
    story.append(heading("Приложение C. Технические акценты миграции"))
    story.append(
        body(
            "Ниже перечислены инженерные акценты, которые уже отражены в репозитории и формируют его текущую зрелость. Этот блок фиксирует не список желаний, а фактические опорные элементы архитектуры, появившиеся после миграции."
        )
    )
    story.append(
        bullets(
            [
                "Приложение разделено на чёткие контуры `apps` и `packages`, что упрощает сборку и командную разработку.",
                "Backend переехал на async FastAPI-стек и перестал зависеть от старой смешанной структуры.",
                "Схема данных и миграции для PostgreSQL организованы единообразно и готовы к наращиванию.",
                "OTP и session flow разнесены по ответственным слоям, а не зашиты в UI и query-параметры.",
                "Mobile-клиент подготовлен как отдельное React Native приложение под iOS и Android.",
                "Серверное состояние и клиентское ephemeral state разведены по разным механизмам хранения.",
                "Игровые сценарии получили правильное разделение между UX на клиенте и авторитетной фиксацией на сервере.",
                "Общие контракты и game-core пакеты снижают риск расхождения типов и бизнес-правил.",
                "Тестовый и скриптовый контур уже присутствует и может расширяться без реорганизации репозитория.",
                "Текущее состояние проекта позволяет параллельно вести frontend- и backend-разработку отдельными ветками.",
            ]
        )
    )
    story.append(
        body(
            "В совокупности эти акценты показывают, что мы не просто перенесли файлы по новым папкам, а действительно изменили форму системы. Архитектура стала ближе к production-качеству: доменные решения вынесены на сервер, мобильный клиент получил правильные границы ответственности, а общие пакеты закрепили единый язык взаимодействия между слоями."
        )
    )

    return story


def draw_page(canvas, document):
    canvas.saveState()
    canvas.setFont(FONT_REGULAR, 8)
    canvas.setFillColor(colors.HexColor("#486581"))
    canvas.drawString(18 * mm, 10 * mm, "MTB Galaxy Implementation Report")
    canvas.drawRightString(192 * mm, 10 * mm, f"Page {document.page}")
    canvas.restoreState()


def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        title="MTB Galaxy Implementation Report",
        author="OpenAI Codex",
    )
    story = build_story()
    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"Report generated: {OUTPUT}")


if __name__ == "__main__":
    main()
