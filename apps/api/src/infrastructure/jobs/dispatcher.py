from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class JobDispatcher:
    async def send_otp(self, *, phone: str, code: str) -> None:
        logger.info("OTP requested for %s, code=%s", phone, code)
