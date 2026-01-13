#!/usr/bin/env sh
set -e

mkdir -p /app/staticfiles
chown -R appuser:appuser /app/staticfiles

python manage.py migrate --noinput

exec gosu appuser python -m gunicorn \
    --bind 0.0.0.0:8000 \
    --reload \
    --workers 2 \
    --threads 2 \
    --timeout 120 \
    --forwarded-allow-ips="*" \
    --access-logfile - \
    --error-logfile - \
    djangoCRM.wsgi:application
