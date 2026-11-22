# HackHub Production Deployment & Operations Guide
**Platform:** HackHub Full-Stack Innovation Platform  
**Target Environments:** Linux (Ubuntu 22.04 LTS / Debian 12), Windows Server, Docker Containers

---

## 1. System Requirements & Prerequisites
- **Node.js:** v18.x LTS or v20.x LTS
- **Package Manager:** npm v9+
- **Database:** MySQL 8.0+
- **Reverse Proxy / Web Server:** Nginx 1.20+ (for production TLS/SSL termination)
- **Process Manager:** PM2 (`npm install -g pm2`) or Docker Engine 24+

---

## 2. Option A: Docker Compose Deployment (Recommended for Quick Production)

The fastest method to deploy HackHub with MySQL 8.0, Node.js API, and Nginx web server configured:

### Step 1: Clone Repository
```bash
git clone https://github.com/kushtayal2020-agr/HackHub.git
cd HackHub
```

### Step 2: Configure Environment Variables
Copy and inspect `.env.example`:
```bash
cp .env.example .env
```

### Step 3: Launch with Docker Compose
```bash
docker-compose up -d --build
```

### Step 4: Verify Containers
```bash
docker-compose ps
```
- Frontend Web App: `http://localhost:8080`
- Backend API & WebSockets: `http://localhost:5000`
- Database: MySQL initialized with `schema_deploy.sql` automatically.

---

## 3. Option B: Native Deployment (PM2 + Nginx + MySQL)

### Step 1: Database Setup
1. Log in to MySQL root console:
   ```bash
   mysql -u root -p
   ```
2. Create database and user:
   ```sql
   CREATE DATABASE hackhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'hackhub_user'@'localhost' IDENTIFIED BY 'StrongPassword@2026';
   GRANT ALL PRIVILEGES ON hackhub.* TO 'hackhub_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
3. Import the clean production schema with demo accounts:
   ```bash
   mysql -u hackhub_user -p hackhub < schema_deploy.sql
   ```

### Step 2: Backend Configuration & PM2 Startup
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd Backend
   npm ci --production
   ```
2. Create `.env` file:
   ```bash
   cat << 'EOF' > .env
   PORT=5000
   NODE_ENV=production
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=hackhub_user
   DB_PASSWORD=StrongPassword@2026
   DB_NAME=hackhub
   JWT_SECRET=8f9a2e4b6c8d0e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b1c3d5e7f9a1b3c5d7e9f
   FRONTEND_URL=https://hackhub.yourdomain.com
   EOF
   ```
3. Start the application with PM2:
   ```bash
   pm2 start server.js --name "hackhub-api" --instances max --exec-mode cluster
   pm2 save
   pm2 startup
   ```

### Step 3: Nginx Web Server & Reverse Proxy Configuration
Create an Nginx server block at `/etc/nginx/sites-available/hackhub`:
```nginx
server {
    listen 80;
    server_name hackhub.yourdomain.com;

    # Static Frontend Assets
    root /var/www/HackHub/Frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy to Node.js Backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads Static Files
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000/uploads/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Socket.io Real-Time WebSocket Proxy
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Enable the site and reload Nginx:
```bash
ln -s /etc/nginx/sites-available/hackhub /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Step 4: SSL Certificate with Let's Encrypt
```bash
certbot --nginx -d hackhub.yourdomain.com
```

---

## 4. Verification & Healthchecks
1. **API Healthcheck:**
   ```bash
   curl http://localhost:5000/api/health
   # Returns: {"status":"ok","message":"HackHub API is running"}
   ```
2. **Database Connectivity:**
   ```bash
   curl http://localhost:5000/api/db-check
   # Returns: {"status":"success","message":"MySQL database connected successfully!"}
   ```

---

## 5. Maintenance & Database Backups
Automate daily backups using `mysqldump` and cron:
```bash
# Add to crontab (runs at 02:00 AM daily)
0 2 * * * mysqldump -u hackhub_user -p'StrongPassword@2026' hackhub | gzip > /backups/hackhub_$(date +\%F).sql.gz
```
To restore a backup:
```bash
gunzip < /backups/hackhub_2026-11-23.sql.gz | mysql -u hackhub_user -p hackhub
```
