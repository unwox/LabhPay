"""
Structured, PII-scrubbing logger.
Use `get_logger(__name__)` everywhere. Never log raw user content.
"""

import logging
import os
import sys

import structlog

from utils.masking import scrub_for_logs


def _scrub_processor(_logger, _name, event_dict):
    if os.getenv("LOG_SCRUB_PII", "true").lower() != "false":
        for k, v in list(event_dict.items()):
            if isinstance(v, str):
                event_dict[k] = scrub_for_logs(v)
    return event_dict


def configure() -> None:
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level, logging.INFO),
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=True),
            _scrub_processor,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level, logging.INFO)
        ),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = "labhpay"):
    return structlog.get_logger(name)


configure()
