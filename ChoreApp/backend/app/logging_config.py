import logging.config

from app.config import settings


def configure_logging() -> None:
    level = settings.log_level.upper()
    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "standard": {
                    "format": "%(asctime)s %(levelname)s [%(name)s] %(message)s",
                }
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "standard",
                    "level": level,
                }
            },
            "root": {
                "handlers": ["default"],
                "level": level,
            },
            "loggers": {
                "uvicorn.error": {
                    "level": level,
                    "handlers": ["default"],
                    "propagate": False,
                },
                "uvicorn.access": {
                    "level": level,
                    "handlers": ["default"],
                    "propagate": False,
                },
                "app": {
                    "level": level,
                    "handlers": ["default"],
                    "propagate": False,
                },
            },
        }
    )
