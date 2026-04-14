FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 8000

ENV DJANGO_SETTINGS_MODULE=app.settings

ENTRYPOINT ["./entrypoint.sh"]
