FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Declare /app as a volume so the SQLite database file (fraudlens.db)
# can be mounted from the host instead of being baked into the image.
VOLUME ["/app"]

# Default: run Kafka consumer (listen for events and persist to DB)
CMD ["python", "-u", "kafka_consumer.py"]
