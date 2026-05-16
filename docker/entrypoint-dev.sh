#!/usr/bin/env sh
set -e

mkdir -p /app/staticfiles /app/media /app/media/exports
chown -R appuser:appuser /app/staticfiles /app/media

if [ "$#" -gt 0 ]; then
    exec gosu appuser "$@"
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput

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
