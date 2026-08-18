# คู่มือการติดตั้งระบบจัดซื้อวัสดุพัสดุ (Production Installation & Deployment Guide v1.19)

คู่มือนี้ระบุขั้นตอนแบบละเอียดตั้งแต่ศูนย์ (Step-by-Step) สำหรับการติดตั้งระบบบนเซิร์ฟเวอร์จริง (Production Server) โดยอ้างอิงตามสถาปัตยกรรมและรายละเอียดโครงสร้างพื้นฐานดังนี้:
* **Frontend & API Server (Node.js Express App):** รันบน IP **`10.1.0.15:3005`** (หรือตามไอพีเซิร์ฟเวอร์หลักของคุณ) ให้บริการผ่าน subpath **`/MatPlan`**
* **Database Server (MySQL):** ติดตั้งบน IP **`10.1.0.201`** พอร์ต `3306` (ชื่อฐานข้อมูล: `MatPlan`)

> 💡 **หมายเหตุสำหรับการอัปเดตระบบที่มีอยู่แล้ว:**
> หากท่านมีระบบเดิมติดตั้งอยู่แล้วบนเซิร์ฟเวอร์ และต้องการอัปเดตระบบเดิมขึ้นเป็นเวอร์ชันปัจจุบัน สามารถอ่านขั้นตอนการอัปเดตแบบละเอียดได้ในไฟล์ [UPDATE.md](./UPDATE.md)

---

## สารบัญ (Table of Contents)
1. [การเตรียมเครื่องและระบบฐานข้อมูล MySQL (`10.1.0.201`)](#1-การเตรียมเครื่องและระบบฐานข้อมูล-mysql-1010201)
2. [การเตรียมเครื่องและติดตั้งระบบฝั่ง Application (`10.1.0.15`)](#2-การเตรียมเครื่องและติดตั้งระบบฝั่ง-application-101015)
3. [การตั้งค่า Environment Variables (`.env`)](#3-การตั้งค่า-environment-variables-env)
4. [การ Build และการรันเซิร์ฟเวอร์ในโหมด Production](#4-การ-build-และการรันเซิร์ฟเวอร์ในโหมด-production)
5. [การตั้งค่า Nginx Reverse Proxy (สำหรับ Subpath `/MatPlan`)](#5-การตั้งค่า-nginx-reverse-proxy-สำหรับ-subpath-matplan)
6. [วิธีการทดสอบระบบและ API](#6-วิธีการทดสอบระบบและ-api)
7. [สถาปัตยกรรมและความปลอดภัย (Bcrypt, Audit Logs & SSE Real-time)](#7-สถาปัตยกรรมและความปลอดภัย-bcrypt-audit-logs--sse-real-time)

---

## 1. การเตรียมเครื่องและระบบฐานข้อมูล MySQL (`10.1.0.201`)

ฝั่งเซิร์ฟเวอร์ฐานข้อมูลให้เข้าใช้ฐานข้อมูล MySQL และสั่งการคำสั่ง SQL ดังนี้:

### 1.1 สร้าง Database และสิทธิ์ผู้ใช้งาน
ล็อกอินเข้าใช้งาน MySQL ในฐานะ root แล้วรันคำสั่ง SQL ต่อไปนี้:

```sql
-- 1. สร้างฐานข้อมูลสำหรับการสำรวจและงบประมาณวัสดุ
CREATE DATABASE IF NOT EXISTS MatPlan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. สร้างตารางสำหรับเก็บข้อมูลสถานะของระบบ (ระบบจะสร้างตาราง Relational อื่นๆ เพิ่มเติมให้อัตโนมัติเมื่อเริ่มแอปครั้งแรก)
USE MatPlan;

CREATE TABLE IF NOT EXISTS system_state (
  id INT PRIMARY KEY DEFAULT 1,
  state_data LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. กำหนดสิทธิ์ผู้ใช้เพื่อให้เครื่อง App Server (10.1.0.15) เชื่อมต่อเข้ามาได้
CREATE USER IF NOT EXISTS 'root'@'10.1.0.15' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON MatPlan.* TO 'root'@'10.1.0.15';
FLUSH PRIVILEGES;
```

> **ข้อแนะนำเพิ่มเติม:** ในไฟล์ตั้งค่า MySQL ของเครื่อง `10.1.0.201` (ไฟล์ `my.cnf` หรือ `/etc/mysql/mysql.conf.d/mysqld.cnf`) ตรวจสอบให้แน่ใจว่าได้เปิดให้รับการเชื่อมต่อภายนอก โดยบรรทัด `bind-address` จะต้องไม่ถูกผูกเฉพาะ `127.0.0.1` ให้ปรับเป็น:
> ```ini
> bind-address = 0.0.0.0
> ```
> และเปิดพอร์ต `3306` ใน Firewall ของเครื่องฐานข้อมูลให้ IP `10.1.0.15` สามารถเชื่อมต่อได้

---

## 2. การเตรียมเครื่องและติดตั้งระบบฝั่ง Application (`10.1.0.15`)

### 2.1 ติดตั้ง Node.js (เวอร์ชัน 18 ขึ้นไป)
รันคำสั่งบน Ubuntu/Debian:
```bash
# อัปเดตแพ็คเกจ
sudo apt update && sudo apt upgrade -y

# ดาวน์โหลดและติดตั้ง Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs build-essential

# ตรวจสอบเวอร์ชันหลังติดตั้ง
node -v
npm -v
```

### 2.2 ติดตั้ง PM2 สำหรับบริหารจัดการโปรเซส Node.js
```bash
sudo npm install -g pm2
```

### 2.3 โคลนโค้ดและเตรียมโครงสร้างโฟลเดอร์
```bash
# นำโค้ดโปรเจกต์มาวางไว้ที่ไดเรกทอรี /var/www/MatPlan
sudo mkdir -p /var/www/MatPlan
sudo chown -R $USER:$USER /var/www/MatPlan
cd /var/www/MatPlan

# นำไฟล์ซอร์สโค้ดโปรเจกต์ลงในโฟลเดอร์นี้
```

### 2.4 ติดตั้ง Dependencies
```bash
npm install
```

---

## 3. การตั้งค่า Environment Variables (`.env`)

สร้างไฟล์ชื่อว่า `.env` ไว้ที่โฟลเดอร์หลักของโปรเจกต์ (`/var/www/MatPlan/.env`):

```env
PORT=3005
APP_URL="http://10.1.0.15:3000/MatPlan"

# การเชื่อมต่อฐานข้อมูล MySQL Server
DB_HOST=10.1.0.201
DB_PORT=3306
DB_USER=root
DB_PASS=your_secure_password
DB_NAME=MatPlan

# JWT Authentication Secret Key
JWT_SECRET=MatPlan_SecretKey_2026_SecureKey_ChangeThis
```

---

## 4. การ Build และการรันเซิร์ฟเวอร์ในโหมด Production

### 4.1 สั่ง Build โปรเจกต์ (Frontend & Bundled Backend)
```bash
npm run build
```
*(คำสั่งนี้จะคอมไพล์ Frontend ไปที่โฟลเดอร์ `dist/` และบันเดิล Backend เป็นไฟล์เดียวคือ `dist/server.cjs`)*

### 4.2 สั่งรัน Production Server ด้วย PM2
```bash
# เริ่มต้นรันกระบวนการ
pm2 start dist/server.cjs --name MatPlan

# ตั้งค่าให้ PM2 สตาร์ตอัตโนมัติเมื่อรีบูตเครื่อง
pm2 save
pm2 startup
```

---

## 5. การตั้งค่า Nginx Reverse Proxy (สำหรับ Subpath `/MatPlan`)

ติดตั้งและตั้งค่า Nginx ให้ทำหน้าที่ Proxy คำขอจากพอร์ต 3000 (หรือ 80) เข้าสู่พอร์ต 3005:

```nginx
# /etc/nginx/sites-available/matplan.conf

server {
    listen 3000;
    server_name 10.1.0.15;

    # รองรับการอัปโหลดไฟล์/ข้อมูลขนาดใหญ่
    client_max_body_size 50M;

    location /MatPlan/ {
        proxy_pass http://127.0.0.1:3005/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # รองรับ Server-Sent Events (SSE Real-time)
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}
```

สั่งเปิดใช้งานการตั้งค่าและรีโหลด Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/matplan.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 6. วิธีการทดสอบระบบและ API

1. **ตรวจสอบความพร้อมของระบบ (Health Check):**
   ```bash
   curl http://127.0.0.1:3005/api/health
   # ผลลัพธ์: {"status":"ok","mode":"production"}
   ```

2. **ตรวจสอบการเชื่อมต่อฐานข้อมูล MySQL:**
   ```bash
   curl http://127.0.0.1:3005/api/db-status
   # ผลลัพธ์: {"success":true,"connected":true,"dbType":"mysql",...}
   ```

3. **ตรวจสอบประวัติ Audit Trail ของรายการคำขอ:**
   ```bash
   curl http://127.0.0.1:3005/api/requests/REQ-101/history
   ```

---

## 7. สถาปัตยกรรมและความปลอดภัย (Bcrypt, Audit Logs & SSE Real-time)

- **ความปลอดภัยของรหัสผ่าน:** รหัสผ่านทุกบัญชีจะถูกเข้ารหัสผ่านทางเดียว (Bcrypt, 10 Salt Rounds) และจะไม่ถูกส่งออกทาง API Payload (`GET /api/state`)
- **การตรวจสอบย้อนหลังตามระเบียบพัสดุ:** บันทึกประวัติการแก้ไขทุกขั้นตอนทั้งจำนวนเก่า/ใหม่, สถานะ, ผู้ดำเนินการ, เวลา และเหตุผลความจำเป็นลงในตาราง `request_audit_logs`
- **การเชื่อมต่อแบบเรียลไทม์:** ใช้ Server-Sent Events (SSE) `/api/events` สำหรับอัปเดตข้อมูลและแจ้งเตือนผู้ใช้งานข้ามอุปกรณ์แบบทันที
