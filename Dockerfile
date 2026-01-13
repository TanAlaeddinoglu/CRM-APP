#FROM python:3.11-slim
#
#ENV PYTHONDONTWRITEBYTECODE=1 \
#    PYTHONUNBUFFERED=1
#
#WORKDIR /app
#
#RUN apt-get update && apt-get install -y \
#    build-essential \
#    libpq-dev \
#    && rm -rf /var/lib/apt/lists/*
#
#COPY requirements.txt .
#RUN pip install --no-cache-dir -r requirements.txt
#
#COPY . .
#RUN chmod +x /app/docker/entrypoint.sh
#
#ENTRYPOINT ["/app/docker/entrypoint.sh"]

# Stage 1: Base build stage
FROM python:3.11-slim AS builder

# Create the app directory
RUN mkdir /app

# Set the working directory
WORKDIR /app

# Set environment variables to optimize Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install dependencies first for caching benefit
RUN pip install --upgrade pip
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Production stage
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends gosu && \
   rm -rf /var/lib/apt/lists/* && \
   useradd -m -r appuser && \
   mkdir /app && \
   chown -R appuser /app

# Copy the Python dependencies from the builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Set the working directory
WORKDIR /app

# Copy application code
COPY --chown=appuser:appuser . .

# Set environment variables to optimize Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Expose the application port
EXPOSE 8000

# Make entry file executable
RUN chmod +x /app/docker/entrypoint.sh

# Start the application using the entrypoint script
ENTRYPOINT ["/app/docker/entrypoint.sh"]
