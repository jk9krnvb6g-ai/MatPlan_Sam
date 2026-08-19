# MatPlan — ระบบวางแผนความต้องการวัสดุและครุภัณฑ์ (Material Requirement Planning System)

**MatPlan** เป็นเว็บแอปพลิเคชันรูปแบบ Full-Stack (React 19 + TypeScript + Vite + Tailwind CSS + Node.js Express + MySQL) ที่ออกแบบมาเพื่อบริหารจัดการและสำรวจความต้องการวัสดุและครุภัณฑ์ประจำปีงบประมาณของ **โรงพยาบาลสามชุก** ช่วยเปลี่ยนผ่านการทำงานในรูปแบบเดิม (เอกสารกระดาษ/สเปรดชีตแยกส่วน) สู่ระบบดิจิทัลแบบรวมศูนย์ มีความโปร่งใส ตรวจสอบย้อนหลังได้ตามระเบียบพัสดุภาครัฐ และช่วยให้ผู้บริหารและฝ่ายพัสดุสามารถบริหารจัดการและควบคุมงบประมาณได้อย่างแม่นยำ

**เวอร์ชันปัจจุบัน**: `Version 1.29` (v1.29.0)

---

## 🌟 คุณสมบัติเด่นของระบบ (Core Features)

1. **สถาปัตยกรรมฐานข้อมูล Relational เต็มรูปแบบ (Full Relational Database Architecture):**
   - รองรับการทำงานร่วมกับ MySQL Server แยกตารางตามมาตรฐานฐานข้อมูลเชิงสัมพันธ์จริง (`requests`, `users`, `departments`, `work_groups`, `request_audit_logs`, `custom_categories`, `custom_units`, `system_logs`, `system_settings`, `system_state`)
   - มีระบบ Auto-Migration และ Fallback รองรับทั้ง Local Storage (`db.json`) และ MySQL Production Server อย่างราบรื่น

2. **ระบบความปลอดภัยและการเข้ารหัสผ่านชั้นสูง (Government-Grade Security & Hashing):**
   - หน้าแรกของระบบบังคับยืนยันตัวตนผ่านหน้าล็อกอิน (Auth Login Screen) ทุกครั้งที่เริ่มใช้งานใหม่
   - รหัสผ่านของผู้ใช้งานทั้งหมดถูกเข้ารหัสแบบทางเดียว (One-Way Hash) ด้วย **Bcrypt (10 Salt Rounds)** ตามมาตรฐานความปลอดภัยสากล
   - ระบบ **Data Sanitization** ป้องกันการส่งคืน Password Hash กลับไปยัง Client ในทุก Endpoint (`GET /api/state`, `GET /api/users`)
   - ระบบยืนยันตัวตนด้วย **JSON Web Token (JWT)** พร้อมสิทธิ์ควบคุมแบบ Granular RBAC

3. **ระบบตรวจสอบย้อนหลังระดับฟิลด์ตามระเบียบพัสดุ (Detailed Field-Level Audit Trail):**
   - ตาราง `request_audit_logs` บันทึกประวัติการเปลี่ยนแปลงทุกขั้นตอน (Before/After Diff) ทั้งจำนวนเดิม $\rightarrow$ จำนวนใหม่, สถานะเดิม $\rightarrow$ สถานะใหม่, ผู้ดำเนินการ, เวลา, ข้อคิดเห็น และเหตุผลความจำเป็น
   - รองรับหน้าต่าง **Audit Trail Modal** ใน UI และ API Endpoint `GET /api/requests/:id/history` เพื่อการตรวจสอบย้อนหลัง

4. **เครื่องมืออำนวยความสะดวกในการยื่นคำขอความต้องการพัสดุ (Smart Survey Tools):**
   - **Quick Fill Toolbar**: ปุ่มดึงยอดคำขอเดิมจากปีก่อนหน้า (ยอดใช้จริงปี 68, ยอด +5%, ยอด +10%, ยอดเฉลี่ย 3 ปีย้อนหลัง 66–68) กรอกทั้งตารางได้ในคลิกเดียว
   - **Sticky Mini-Summary Bar**: แถบสรุปยอดจำนวนรายการและคำนวณงบประมาณประมาณการรวมแบบลอยตัว (Real-time Budget Calculation) ด้านล่างจอ
   - **Table Density Switcher**: สวิตช์สลับโหมดการแสดงผลตารางระหว่าง **"แบบกระชับ (Compact)"** เพื่อดูรายการได้หนาแน่นขึ้น และ **"มาตรฐาน (Standard)"**
   - **Clean GPSC & Material Search**: ค้นหารายการวัสดุและรหัสพัสดุ GPSC ได้รวดเร็วโดยตรงในตาราง

5. **การควบคุมช่วงเวลาและปีงบประมาณ (Fiscal Year & Plan Freeze Control):**
   - ผู้ดูแลระบบสามารถสลับปีงบประมาณ (เช่น 2569, 2570)
   - ฟังก์ชัน **"แช่แข็งแผน" (Freeze Plan)** เพื่อปิดรับการแก้ไขข้อมูลจากแผนกต่าง ๆ เมื่อสิ้นสุดระยะเวลาการสำรวจ
   - ระบบ **การขอปรับปรุงแผนงบประมาณกลางปี (Mid-Year Revision Workflow)** ที่ให้สิทธิ์เฉพาะแผนกที่ได้รับอนุญาตขอปรับลด/เพิ่ม/เปลี่ยนรายการได้

6. **ระบบอนุมัติและคัดกรอง 4 ลำดับขั้น (Multi-Stage Approval Workflow):**
   - **ระดับแผนก/ฝ่าย (Dept Head):** หัวหน้างานตรวจสอบและอนุมัติความต้องการเบื้องต้นของหน่วยงานตนเอง
   - **ระดับเจ้าหน้าที่พัสดุ (Procurement Staff):** ตรวจสอบความถูกต้อง ปรับปรุงราคากลาง และจับคู่หมวดหมู่พัสดุ
   - **ระดับหัวหน้าฝ่ายพัสดุ (Procurement Head):** กลั่นกรองและรวบรวมแผนภาพรวมโรงพยาบาล
   - **ระดับผู้บริหาร (Executive):** ลงนามและอนุมัติงบประมาณภาพรวมของโรงพยาบาล

7. **ระบบการซิงก์ข้อมูลสดและการแจ้งเตือน (Real-Time SSE & Cross-Device Sync):**
   - แจ้งเตือนเหตุการณ์สำคัญทันทีผ่าน Server-Sent Events (SSE: `/api/events`)
   - ป้องกันการบันทึกข้อมูลทับซ้อน (Conflict Protection) พร้อมรีเฟรชข้อมูลอัตโนมัติ

8. **ระบบออกรายงานทางการสำหรับพิมพ์ (Official Printable Report System):**
   - แปลงแผนความต้องการที่ผ่านการอนุมัติเป็น **"ใบจัดหาพัสดุและครุภัณฑ์ประจำปี"** และ **"แบบฟอร์มสรุปภาพรวมงบประมาณ"** ตามมาตรฐานราชการ
   - รองรับการส่งออกข้อมูลเป็น Excel (.xlsx) และ Full System Snapshot (.json)

---

## 👥 บทบาทผู้ใช้งานในระบบ (User Roles)

| บทบาท (Role) | สิทธิ์และหน้าที่หลัก |
| :--- | :--- |
| **Staff (เจ้าหน้าที่ฝ่าย/ผู้ใช้งานทั่วไป)** | บันทึกความต้องการวัสดุจากแค็ตตาล็อกกลางหรือรายการสั่งทำพิเศษ (Custom Items), ใช้เครื่องมือดึงยอดปีก่อน, ติดตามสถานะคำขอ |
| **Department Head (หัวหน้ากลุ่มงาน/ฝ่าย)** | ตรวจสอบคำขอของหน่วยงานตนเอง, ปรับจำนวน, อนุมัติหรือส่งกลับแก้ไขพร้อมระบุเหตุผล |
| **Procurement Staff (เจ้าหน้าที่ฝ่ายพัสดุ)** | ตรวจสอบรายการวัสดุใหม่, กำหนดราคากลาง, จัดการแค็ตตาล็อกกลาง และตรวจสอบความถูกต้อง |
| **Procurement Head (หัวหน้าฝ่ายพัสดุ)** | ตรวจสอบภาพรวมทุกกลุ่มงาน, จัดทำแผนจัดซื้อจัดจ้างรวม และส่งต่อผู้บริหาร |
| **Executive (ผู้บริหารระดับสูง/ผอ.)** | แดชบอร์ดวิเคราะห์งบประมาณภาพรวม (D3/Recharts), อนุมัติงบประมาณประจำปี |
| **Admin (ผู้ดูแลระบบ)** | จัดการบัญชีผู้ใช้, กำหนดสิทธิ์, จัดการหมวดหมู่วัสดุแบบ All-in-One, ควบคุมการเปิด-ปิดแผนสำรวจ |

---

## 💾 โครงสร้างฐานข้อมูล (Database Schema)

เมื่อเชื่อมต่อกับ MySQL Server ระบบจะทำการสร้างและดูแลตารางเหล่านี้โดยอัตโนมัติ:

1. `work_groups`: ตารางกลุ่มงานหลัก (`id`, `name`, `description`, `code`)
2. `departments`: ตารางฝ่าย/แผนก (`id`, `name`, `category`, `work_group_id`)
3. `users`: ตารางผู้ใช้งานและสิทธิ์ (`username`, `password` (Hashed Bcrypt), `role`, `roles`, `name`, `dept_id`, `status`)
4. `requests`: ตารางรายการคำขอพัสดุ (`id`, `dept_id`, `item_name`, `unit`, `qty_requested`, `status`, `unit_price`, `fiscal_year`, ฯลฯ)
5. `request_audit_logs`: ตารางบันทึกประวัติการแก้ไขระดับบรรทัด (`id`, `request_id`, `timestamp`, `role`, `actor_name`, `action`, `old_qty`, `new_qty`, `old_status`, `new_status`, `comment`, `reason`)
6. `custom_categories`: ตารางหมวดหมู่วัสดุที่เพิ่มใหม่ (`id`, `label`, `created_at`)
7. `custom_units`: ตารางหน่วยนับเฉพาะของแต่ละรายการ (`item_name`, `unit_label`)
8. `system_logs`: ตารางบันทึกเหตุการณ์การทำงานของระบบ (`id`, `timestamp`, `username`, `name`, `action_type`, `module`, `description`)
9. `system_settings`: ตารางค่ากำหนดระบบและ Metadata (`setting_key`, `setting_value`)
10. `system_state`: ตารางสำรองสถานะรวมเพื่อความเข้ากันได้ย้อนหลัง

---

## 🛠️ ขั้นตอนการรันระบบเพื่อการพัฒนา (Development Mode)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. เริ่มต้นรันเซิร์ฟเวอร์พัฒนา (Vite + Node.js Express)
npm run dev

# 3. เข้าใช้งานผ่านเบราว์เซอร์
# http://localhost:3000
```

---

## 📦 การคอมไพล์สำหรับ Production (Production Build)

```bash
# สั่ง Build คอมไพล์โปรเจกต์ทั้ง Frontend และ Backend
npm run build

# สั่งรัน Production Server แบบ Standalone
npm start
# หรือ node dist/server.cjs
```

*โปรดดูคู่มือการติดตั้งแบบละเอียดบนเซิร์ฟเวอร์จริงได้ที่ [INSTALL.md](./INSTALL.md), คู่มือการอัปเดตระบบที่ [UPDATE.md](./UPDATE.md), และบันทึกประวัติการเปลี่ยนแปลงทุกเวอร์ชันที่ [CHANGELOG.md](./CHANGELOG.md)*
