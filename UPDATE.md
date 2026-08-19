# คู่มือการอัปเดตระบบจัดซื้อวัสดุพัสดุ - เวอร์ชัน 1.29 (System Update Guide v1.29)

เอกสารฉบับนี้สรุปขั้นตอนการอัปเดตระบบขึ้นสู่ **เวอร์ชัน 1.29 (Version 1.29)** ซึ่งมาพร้อมกับฟีเจอร์และการปรับปรุงสำคัญ:
1. **Relational Database Schema เต็มรูปแบบ**: แยกตารางจริง 10 ตาราง (`requests`, `users`, `departments`, `work_groups`, `request_audit_logs`, `custom_categories`, `custom_units`, `system_logs`, `system_settings`, `system_state`)
2. **ระบบรักษาความปลอดภัยรหัสผ่าน (Password Security)**: เข้ารหัสผ่านทางเดียวด้วย `Bcrypt` (10 Salt Rounds) พร้อมตัดรหัสผ่านออกจาก Payload ข้อมูลที่ส่งให้ Client ทั้งหมด
3. **ระบบตรวจสอบย้อนหลังระดับฟิลด์ (Government Procurement Audit Trail)**: ตาราง `request_audit_logs` บันทึกค่าเดิม $\rightarrow$ ค่าใหม่ (Before/After Diff), เหตุผล, ข้อคิดเห็น, ผู้กระทำ, เวลา และเปิด API `GET /api/requests/:id/history`
4. **เครื่องมือสำรวจและยื่นคำขอแบบสมาร์ท (Smart Survey Tools)**:
   - แถบเครื่องมือคัดลอกยอดใช้จริงปีก่อนหน้า (Quick Fill: 100%, +5%, +10%, เฉลี่ย 3 ปีย้อนหลัง)
   - แถบสรุปยอดจำนวนและงบประมาณประมาณการรวมแบบลอยตัว (Sticky Mini-Summary Bar)
   - สวิตช์สลับความกระชับของตาราง (Table Density Toggle: Compact / Standard)
   - ระบบค้นหาวัสดุและรหัส GPSC แบบ Clean Table Filter
5. **ศูนย์รวมการจัดการหมวดหมู่ All-in-One**: ยุบรวมการเพิ่ม/ลบ/กรองหมวดหมู่เข้าด้วยกันในหน้าผู้ดูแลระบบ

---

## สารบัญ (Table of Contents)
1. [สิ่งที่เปลี่ยนแปลงในฐานข้อมูล (Database Schema v1.29)](#1-สิ่งที่เปลี่ยนแปลงในฐานข้อมูล-database-schema-v129)
2. [ขั้นตอนการอัปเดตระบบแบบ Step-by-Step](#2-ขั้นตอนการอัปเดตระบบแบบ-step-by-step)
3. [การตั้งค่า Environment Variables (`.env`)](#3-การตั้งค่า-environment-variables-env)
4. [การตรวจสอบความถูกต้องหลังอัปเดต (Verification & Health Check)](#4-การตรวจสอบความถูกต้องหลังอัปเดต-verification--health-check)
5. [การรับมือและแก้ไขปัญหา (Troubleshooting & Rollback)](#5-การรับมือและแก้ไขปัญหา-troubleshooting--rollback)

---

## 1. สิ่งที่เปลี่ยนแปลงในฐานข้อมูล (Database Schema v1.29)

ระบบมีกลไก **Automatic Schema Migration & Synchronization** ในตัว เมื่อเริ่มรันระบบ ตัวแอปจะตรวจสอบและสร้าง/อัปเกรดตารางทั้งหมดให้อัตโนมัติ:

| ชื่อตาราง (Table Name) | ลักษณะการทำงาน | วัตถุประสงค์ |
| :--- | :--- | :--- |
| `requests` | **Relational Table** | บันทึกรายการคำขอแผนความต้องการพัสดุ รองรับ Pagination |
| `request_audit_logs` | **Relational Table** | บันทึกประวัติการเปลี่ยนแปลงแก้ไขรายบรรทัด (Before/After Diff) ตามระเบียบพัสดุ |
| `users` | **Relational Table** | ข้อมูลผู้ใช้งานและสิทธิ์ เข้ารหัสผ่านด้วย Bcrypt One-Way Hash |
| `departments` | **Relational Table** | ข้อมูลฝ่าย/แผนก และการจัดสรรกลุ่มงาน |
| `work_groups` | **Relational Table** | ข้อมูลกลุ่มงานหลัก |
| `custom_categories` | **Relational Table** | จัดเก็บหมวดหมู่วัสดุที่ผู้ใช้งานเพิ่มใหม่ในแค็ตตาล็อกกลาง |
| `custom_units` | **Relational Table** | จัดเก็บหน่วยนับเฉพาะของแต่ละรายการพัสดุ |
| `system_logs` | **Relational Table** | บันทึกเหตุการณ์ระดับระบบ |
| `system_settings` | **Relational Table** | บันทึกค่าตั้งค่าระบบ (แช่แข็งแผน, สิทธิ์ปรับปรุงแผนกลางปี, ราคาประเมิน) |
| `system_state` | **Compatibility** | บันทึกสถานะรวมเพื่อความเข้ากันได้ย้อนหลัง |

---

## 2. ขั้นตอนการอัปเดตระบบแบบ Step-by-Step

### ขั้นตอนที่ 1: สำรองข้อมูลเดิม (Backup Database & .env)
```bash
# 1. สำรองข้อมูลฐานข้อมูล MySQL เดิม
mysqldump -u root -p MatPlan > backup_matplan_before_v1_29.sql

# 2. สำรองไฟล์ .env เดิม
cp /var/www/MatPlan/.env /var/www/MatPlan/.env.backup
```

---

### ขั้นตอนที่ 2: ดึงซอร์สโค้ดเวอร์ชัน 1.29 ลงเครื่อง Application Server
```bash
cd /var/www/MatPlan
git pull origin main
```

---

### ขั้นตอนที่ 3: ติดตั้ง Dependencies และ Build ระบบใหม่
```bash
# ติดตั้งไลบรารีใหม่ (รวมถึง bcryptjs, jsonwebtoken, mysql2, recharts, xlsx)
npm install

# คอมไพล์โปรเจกต์ (สร้าง dist/ และ dist/server.cjs)
npm run build
```

---

### ขั้นตอนที่ 4: รีสตาร์ตกระบวนการทำงาน PM2 ด้วย Bundle ใหม่

```bash
# 1. ตรวจสอบชื่อโปรเซสเดิม
pm2 status

# 2. ลบโปรเซสเดิม
pm2 delete MatPlan

# 3. เริ่มต้นใหม่ด้วย dist/server.cjs
pm2 start dist/server.cjs --name MatPlan

# 4. บันทึกการตั้งค่า PM2
pm2 save

# 5. ลบไฟล์ server.js เก่า (หากมี) ใน root เพื่อป้องกันความสับสน
rm -f server.js
```

---

## 3. การตั้งค่า Environment Variables (`.env`)

ตรวจสอบไฟล์ `/var/www/MatPlan/.env` ให้มีค่าดังนี้:

```env
PORT=3005
APP_URL="http://10.1.0.15:3000/MatPlan"

# การเชื่อมต่อฐานข้อมูล MySQL Server
DB_HOST=10.1.0.201
DB_PORT=3306
DB_USER=root
DB_PASS=your_secure_password
DB_NAME=MatPlan

# คีย์สำหรับเข้ารหัส JWT Token
JWT_SECRET=MatPlan_SecretKey_2026_SecureKey_ChangeThis
```

---

## 4. การตรวจสอบความถูกต้องหลังอัปเดต (Verification & Health Check)

1. **ตรวจสอบความพร้อมของระบบผ่าน API Health Check:**
   ```bash
   curl http://127.0.0.1:3005/api/health
   # ควรได้รับผลลัพธ์: {"status":"ok","mode":"production"}
   ```

2. **ตรวจสอบการเชื่อมต่อฐานข้อมูล MySQL:**
   ```bash
   curl http://127.0.0.1:3005/api/db-status
   # ควรได้รับ: {"success":true,"connected":true,"dbType":"mysql",...}
   ```

3. **ตรวจสอบตารางใน MySQL Server:**
   เปิดโปรแกรมจัดการฐานข้อมูล (HeidiSQL / Navicat / DBeaver) จะต้องพบตารางทั้งหมด 10 ตารางตามที่ระบุในข้อ 1

4. **ทดสอบล็อกอินและฟังก์ชันใหม่:**
   - เข้าใช้งานผ่านเบราว์เซอร์ ทดสอบหน้าล็อกอิน
   - ทดสอบปุ่มดึงยอดปีก่อน (Quick Fill) ในหน้ากรอกคำขอ
   - ทดสอบสวิตช์ปรับความกระชับตาราง (Compact / Standard)
   - ตรวจสอบ Audit Trail Modal

---

## 5. การรับมือและแก้ไขปัญหา (Troubleshooting & Rollback)

- **หากหน้าจอยังแสดงเวอร์ชันเก่า:**
  ให้กด `Ctrl + F5` หรือ `Cmd + Shift + R` บนเบราว์เซอร์เพื่อล้างแคช
- **หาก PM2 สตาร์ตไม่ขึ้น:**
  ตรวจสอบบันทึกข้อผิดพลาดด้วยคำสั่ง `pm2 logs MatPlan`
- **การ Rollback ข้อมูล (หากจำเป็น):**
  ```bash
  mysql -u root -p MatPlan < backup_matplan_before_v1_29.sql
  ```
