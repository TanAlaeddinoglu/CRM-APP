#!/usr/bin/env sh
set -e

mkdir -p /app/staticfiles
chown -R appuser:appuser /app/staticfiles

python manage.py collectstatic --noinput
python manage.py migrate --noinput
exec gosu appuser python -m gunicorn --bind 0.0.0.0:8000 --workers 3 --forwarded-allow-ips="*" djangoCRM.wsgi:application
