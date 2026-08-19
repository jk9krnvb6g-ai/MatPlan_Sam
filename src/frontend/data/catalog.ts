import { CategoryId, Department, MaterialItem, RequestItem, RequestStatus, User, WorkGroup } from '../types';

export const OFFICE_ITEMS = [
  "สมุด NO.1 ปกเคลือบ","สมุด NO.2 ปกเคลือบ","สมุดลายไทย","พลาสติกเคลือบ ขนาด A4",
  "พลาสติกเคลือบ ขนาด 7.5x9.5","แผ่นใสถ่ายเอกสารได้","สติ๊กเกอร์สะท้อนแสง A4","สติ๊กเกอร์สีด้าน A4",
  "สติ๊กเกอร์ขาวด้าน A4","สติ๊กเกอร์เอนกประสงค์ A7","สติ๊กเกอร์เอนกประสงค์ A10","แปรงลบกระดาน",
  "ไม้บรรทัด 12\"","หมุดติดบอร์ดหัวสี","กรรไกร 8\"","กล่องใส่แฟ้ม 1 ช่อง","กาวใส ขนาด 5 ออนซ์",
  "เล็บเหยี่ยว","ปรอทวัดอุณหภูมิห้อง","หมึกเครื่องยิงสติ๊กเกอร์ Motex","หมึกเครื่องยิงสติ๊กเกอร์ Sato",
  "สันรูด 3 มิลxA4","ฟิวเจอร์บอร์ด 80x130 ซม.","สติ๊กเกอร์ใส","สติ๊กเกอร์ PVC","กระดาษโปสเตอร์สี 2 หน้า",
  "เชือกผ้าสำหรับเสาธง 5 มิล","ซองขาวครุฑ","ซองน้ำตาลครุฑ ขนาด 6.5\"x9\"","ซองแฟ้ม A4",
  "กระดาษถ่ายเอกสารสีฟ้า A4 80 g","กระดาษถ่ายเอกสารสีเหลืองA4 80 g","กระดาษถ่ายเอกสารสีชมพู A4 80 g",
  "กระดาษปกสีเขียว A4 120 g","กระดาษปกสีชมพู A4 120 g","กระดาษปกสีฟ้า A4 120 g","กระดาษปกสีเหลือง A4 120 g",
  "กระดาษถ่ายเอกสาร A4 ขาว 80 g","กระดาษถ่ายเอกสาร A5 ขาว 80 g","กระดาษถ่ายเอกสาร F14 ขาว 80 g",
  "กระดาษคาร์บอนสีดำ","กระดาษคาร์บอนสีน้ำเงิน","กระดาษพิมพ์ใบประกาศ","เทปใส ขนาด 3/4\"","กาวย่น 1\" 3M",
  "กาวย่น 1.5\" 3M","แลคซีน 1.5\"","เครื่องเย็บกระดาษ NO.10","เครื่องเย็บกระดาษ NO.35",
  "เครื่องเจาะกระดาษขนาดเล็ก","ลวดเย็บกระดาษ NO.35","ลวดเย็บกระดาษ Rapid 9/12","คลิบหูขาว NO.108",
  "คลิบหูขาว NO.109","คลิบหูขาว NO.111","คลิบบอร์ด F14","คลิบบอร์ดมีปก","แฟ้มเสนอเซ็นต์",
  "แฟ้มห่วง 3\" 120 F","แฟ้มห่วง 1\" 420 F","แฟ้มห่วง 1.5\" 221 A4","แฟ้มหนีบ 1\" 590 F","ปากกาเคมีสีดำ",
  "ปากกาเคมีสีน้ำเงิน","ปากกาเคมีสีแดง","ปากกาไวท์บอร์ดสีดำ","ปากกาไวท์บอร์ดสีน้ำเงิน","ปากกาไวท์บอร์ดสีแดง",
  "ปากกาเขียนแผ่นใสลบได้","ปากกาเขียนแผ่นใสลบไม่ได้","มีดคัทเตอร์ใหญ่","มีดคัทเตอร์เล็ก","ใบมีดคัทเตอร์ใหญ่",
  "ใบมีดคัทเตอร์เล็ก","แท่นประทับตรายางสีน้ำเงิน NO.2","แท่นประทับตรายางสีแดง NO.2",
  "หมึกเติมแท่นประทับตรายางสีน้ำเงิน","หมึกเติมแท่นประทับตรายางสีแดง","ตรายาง วัน เดือน ปี เลขไทย",
  "ตรายาง วัน เดือน ปี อารบิค","ตรายางจ่ายเงินแล้ว","ตะกร้าใส่เอกสาร","ธงชาติ ขนาด 120x180",
  "แฟ้มห่วง 2\" 125 A4","แฟ้มห่วง 2\" 120 A4","กบเหลาดินสอ","แฟ้มห่วง 2\" 125 F","ลวดเสียบกระดาษ",
  "ลวดเย็บกระดาษ เบอร์ 10","ธงชาติไทย 60x90","แท่นตัดเทป","ซองขยายข้าง A4 ครุฑ","เหล็กเสียบกระดาษ",
  "แลคซีน 2 นิ้ว"
];

export const SAMNAK_ITEMS = [
  "สมุด NO.1 ปกเคลือบ","สมุด NO.2 ปกเคลือบ","สมุดลายไทย","พลาสติกเคลือบ ขนาด A4",
  "แผ่นใสถ่ายเอกสารได้","สติ๊กเกอร์สะท้อนแสง A4","สติ๊กเกอร์ขาวด้าน A4","สติ๊กเกอร์เอนกประสงค์ A7",
  "สติ๊กเกอร์เอนกประสงค์ A10","แท่นตัดเทป","หมุดติดบอร์ดหัวสี","กรรไกร 8\"","ดัชนีแฟ้ม 20 คอร์ลัม",
  "กระดาษถ่ายเอกสารสีฟ้า A4 80 g","กระดาษถ่ายเอกสารสีเหลืองA4 80 g","กระดาษถ่ายเอกสารสีชมพู A4 80 g",
  "กระดาษถ่ายเอกสารสีเขียว A4 80 g","กระดาษปกสีเขียว A4 120 g","กระดาษปกสีชมพู A4 120 g",
  "กระดาษปกสีฟ้า A4 120 g","กระดาษปกสีเหลือง A4 120 g","กระดาษถ่ายเอกสาร A4 ขาว 80 g",
  "กระดาษถ่ายเอกสาร A5 ขาว 80 g","กระดาษถ่ายเอกสาร F14 ขาว 80 g","กระดาษขาว 180 แกรม","กระดาษสี 180 แกรม",
  "คลิบหูขาว NO.108","คลิบหูขาว NO.109","คลิบบอร์ด F14 ไม่มีปก","คลิบบอร์ดมีปก","แฟ้มเสนอเซ็นต์",
  "ซองขยายข้าง A4 ครุฑ","ธงชาติ ขนาด 120x180","ธงชาติ ขนาด 60x90","ปากกาเคมีสีดำ","ปากกาเคมีสีน้ำเงิน",
  "ปากกาเคมีสีแดง","ปากกาไวท์บอร์ดสีดำ","ปากกาไวท์บอร์ดสีน้ำเงิน","ปากกาไวท์บอร์ดสีแดง",
  "ปากกาเขียนแผ่นซีดี","ตรายางเลขอารบิค","กระดาษความร้อน 80*80","สติ๊กเกอร์ขาวมัน A4"
];

export const KITCHEN_ITEMS = [
  "กรวยกระดาษ","กระดาษชำระม้วนเล็ก","กระดาษชำระม้วนใหญ่","กล่องใส่กระดาษชำระม้วนใหญ่",
  "ขวดสเปรย์ฉีดน้ำ","ขันน้ำพลาสติก","เชือกฟาง","ถ้วยพลาสติก 3 ออนซ์","ถุงกระโถน 8x16 นิ้ว",
  "ถุงมือทำความสะอาด เบอร์ L","ถุงมือทำความสะอาด เบอร์ M","ถุงมือยาวรัดข้อ","ถุงร้อน ขนาด 10x15 นิ้ว",
  "ถุงร้อน ขนาด 12x18 นิ้ว","ถุงร้อน ขนาด 4x6 นิ้ว","ถุงร้อน ขนาด 5x8 นิ้ว","ถุงร้อน ขนาด 7x11 นิ้ว",
  "ถุงหูหิ้วแดง ขนาด 9x18 นิ้ว","น้ำยาขัดเอนกประสงค์","น้ำยาเช็ดกระจก","น้ำยาซักผ้าสี","น้ำยาซักผ้าขาว",
  "น้ำยาปรับผ้านุ่ม","ไม้กวาดอ่อน","ไม้ม๊อบดันฝุ่น","ไม้กวาดหยากไย่","ไม้กวาดแข็ง","สก๊อตไบรท์ 2 หน้า",
  "สก๊อตไบรท์หน้าเดียว","สบู่เหลวล้างมือ","สบู่เหลวอาบน้ำเด็ก","สเปรย์ฉีดปลวก","แผ่นขัดพื้นสก๊อตไบร์ท 16\"",
  "แผ่นอาทแมท","ถังน้ำพลาสติกหูหิ้ว+ฝา ขนาด 6.5 ลิตร","รองเท้าบู๊ทสีดำ","สำลีก้าน","เชือกผูก tube",
  "เสื้อกันฝน","ยางรัดของ"
];

export const ELECTRIC_ITEMS = [
  "ถ่านไฟ AAA อัลคาไลน์","ถ่านไฟ AAA","ถ่านไฟ AA อัลคาไลน์","ถ่านไฟ AA",
  "ถ่านไฟ ขนาดใหญ่ C","ถ่านไฟ ขนาดใหญ่ D","ถ่านไฟ ขนาด 9V","ถ่านไฟฉาย 9v อัลคาไลน์","ถ่านไฟ C อัลคาไลน์",
  "รางปลั๊กไฟชนิดสวิทย์ปิด-เปิด ยาว 3 ม.","รางปลั๊กไฟชนิดสวิทย์ปิด-เปิด ยาว 5 ม.","ไฟฉาย"
];

export const COMPUTER_ITEMS = [
  "หมึกเครื่องพิมพ์ Pantum","หมึกเครื่องพิมพ์ 35A 85A","หมึกเครื่องพิมพ์ 48A",
  "หมึกเครื่องพิมพ์ 217A","หมึกเครื่องพิมพ์ TN1000","หมึกเติม 5190 (BK)","หมึกเติม 5190 (Y)",
  "หมึกเติม 5190 (M)","หมึกเติม 5190 (C)","หมึกเครื่องพิมพ์ HP 680 สีดำ","หมึกเครื่องพิมพ์ HP 680 สี",
  "หมึกเครื่องพิมพ์ OKI รุ่น MC 363 (BK)","หมึกเครื่องพิมพ์ OKI รุ่น MC 363 (Y)"
];

export const MEDICAL_ITEMS = [
  "สำลีก้อนสเตอร์ไรด์", "ผ้าก๊อซพับสเตอร์ไรด์ 2x2", "ผ้าก๊อซพับสเตอร์ไรด์ 3x3", "ผ้าก๊อซพับสเตอร์ไรด์ 4x4",
  "ผ้าพันแผล Conforming 2\"", "ผ้าพันแผล Conforming 3\"", "ผ้าพันแผล Conforming 4\"", "พลาสเตอร์ปิดแผลใสกันน้ำ",
  "เข็มฉีดยาเบอร์ 18", "เข็มฉีดยาเบอร์ 21", "เข็มฉีดยาเบอร์ 24", "กระบอกฉีดยา 5 ml", "กระบอกฉีดยา 10 ml",
  "กระบอกฉีดยา 20 ml", "กระบอกฉีดยา 50 ml", "ชุดให้น้ำเกลือสำหรับผู้ใหญ่", "ชุดให้น้ำเกลือสำหรับเด็ก",
  "สายยางดูดเสมหะเบอร์ 12", "สายยางดูดเสมหะเบอร์ 14", "ถุงมือตรวจโรคสังเคราะห์ เบอร์ S", "ถุงมือตรวจโรคสังเคราะห์ เบอร์ M",
  "ถุงมือตรวจโรคสังเคราะห์ เบอร์ L", "ถุงมือผ่าตัดสเตอร์ไรด์ เบอร์ 7", "ถุงมือผ่าตัดสเตอร์ไรด์ เบอร์ 7.5", "หน้ากากอนามัยทางการแพทย์ (Surgical Mask)",
  "แอลกอฮอล์สำหรับฆ่าเชื้อ 70%", "น้ำเกลือล้างแผล Normal Saline 0.9% 1000ml", "โพวิโดนไอโอดีนสำหรับล้างแผล 450ml"
];

export const DENTAL_ITEMS = [
  "ก้านสำลีทันตกรรม", "ถ้วยผสมอัลจิเนต", "ผงพิมพ์ปากอัลจิเนต (Alginate)", "วัสดุอุดฟัน Composite",
  "เข็มฉีดยาชาทันตกรรม", "ยาชาทันตกรรมชนิดมี Adrenaline", "ฟลูออไรด์วานิช", "แผ่นยางกันน้ำลาย (Rubber Dam)",
  "หัวกรอฟัน Diamond Bur", "กระดาษกัดตรวจสบฟัน (Articulating Paper)", "เอี๊ยมพลาสติกกันเปื้อนทันตกรรม", "หัวดูดน้ำลายพลาสติก (Saliva Ejector)"
];

export const LAB_ITEMS = [
  "หลอดเก็บตัวอย่างเลือด EDTA (จุกม่วง)", "หลอดเก็บตัวอย่างเลือด Clot Blood (จุกแดง)", "หลอดเก็บตัวอย่างเลือด Sodium Fluoride (จุกเทา)",
  "แผ่นสไลด์แก้ว (Microscope Slide)", "กระจกปิดสไลด์ (Cover Glass)", "ทิปสีฟ้า 1000 ไมโครลิตร (Blue Tip)", "ทิปสีเหลือง 200 ไมโครลิตร (Yellow Tip)",
  "ทิปสีขาว 10 ไมโครลิตร (White Tip)", "กระดาษทดสอบสารเคมี pH Paper", "ถ้วยเก็บปัสสาวะสเตอร์ไรด์", "ขวดเก็บสิ่งส่งตรวจเพาะเชื้อ"
];

export const NUTRITION_ITEMS = [
  "ข้าวสารคัดพิเศษ 100%", "น้ำมันพืชสำหรับปรุงอาหาร", "น้ำตาลทรายขาวบริสุทธิ์", "เกลือบริโภคเสริมไอโอดีน",
  "นมกล่องรสจืดสำหรับผู้ป่วย", "อาหารทางการแพทย์สูตรครบถ้วน", "ไข่ไก่สดเบอร์ 3", "ฟอยล์ห่ออาหารสำหรับนึ่ง",
  "ถุงเก็บตัวอย่างอาหาร", "หมวกคลุมผมสำหรับงานโภชนาการ", "ผ้ากันเปื้อนกันน้ำงานครัว"
];

export const PHARMACY_ITEMS = [
  "ซองยาซิปล็อคพิมพ์ตราโรงพยาบาล 7x10 ซม.", "ซองยาซิปล็อคพิมพ์ตราโรงพยาบาล 9x13 ซม.", "ซองยาซิปล็อคพิมพ์ตราโรงพยาบาล 12x17 ซม.",
  "ขวดยาน้ำสีชา 60 ml", "ขวดยาน้ำสีชา 120 ml", "ถุงพลาสติกหิ้วใส่ยาขนาดเล็ก", "ถุงพลาสติกหิ้วใส่ยาขนาดกลาง",
  "กระดาษห่อยาเม็ด", "ถาดนับเม็ดยาพลาสติกพร้อมไม้พาย", "สติ๊กเกอร์ฉลากยาสำหรับเครื่องพิมพ์ความร้อน"
];

export const MAINTENANCE_ITEMS = [
  "หลอดไฟ LED T8 18W", "หลอดไฟ LED Bulb 9W ขั้ว E27", "สายไฟ VAF 2x1.5 ตร.มม.", "สายไฟ VAF 2x2.5 ตร.มม.",
  "เทปพันสายไฟ 3M", "ก๊อกน้ำสแตนเลส 1/2 นิ้ว", "สายน้ำดีสแตนเลส 1/2 นิ้ว", "วาล์วน้ำฝังกำแพง",
  "กาวทาท่อ PVC", "ท่อ PVC ตราช้าง 1/2 นิ้ว", "ข้อต่อตรง PVC 1/2 นิ้ว", "ข้องอ 90 องศา PVC 1/2 นิ้ว",
  "สีน้ำอะครีลิคทาภายในสีขาว", "แปรงทาสี 2.5 นิ้ว", "ลูกกลิ้งทาสี 9 นิ้ว"
];

export const VEHICLE_ITEMS = [
  "น้ำมันเครื่องกึ่งสังเคราะห์สำหรับรถพยาบาล", "น้ำยาหล่อเย็นหม้อน้ำ (Coolant)", "น้ำยาฉีดกระจกรถยนต์",
  "ใบปัดน้ำฝนรถพยาบาล", "หลอดไฟหน้ารถยนต์ H4", "ผ้าเช็ดรถไมโครไฟเบอร์", "น้ำยาล้างทำความสะอาดรถยนต์สูตรผสมแว็กซ์"
];

export const PR_ITEMS = [
  "ป้ายไวนิลประชาสัมพันธ์งานสาธารณสุข", "แผ่นพับให้ความรู้เรื่องโรคติดต่อ", "โปสเตอร์รณรงค์สุขภาพขนาด A3",
  "ขาตั้งป้าย Roll-up ขนาด 80x200 ซม.", "สติ๊กเกอร์ป้ายเตือนและสัญลักษณ์ความปลอดภัย"
];

export const LINEN_ITEMS = [
  "ผ้าปูที่นอนผู้ป่วยสีฟ้าพิมพ์ตรา รพ.", "ปลอกหมอนผู้ป่วยสีฟ้า", "ผ้าขวางเตียงผู้ป่วย", "เสื้อผู้ป่วยผ่าหน้าแบบผูกเชือก",
  "กางเกงผู้ป่วยแบบผูกเชือก", "ผ้าเช็ดตัวผู้ป่วยสีขาว", "ผงซักฟอกเกรดโรงพยาบาลฆ่าเชื้อ", "น้ำยาฟอกขาวฆ่าเชื้อสำหรับผ้าโรงพยาบาล"
];

const isCleared = () => {
  return typeof window !== 'undefined' && localStorage.getItem('survey_catalog_cleared') === 'true';
};

const rawCatalog: Record<string, string[]> = {
  office: OFFICE_ITEMS,
  samnak: SAMNAK_ITEMS,
  kitchen: KITCHEN_ITEMS,
  electric: ELECTRIC_ITEMS,
  computer: COMPUTER_ITEMS,
  medical: MEDICAL_ITEMS,
  dental: DENTAL_ITEMS,
  lab: LAB_ITEMS,
  nutrition: NUTRITION_ITEMS,
  pharmacy: PHARMACY_ITEMS,
  maintenance: MAINTENANCE_ITEMS,
  vehicle: VEHICLE_ITEMS,
  pr: PR_ITEMS,
  linen: LINEN_ITEMS
};

export const CATALOG: Record<string, string[]> = new Proxy(rawCatalog, {
  get(target, prop) {
    if (isCleared()) {
      return [];
    }
    return target[prop as string] || [];
  },
  ownKeys(target) {
    if (isCleared()) return [];
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (isCleared()) return undefined;
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }
}) as unknown as Record<string, string[]>;

const rawAllItems = Array.from(
  new Set([
    ...OFFICE_ITEMS, ...SAMNAK_ITEMS, ...KITCHEN_ITEMS, ...ELECTRIC_ITEMS, ...COMPUTER_ITEMS,
    ...MEDICAL_ITEMS, ...DENTAL_ITEMS, ...LAB_ITEMS, ...NUTRITION_ITEMS, ...PHARMACY_ITEMS,
    ...MAINTENANCE_ITEMS, ...VEHICLE_ITEMS, ...PR_ITEMS, ...LINEN_ITEMS
  ])
);

export const ALL_ITEMS: string[] = new Proxy(rawAllItems, {
  get(target, prop) {
    if (isCleared()) {
      const empty: string[] = [];
      const val = Reflect.get(empty, prop);
      return typeof val === 'function' ? val.bind(empty) : val;
    }
    const val = Reflect.get(target, prop);
    return typeof val === 'function' ? val.bind(target) : val;
  },
  ownKeys(target) {
    if (isCleared()) return [];
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (isCleared()) return undefined;
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }
}) as unknown as string[];

export const defaultCategoryLabels: Record<string, string> = {
  office: 'วัสดุสำนักงานทั่วไป',
  samnak: 'วัสดุสำนักงาน (สำนัก)',
  kitchen: 'วัสดุงานบ้านงานครัว',
  electric: 'วัสดุไฟฟ้าและวิทยุ',
  computer: 'วัสดุคอมพิวเตอร์ / หมึกพิมพ์',
  medical: 'วัสดุการแพทย์และเวชภัณฑ์มิใช่ยา',
  dental: 'วัสดุทันตกรรม',
  lab: 'วัสดุวิทยาศาสตร์การแพทย์ / ห้องปฏิบัติการ',
  nutrition: 'วัสดุโภชนาการและอาหาร',
  pharmacy: 'วัสดุเภสัชกรรม / คลังยา',
  maintenance: 'วัสดุงานช่างและซ่อมบำรุง',
  vehicle: 'วัสดุยานพาหนะและขนส่ง',
  pr: 'วัสดุโฆษณาและประชาสัมพันธ์',
  linen: 'วัสดุผ้าและงานซักฟอก'
};

export const defaultCategoryOrder: string[] = [
  'office', 'samnak', 'kitchen', 'electric', 'computer',
  'medical', 'dental', 'lab', 'nutrition', 'pharmacy',
  'maintenance', 'vehicle', 'pr', 'linen'
];

let memoryCustomCategories: Record<string, string> = {};
let memoryCustomUnits: Record<string, string> = {};

export function getCustomCategories(): Record<string, string> {
  if (typeof window === 'undefined') return memoryCustomCategories;
  try {
    const saved = localStorage.getItem('survey_custom_categories');
    if (saved) {
      memoryCustomCategories = JSON.parse(saved);
    }
  } catch {}
  return memoryCustomCategories;
}

export function saveCustomCategory(key: string, label: string) {
  const current = { ...getCustomCategories(), [key]: label };
  memoryCustomCategories = current;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('survey_custom_categories', JSON.stringify(current));
    } catch {}
    window.dispatchEvent(new Event('categories_updated'));
  }
}

export function deleteCustomCategory(key: string) {
  const current = { ...getCustomCategories() };
  delete current[key];
  memoryCustomCategories = current;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('survey_custom_categories', JSON.stringify(current));
    } catch {}
    window.dispatchEvent(new Event('categories_updated'));
  }
}

export function setAllCustomCategories(cats: Record<string, string>) {
  memoryCustomCategories = { ...(cats || {}) };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('survey_custom_categories', JSON.stringify(memoryCustomCategories));
    } catch {}
    window.dispatchEvent(new Event('categories_updated'));
  }
}

export function getCustomUnits(): Record<string, string> {
  if (typeof window === 'undefined') return memoryCustomUnits;
  try {
    const saved = localStorage.getItem('survey_custom_units');
    if (saved) {
      memoryCustomUnits = JSON.parse(saved);
    }
  } catch {}
  return memoryCustomUnits;
}

export function saveCustomUnit(name: string, unit: string) {
  const current = { ...getCustomUnits(), [name]: unit };
  memoryCustomUnits = current;
  CUSTOM_UNITS[name] = unit;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('survey_custom_units', JSON.stringify(current));
    } catch {}
  }
}

export function setAllCustomUnits(units: Record<string, string>) {
  memoryCustomUnits = { ...(units || {}) };
  Object.assign(CUSTOM_UNITS, memoryCustomUnits);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('survey_custom_units', JSON.stringify(memoryCustomUnits));
    } catch {}
  }
}

let memoryDisabledStandardCategories: string[] = [];

export function getDisabledStandardCategories(): string[] {
  if (typeof window === 'undefined') return memoryDisabledStandardCategories;
  try {
    const saved = localStorage.getItem('survey_disabled_standard_categories');
    if (saved) {
      memoryDisabledStandardCategories = JSON.parse(saved);
    }
  } catch {}
  return memoryDisabledStandardCategories;
}

export function disableStandardCategory(catId: string) {
  const current = Array.from(new Set([...getDisabledStandardCategories(), catId]));
  memoryDisabledStandardCategories = current;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('survey_disabled_standard_categories', JSON.stringify(current));
    } catch {}
    window.dispatchEvent(new Event('categories_updated'));
  }
}

export function restoreStandardCategory(catId: string) {
  const current = getDisabledStandardCategories().filter(k => k !== catId);
  memoryDisabledStandardCategories = current;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('survey_disabled_standard_categories', JSON.stringify(current));
    } catch {}
    window.dispatchEvent(new Event('categories_updated'));
  }
}

export function resetAllCategoriesToDefault() {
  memoryDisabledStandardCategories = [];
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('survey_disabled_standard_categories');
    } catch {}
    window.dispatchEvent(new Event('categories_updated'));
  }
}

export function getCategoryLabel(catId: string): string {
  if (!catId) return '';
  const custom = getCustomCategories();
  if (custom[catId]) return custom[catId];
  return defaultCategoryLabels[catId] || catId;
}

export function getCategoryOrder(): string[] {
  const disabled = getDisabledStandardCategories();
  const activeStandard = defaultCategoryOrder.filter(c => !disabled.includes(c));
  const custom = Object.keys(getCustomCategories());
  return Array.from(new Set([...activeStandard, ...custom]));
}

export const CATEGORY_LABELS: Record<string, string> = new Proxy(defaultCategoryLabels, {
  get(target, prop) {
    if (typeof prop !== 'string') return undefined;
    const custom = getCustomCategories();
    if (custom[prop]) return custom[prop];
    return target[prop] || prop;
  },
  ownKeys(target) {
    const customKeys = Object.keys(getCustomCategories());
    return Array.from(new Set([...Object.keys(target), ...customKeys]));
  },
  getOwnPropertyDescriptor(target, prop) {
    return { enumerable: true, configurable: true };
  }
});

export const CATEGORY_ORDER: string[] = new Proxy(defaultCategoryOrder, {
  get(target, prop) {
    const list = getCategoryOrder();
    if (prop === Symbol.iterator) {
      return list[Symbol.iterator].bind(list);
    }
    if (prop === 'length') {
      return list.length;
    }
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return list[Number(prop)];
    }
    if (typeof prop === 'string' && typeof (list as any)[prop] === 'function') {
      return (list as any)[prop].bind(list);
    }
    return (list as any)[prop];
  },
  has(target, prop) {
    const list = getCategoryOrder();
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      return Number(prop) < list.length;
    }
    return prop in list || list.includes(prop as any);
  },
  ownKeys() {
    const list = getCategoryOrder();
    return [...list.map((_, i) => String(i)), 'length'];
  },
  getOwnPropertyDescriptor(target, prop) {
    const list = getCategoryOrder();
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      const idx = Number(prop);
      if (idx < list.length) {
        return { value: list[idx], writable: false, enumerable: true, configurable: true };
      }
    }
    if (prop === 'length') {
      return { value: list.length, writable: false, enumerable: false, configurable: false };
    }
    return undefined;
  }
}) as unknown as string[];

const rawWorkGroups: WorkGroup[] = [
  { id: 'nursing', name: 'กลุ่มการพยาบาล', description: 'ดูแลการรักษาและหอผู้ป่วย แผนกคลอด และห้องผ่าตัด' },
  { id: 'admin', name: 'กลุ่มงานบริหารทั่วไป', description: 'ดูแลงานอำนวยการ ธุรการ การเงิน พัสดุ และสารบรรณ' },
  { id: 'support', name: 'กลุ่มงานบริการและซ่อมบำรุง', description: 'ดูแลงานบ้านงานครัว โภชนาการ ไฟฟ้า และอาคารสถานที่' },
  { id: 'it', name: 'กลุ่มงานเทคโนโลยีสารสนเทศ', description: 'ดูแลระบบคอมพิวเตอร์ เครือข่าย และสารสนเทศ' }
];

export const INITIAL_WORK_GROUPS: WorkGroup[] = new Proxy(rawWorkGroups, {
  get(target, prop) {
    if (isCleared()) {
      const empty: WorkGroup[] = [];
      const val = Reflect.get(empty, prop);
      return typeof val === 'function' ? val.bind(empty) : val;
    }
    const val = Reflect.get(target, prop);
    return typeof val === 'function' ? val.bind(target) : val;
  },
  ownKeys(target) {
    if (isCleared()) return [];
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (isCleared()) return undefined;
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }
}) as unknown as WorkGroup[];

const rawDepartments: Department[] = [
  // กลุ่มการพยาบาล
  { id: 'ipd1', name: 'ผู้ป่วยใน 1', category: 'office', workGroupId: 'nursing' },
  { id: 'ipd2', name: 'ผู้ป่วยใน 2', category: 'office', workGroupId: 'nursing' },
  { id: 'imc', name: 'ผู้ป่วยใน IMC', category: 'office', workGroupId: 'nursing' },
  { id: 'delivery', name: 'ห้องคลอด', category: 'office', workGroupId: 'nursing' },
  { id: 'or', name: 'ห้องผ่าตัด', category: 'office', workGroupId: 'nursing' },
  { id: 'er', name: 'ห้องฉุกเฉิน (ER)', category: 'office', workGroupId: 'nursing' },

  // กลุ่มงานบริหารทั่วไป
  { id: 'admin', name: 'ฝ่ายบริหารทั่วไป', category: 'office', workGroupId: 'admin' },
  { id: 'thurakan', name: 'งานธุรการ', category: 'office', workGroupId: 'admin' },
  { id: 'finance', name: 'งานการเงิน', category: 'office', workGroupId: 'admin' },
  { id: 'phasadu', name: 'งานพัสดุ', category: 'office', workGroupId: 'admin' },
  { id: 'samnak', name: 'สำนักงาน', category: 'samnak', workGroupId: 'admin' },

  // กลุ่มงานบริการและซ่อมบำรุง
  { id: 'kitchen', name: 'งานบ้านงานครัว', category: 'kitchen', workGroupId: 'support' },
  { id: 'electric', name: 'ไฟฟ้าและวิทยุ', category: 'electric', workGroupId: 'support' },

  // กลุ่มงานเทคโนโลยีสารสนเทศ
  { id: 'computer', name: 'งานคอมพิวเตอร์', category: 'computer', workGroupId: 'it' }
];

export const DEPARTMENTS: Department[] = new Proxy(rawDepartments, {
  get(target, prop) {
    if (isCleared()) {
      const empty: Department[] = [];
      const val = Reflect.get(empty, prop);
      return typeof val === 'function' ? val.bind(empty) : val;
    }
    const val = Reflect.get(target, prop);
    return typeof val === 'function' ? val.bind(target) : val;
  },
  ownKeys(target) {
    if (isCleared()) return [];
    return Reflect.ownKeys(target);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (isCleared()) return undefined;
    return Reflect.getOwnPropertyDescriptor(target, prop);
  }
}) as unknown as Department[];

export function deptById(id: string): Department {
  return DEPARTMENTS.find(d => d.id === id) || { id, name: id, category: 'office' };
}

export function deptName(id: string): string {
  return deptById(id).name;
}

export function getItemCategory(itemName: string, customItems?: Record<string, string[]>): CategoryId {
  const catOrder = getCategoryOrder();
  for (const cat of catOrder) {
    if (CATALOG[cat]?.includes(itemName)) return cat;
    if (customItems && customItems[cat]?.includes(itemName)) return cat;
  }
  if (customItems) {
    for (const [cat, list] of Object.entries(customItems)) {
      if (Array.isArray(list) && list.includes(itemName)) return cat;
    }
  }
  return 'office';
}

export function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export const CUSTOM_UNITS: Record<string, string> = {};

export function guessUnit(name: string): string {
  if (!name) return 'ชิ้น';
  const custom = getCustomUnits();
  if (custom && custom[name]) return custom[name];
  if (CUSTOM_UNITS[name]) return CUSTOM_UNITS[name];
  if (/ม้วน|เทป|แลคซีน/.test(name)) return 'ม้วน';
  if (/กระดาษชำระ/.test(name)) return 'ม้วน';
  if (/กระดาษ/.test(name)) return 'รีม';
  if (/หมึก/.test(name)) return 'ตลับ';
  if (/ถ่านไฟ/.test(name)) return 'ก้อน';
  if (/น้ำยา|สบู่เหลว|สเปรย์/.test(name)) return 'ขวด';
  if (/ถุง(?!กระโถน)/.test(name)) return 'แพ็ค';
  if (/ปากกา|ดินสอ/.test(name)) return 'ด้าม';
  if (/แฟ้ม|ซอง/.test(name)) return 'แพ็ค';
  return 'ชิ้น';
}

export function guessPrice(name: string, unit: string): number {
  const h = hashStr(name + '|price');
  if (unit === 'รีม') return 90 + (h % 40);
  if (unit === 'ตลับ') return 350 + (h % 900);
  if (unit === 'ม้วน') return 15 + (h % 60);
  if (unit === 'ก้อน') return 8 + (h % 20);
  if (unit === 'ขวด') return 35 + (h % 90);
  if (unit === 'ด้าม') return 5 + (h % 25);
  if (unit === 'แพ็ค') return 20 + (h % 80);
  return 10 + (h % 50);
}

export const HISTORY_YEARS = [2566, 2567, 2568] as const;
export const REQUEST_YEAR = 2569;

export function historyFor(name: string): Record<number, number> {
  const vals: Record<number, number> = {};
  HISTORY_YEARS.forEach((yr, idx) => {
    const hh = hashStr(name + '|' + yr);
    vals[yr] = Math.max(1, (hh % 28) + 6 + idx * 2);
  });
  return vals;
}

export function lastActualQty(name: string): number {
  return historyFor(name)[2568];
}

export function fmtBaht(n: number): string {
  return Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export const STATUS_LABEL: Record<RequestStatus, { text: string; cls: string }> = {
  pending_head: { text: 'รอหัวหน้ากลุ่มงาน/ฝ่ายอนุมัติ', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  pending_proc: { text: 'รอฝ่ายพัสดุรวบรวม', cls: 'bg-teal-100 text-teal-800 border-teal-300' },
  pending_proc_head: { text: 'รอหัวหน้าฝ่ายพัสดุอนุมัติ', cls: 'bg-slate-100 text-slate-800 border-slate-300' },
  pending_exec: { text: 'รอผู้บริหารอนุมัติ', cls: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  approved: { text: 'อนุมัติแล้ว', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  rejected: { text: 'ตีกลับแก้ไข', cls: 'bg-rose-100 text-rose-800 border-rose-300' }
};

export const REQUESTER_SAMPLES: Record<string, { name: string; subDept: string }[]> = {
  ipd1: [
    { name: 'พยาบาลสมหญิง สุขใจ', subDept: 'หอผู้ป่วยสามัญ 1' },
    { name: 'พยาบาลวรรณา มีเมตตา', subDept: 'หอผู้ป่วยสามัญ 1' }
  ],
  ipd2: [
    { name: 'พยาบาลปรียาพร ดวงดี', subDept: 'หอผู้ป่วยสามัญ 2' },
    { name: 'พยาบาลนงลักษณ์ สายธาร', subDept: 'หอผู้ป่วยสามัญ 2' }
  ],
  imc: [
    { name: 'พยาบาลสุภาพร ใจเย็น', subDept: 'หอผู้ป่วย IMC' },
    { name: 'พยาบาลกานดา รักษาดี', subDept: 'หอผู้ป่วย IMC' }
  ],
  delivery: [
    { name: 'พยาบาลพิศมัย มารดา', subDept: 'ห้องทำคลอด' },
    { name: 'พยาบาลศิริวรรณ กำเนิด', subDept: 'ห้องหลังคลอด' }
  ],
  or: [
    { name: 'พยาบาลธีรพงษ์ ศัลยกรรม', subDept: 'ห้องผ่าตัดใหญ่' },
    { name: 'พยาบาลดารารัตน์ ปลอดเชื้อ', subDept: 'ห้องเตรียมผ่าตัด' }
  ],
  er: [
    { name: 'พยาบาลฉุกเฉิน วินัย', subDept: 'งานอุบัติเหตุและฉุกเฉิน' },
    { name: 'พยาบาลมนตรี รวดเร็ว', subDept: 'งานคัดกรองผู้ป่วย' }
  ],
  thurakan: [
    { name: 'สมชาย ใจดี', subDept: 'งานสารบรรณ' },
    { name: 'วิภาวรรณ สุขศรี', subDept: 'งานพิมพ์และเอกสาร' },
    { name: 'อนันต์ รักสงบ', subDept: 'งานบริหารทั่วไป' },
    { name: 'พิมพ์ใจ ดีจริง', subDept: 'งานจัดเก็บเอกสาร' }
  ],
  phasadu: [
    { name: 'พงษ์ศักดิ์ มีสุข', subDept: 'งานจัดซื้อและสัญญา' },
    { name: 'กนกวรรณ ศรีงาม', subDept: 'งานคลังและพัสดุ' }
  ],
  finance: [
    { name: 'สิริพร สุขสวัสดิ์', subDept: 'งานเบิกจ่ายและงบประมาณ' },
    { name: 'ณรงค์ศักดิ์ บุญมี', subDept: 'งานบัญชี' }
  ],
  admin: [
    { name: 'วิชัย มั่นคง', subDept: 'งานอำนวยการ' },
    { name: 'ธนพร สายชล', subDept: 'งานประสานราชการ' }
  ],
  samnak: [
    { name: 'นภา เพชรแท้', subDept: 'งานธุรการกลาง' },
    { name: 'กิตติพงษ์ วงศ์สว่าง', subDept: 'งานบริหารทรัพยากร' }
  ],
  kitchen: [
    { name: 'สมศรี มีสุข', subDept: 'งานโภชนาการและทำความสะอาด' },
    { name: 'สมพงษ์ ขยัน', subDept: 'งานสถานที่' }
  ],
  electric: [
    { name: 'วิเชียร ช่างทอง', subDept: 'งานซ่อมบำรุงและไฟฟ้า' },
    { name: 'ธีรเดช สายฟ้า', subDept: 'งานสื่อสารและวิทยุ' }
  ],
  computer: [
    { name: 'เดชา เทคโนโลยี', subDept: 'งานสารสนเทศและเครือข่าย' },
    { name: 'จิราพร ซอฟต์แวร์', subDept: 'งานสนับสนุนผู้ใช้' }
  ]
};

export function getRequesterFor(deptId: string, idx: number): { name: string; subDept: string } {
  const list = REQUESTER_SAMPLES[deptId] || REQUESTER_SAMPLES.thurakan;
  return list[idx % list.length];
}

export const SEED_USERS: User[] = [
  { username: 'admin', password: '1234', role: 'admin', roles: ['admin', 'staff', 'head', 'proc', 'prochead', 'exec'], name: 'ผู้ดูแลระบบ (Admin)', category: 'office', deptId: 'admin', status: 'active' },
  { username: 'staff', password: '1234', role: 'staff', roles: ['staff'], name: 'เจ้าหน้าที่ผู้ขอ (Staff)', category: 'office', deptId: 'thurakan', status: 'active' },
  { username: 'head', password: '1234', role: 'head', roles: ['head'], name: 'หัวหน้ากลุ่มงาน/ฝ่าย', category: 'office', deptId: 'thurakan', status: 'active' },
  { username: 'proc', password: '1234', role: 'proc', roles: ['proc'], name: 'เจ้าหน้าที่พัสดุ', category: 'office', deptId: 'phasadu', status: 'active' },
  { username: 'prochead', password: '1234', role: 'prochead', roles: ['prochead'], name: 'หัวหน้าฝ่ายพัสดุ', category: 'office', deptId: 'phasadu', status: 'active' },
  { username: 'exec', password: '1234', role: 'exec', roles: ['exec'], name: 'ผู้บริหาร (Executive)', category: 'office', deptId: 'admin', status: 'active' }
];

let reqCounter = 1;
export function nextId(): string {
  return 'REQ-' + String(reqCounter++).padStart(4, '0');
}

export function seedRequests(): RequestItem[] {
  return [];
}

export function generate10000Requests(): RequestItem[] {
  const reqs: RequestItem[] = [];
  const statuses: RequestStatus[] = ['pending_head', 'pending_proc', 'pending_proc_head', 'pending_exec', 'approved', 'rejected'];
  const depts = DEPARTMENTS.map(d => d.id);
  const items = ALL_ITEMS;
  const fiscalYears = ['2563', '2564', '2565', '2566', '2567', '2568', '2569'];

  for (let i = 1; i <= 10000; i++) {
    const deptId = depts[i % depts.length];
    const itemName = items[(i * 7 + (i % 13)) % items.length];
    const status = statuses[(i * 3 + (i % 5)) % statuses.length];
    const unit = guessUnit(itemName);
    const last = (i % 35) + 5;

    // Simulate varied requested quantities including spikes over 50% and 100%
    let requested = Math.round(last * 1.2);
    if (i % 7 === 0) {
      requested = Math.round(last * 2.2); // >100% spike
    } else if (i % 4 === 0) {
      requested = Math.round(last * 1.65); // >50% spike
    }

    const price = guessPrice(itemName, unit);
    const requester = getRequesterFor(deptId, i);

    const isRejected = status === 'rejected';
    const isAdjusted = i % 2 === 0;

    // Simulate original vs adjusted quantity
    const origQty = isAdjusted ? requested + (i % 4 === 0 ? -5 : (i % 3 === 0 ? 8 : 12)) : requested;
    const rejRoles: ('head' | 'proc' | 'prochead' | 'exec')[] = ['head', 'proc', 'prochead', 'exec'];
    const rejNames = ['หัวหน้าฝ่าย/กลุ่มงาน', 'เจ้าหน้าที่พัสดุ', 'หัวหน้างานพัสดุ', 'ผู้บริหาร'];
    const rejRole = rejRoles[i % 4];
    const rejName = rejNames[i % 4];
    const fiscalYr = fiscalYears[(i * 11 + (i % 7)) % fiscalYears.length];

    reqs.push({
      id: `REQ-${String(i).padStart(5, '0')}`,
      deptId,
      itemName,
      unit,
      qtyLastYear: last,
      qtyRequested: requested,
      status,
      comment: isRejected 
        ? (i % 2 === 0 ? 'ขอให้ทบทวนจำนวนใหม่อีกครั้งเนื่องจากเกินงบประมาณประจำปี' : 'ปรับลดจำนวนลงให้สอดคล้องกับสถิติการใช้งานจริงปีที่แล้ว') 
        : '',
      reason: 'ของเดิมไม่เพียงพอต่อการปฏิบัติงานตลอดปีงบประมาณ',
      unitPrice: price,
      fiscalYear: fiscalYr,
      requesterName: requester.name,
      requesterSubDept: requester.subDept,
      qtyOriginal: origQty,
      qtyAdjusted: requested,
      adjustedByRole: isAdjusted ? (i % 2 === 0 ? 'head' : 'proc') : undefined,
      adjustedByName: isAdjusted ? (i % 2 === 0 ? 'หัวหน้ากลุ่มงาน/ฝ่าย' : 'เจ้าหน้าที่ฝ่ายพัสดุ') : undefined,
      rejectedByRole: isRejected ? rejRole : undefined,
      rejectedByName: isRejected ? rejName : undefined
    });
  }

  return reqs;
}

export const generate5000Requests = generate10000Requests;

export function getItemGpscCode(itemName: string): string {
  const h = Math.abs(hashStr(itemName));
  const prefix = 4400 + (h % 50);
  const suffix = 1000 + ((h * 13) % 8999);
  return `${prefix}-${suffix}`;
}

export function getItemPriceForYear(name: string, unit: string, year: number): number {
  const basePrice = guessPrice(name, unit);
  const h = hashStr(name + '|price|' + year);
  // Simulating slightly increasing price trend over the years 2565 to 2570
  const yearDiff = year - 2569; // 2569 as anchor
  const pctChange = yearDiff * 6 + (h % 11) - 5; // -24% to +16% roughly
  const factor = 1 + pctChange / 100;
  return Math.max(5, Math.round(basePrice * factor));
}

export function getLatestPrice(name: string, unit?: string): number {
  const u = unit || guessUnit(name);
  return getItemPriceForYear(name, u, 2568);
}

