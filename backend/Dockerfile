FROM node:20-bookworm

WORKDIR /app

# Install Python
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv && \
    rm -rf /var/lib/apt/lists/*

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Python virtual environment
COPY requirements.txt ./

RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r requirements.txt

# Install Playwright Chromium + required Linux dependencies
RUN /opt/venv/bin/python -m playwright install --with-deps chromium

# Copy backend
COPY . .

# Make venv Python available as "python"
ENV PATH="/opt/venv/bin:$PATH"

ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1

EXPOSE 10000

CMD ["node", "app.js"]