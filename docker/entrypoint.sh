#!/usr/bin/env sh
set -e

mkdir -p /app/staticfiles /app/media /app/media/exports
chown -R appuser:appuser /app/staticfiles /app/media

if [ "$#" -gt 0 ]; then
    exec gosu appuser "$@"
fi

exec gosu appuser python -m gunicorn \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --threads 2 \
    --timeout 60 \
    --forwarded-allow-ips="*" \
    --access-logfile - \
    --error-logfile - \
    djangoCRM.wsgi:application
