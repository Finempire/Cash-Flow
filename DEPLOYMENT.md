# Deployment Guide - Petty Cash Procurement Management System

## Prerequisites
- GitHub account with access to https://github.com/Finempire/Cash-Flow.git
- Linode VPS (Ubuntu 22.04 LTS) at 172.105.56.225
- Cloudflare R2 or AWS S3 bucket for document storage
- SMTP credentials for email notifications (optional)

---

## PHASE 1: Push Code to GitHub

```bash
# In project root directory
git init
git remote add origin https://github.com/Finempire/Cash-Flow.git
git add .
git commit -m "Initial commit: Textile Petty Cash System"
git branch -M main
git push -u origin main
```

> **IMPORTANT**: Ensure `.gitignore` excludes `.env`, `.env.local`, `node_modules`, `.next`. Never commit credentials.

---

## PHASE 2: Prepare the Linode Ubuntu VPS

SSH into server:
```bash
ssh root@172.105.56.225
```

### Step 1 - System update
```bash
apt update && apt upgrade -y
```

### Step 2 - Install Node.js 20 LTS via NVM
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v && npm -v
```

### Step 3 - Install PM2
```bash
npm install -g pm2
```

### Step 4 - Install PostgreSQL
```bash
apt install postgresql postgresql-contrib -y
systemctl start postgresql
systemctl enable postgresql
```

### Step 5 - Create database and user
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE cashflow_db;
CREATE USER cashflow_user WITH ENCRYPTED PASSWORD 'YOUR_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE cashflow_db TO cashflow_user;
\q
```

### Step 6 - Install Nginx
```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

### Step 7 - Configure firewall
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## PHASE 3: Clone & Configure the App

### Step 1 - Clone from GitHub
```bash
cd /var/www
git clone https://github.com/Finempire/Cash-Flow.git
cd Cash-Flow
```

### Step 2 - Create `.env` file
```bash
nano .env
```

Paste and fill in values:
```env
DATABASE_URL="postgresql://cashflow_user:YOUR_DB_PASSWORD@localhost:5432/cashflow_db"
NEXTAUTH_SECRET="generate_a_random_64_char_secret_here"
NEXTAUTH_URL="http://172.105.56.225"
S3_ACCESS_KEY="your_cloudflare_r2_or_aws_access_key"
S3_SECRET_KEY="your_cloudflare_r2_or_aws_secret_key"
S3_BUCKET_NAME="cashflow-documents"
S3_REGION="auto"
S3_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
SMTP_HOST="your_smtp_host"
SMTP_PORT="587"
SMTP_USER="your_email"
SMTP_PASS="your_email_password"
SMTP_FROM="noreply@cashflow.com"
```

Generate a secret:
```bash
openssl rand -base64 48
```

### Step 3 - Install dependencies
```bash
npm install --legacy-peer-deps
```

### Step 4 - Run Prisma migrations
```bash
npx prisma generate
npx prisma migrate deploy
```

If no migrations exist yet, run:
```bash
npx prisma migrate dev --name init
```

### Step 5 - Seed initial users
```bash
npx prisma db seed
```

### Step 6 - Build the Next.js app
```bash
npm run build
```

### Step 7 - Start with PM2
```bash
pm2 start npm --name "cashflow" -- start
pm2 save
pm2 startup
```

---

## PHASE 4: Configure Nginx Reverse Proxy

### Create Nginx config
```bash
nano /etc/nginx/sites-available/cashflow
```

Paste:
```nginx
server {
    listen 80;
    server_name 172.105.56.225;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable the site
```bash
ln -s /etc/nginx/sites-available/cashflow /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

App is now live at: **http://172.105.56.225**

---

## PHASE 5: Future Code Updates

```bash
cd /var/www/Cash-Flow
git pull origin main
npm install --legacy-peer-deps
npx prisma migrate deploy
npm run build
pm2 restart cashflow
```

---

## Seed Users

| Role           | Email                    | Password    |
|----------------|--------------------------|-------------|
| STORE_MANAGER  | manager@cashflow.com     | Change@123  |
| RUNNER         | runner@cashflow.com      | Change@123  |
| ACCOUNTANT     | accountant@cashflow.com  | Change@123  |
| CEO            | ceo@cashflow.com         | Change@123  |

All users must change password on first login.
