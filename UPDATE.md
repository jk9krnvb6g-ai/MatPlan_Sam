# คู่มือการอัปเดตระบบจัดซื้อวัสดุพัสดุ - เวอร์ชัน 1.19 (System Update Guide v1.19)

เอกสารฉบับนี้สรุปขั้นตอนการอัปเดตระบบขึ้นสู่ **เวอร์ชัน 1.19 (Version 1.19)** ซึ่งมาพร้อมกับ:
1. **Relational Database Schema เต็มรูปแบบ**: แยกตารางจริง 10 ตาราง (`requests`, `users`, `departments`, `work_groups`, `request_audit_logs`, `custom_categories`, `custom_units`, `system_logs`, `system_settings`, `system_state`)
2. **ระบบรักษาความปลอดภัยรหัสผ่าน (Password Security)**: เข้ารหัสผ่านทางเดียวด้วย `Bcrypt` (10 Salt Rounds) พร้อมตัดรหัสผ่านออกจาก Payload ข้อมูลที่ส่งให้ Client ทั้งหมด
3. **ระบบตรวจสอบย้อนหลังระดับฟิลด์ (Government Procurement Audit Trail)**: ตาราง `request_audit_logs` บันทึกค่าเดิม $\rightarrow$ ค่าใหม่ (Before/After Diff), เหตุผล, ข้อคิดเห็น, ผู้กระทำ, เวลา และเปิด API `GET /api/requests/:id/history`
4. **ระบบหมวดหมู่และหน่วยนับไดนามิก (Custom Categories & Units)**: รองรับการเพิ่มหมวดหมู่ใหม่และการผูกหน่วยนับเฉพาะของแต่ละรายการในฐานข้อมูล MySQL โดยตรง

---

## สารบัญ (Table of Contents)
1. [สิ่งที่เปลี่ยนแปลงในฐานข้อมูล (Database Schema v1.19)](#1-สิ่งที่เปลี่ยนแปลงในฐานข้อมูล-database-schema-v119)
2. [ขั้นตอนการอัปเดตระบบแบบ Step-by-Step](#2-ขั้นตอนการอัปเดตระบบแบบ-step-by-step)
3. [การตั้งค่า Environment Variables (`.env`)](#3-การตั้งค่า-environment-variables-env)
4. [การตรวจสอบความถูกต้องหลังอัปเดต (Verification & Health Check)](#4-การตรวจสอบความถูกต้องหลังอัปเดต-verification--health-check)
5. [การรับมือและแก้ไขปัญหา (Troubleshooting & Rollback)](#5-การรับมือและแก้ไขปัญหา-troubleshooting--rollback)

---

## 1. สิ่งที่เปลี่ยนแปลงในฐานข้อมูล (Database Schema v1.19)

ระบบมีกลไก **Automatic Schema Migration & Synchronization** ในตัว เมื่อเริ่มรันระบบ ตัวแอปจะตรวจสอบและสร้าง/อัปเกรดตารางทั้งหมดให้อัตโนมัติ:

| ชื่อตาราง (Table Name) | ลักษณะการทำงาน | วัตถุประสงค์ |
| :--- | :--- | :--- |
| `requests` | **Relational Table** | บันทึกรายการคำขอแผนความต้องการพัสดุ รองรับ Pagination |
| `request_audit_logs` | **ตารางใหม่ (New)** | บันทึกประวัติการเปลี่ยนแปลงแก้ไขรายบรรทัด (Before/After Diff) ตามระเบียบพัสดุ |
| `users` | **Relational Table** | ข้อมูลผู้ใช้งานและสิทธิ์ เข้ารหัสผ่านด้วย Bcrypt One-Way Hash |
| `departments` | **Relational Table** | ข้อมูลฝ่าย/แผนก และการจัดสรรกลุ่มงาน |
| `work_groups` | **Relational Table** | ข้อมูลกลุ่มงานหลัก |
| `custom_categories` | **ตารางใหม่ (New)** | จัดเก็บหมวดหมู่วัสดุที่ผู้ใช้งานเพิ่มใหม่ในแค็ตตาล็อกกลาง |
| `custom_units` | **ตารางใหม่ (New)** | จัดเก็บหน่วยนับเฉพาะของแต่ละรายการพัสดุ |
| `system_logs` | **Relational Table** | บันทึกเหตุการณ์ระดับระบบ |
| `system_settings` | **Relational Table** | บันทึกค่าตั้งค่าระบบ (แช่แข็งแผน, สิทธิ์ปรับปรุงแผนกลางปี, ราคาประเมิน) |
| `system_state` | **Compatibility** | บันทึกสถานะรวมเพื่อความเข้ากันได้ย้อนหลัง |

---

## 2. ขั้นตอนการอัปเดตระบบแบบ Step-by-Step

### ขั้นตอนที่ 1: สำรองข้อมูลเดิม (Backup Database & .env)
```bash
# 1. เข้าเครื่องฐานข้อมูล MySQL (10.1.0.201 หรือเครื่องของท่าน)
mysqldump -u root -p MatPlan > backup_matplan_before_v1_19.sql

# 2. สำรองไฟล์ .env เดิม
cp /var/www/MatPlan/.env /var/www/MatPlan/.env.backup
```

---

### ขั้นตอนที่ 2: ดึงซอร์สโค้ดเวอร์ชัน 1.19 ลงเครื่อง Application Server
```bash
cd /var/www/MatPlan
git pull origin main
```

---

### ขั้นตอนที่ 3: ติดตั้ง Dependencies และ Build ระบบใหม่
```bash
# ติดตั้งไลบรารีใหม่ (รวมถึง bcryptjs, jsonwebtoken)
npm install

# คอมไพล์โปรเจกต์ (สร้าง dist/ และ dist/server.cjs)
npm run build
```

---

### ขั้นตอนที่ 4: รีสตาร์ตกระบวนการทำงาน PM2 ด้วย Bundle ใหม่

> ⚠️ **คำเตือนสำคัญ:** ห้ามใช้ `pm2 restart` เพียงอย่างเดียว ให้ใช้คำสั่งลบและเริ่มใหม่ตามนี้:

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
APP_URL="http://10.2.0.15:3000/MatPlan"

# การเชื่อมต่อฐานข้อมูล MySQL
DB_HOST=10.2.0.201
DB_PORT=3306
DB_USER=MatPlan
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

4. **ทดสอบล็อกอินและตรวจสอบ Audit Trail:**
   - ทดลองเข้าใช้งานผ่านเว็บเบราว์เซอร์
   - ทดลองกดแก้ไข/ปรับยอดคำขอ แล้วเปิด **Audit Trail Modal** เพื่อตรวจสอบว่ามีบันทึก Before/After ขึ้นอย่างถูกต้อง

---

## 5. การรับมือและแก้ไขปัญหา (Troubleshooting & Rollback)

- **หากหน้าจอยังแสดงเวอร์ชันเก่า:**
  ให้กด `Ctrl + F5` หรือ `Cmd + Shift + R` บนเบราว์เซอร์เพื่อล้างแคช
- **หาก PM2 สตาร์ตไม่ขึ้น:**
  ตรวจสอบบันทึกข้อผิดพลาดด้วยคำสั่ง `pm2 logs MatPlan`
- **การ Rollback ข้อมูล (หากจำเป็น):**
  ```bash
  mysql -u root -p MatPlan < backup_matplan_before_v1_19.sql
  ```
