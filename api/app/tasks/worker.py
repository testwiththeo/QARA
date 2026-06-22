from __future__ import annotations

import logging

from app.config import settings
from app.tasks.settings import redis_settings
from app.tasks.triage_task import triage_bug
from app.tasks.integration_task import create_jira_ticket, send_slack_notify

logger = logging.getLogger("qara.worker")


class WorkerSettings:
    functions = [triage_bug, create_jira_ticket, send_slack_notify]
    redis_settings = redis_settings
    max_tries = settings.arq_max_tries
    retry_jobs = True
