const sqlite3 = require('sqlite3').verbose();

// 1. เชื่อมต่อลิ้นชักเดิม
const db = new sqlite3.Database('./database.sqlite');

console.log("🔍 กำลังสุ่มตรวจสอบข้อมูลพนักงาน 5 คนแรก...");

// 2. ใช้คำสั่ง SQL: 
// SELECT * (เลือกทุกคอลัมน์) 
// FROM Users (จากตาราง Users) 
// LIMIT 5 (เอามาแค่ 5 แถวพอ เดี๋ยวลายตา)
const sql = "SELECT * FROM Users LIMIT 5";

db.all(sql, [], (err, rows) => {
    if (err) {
        console.error("❌ ค้นหาไม่สำเร็จ:", err.message);
        return;
    }

    // 3. แสดงผลในรูปแบบตารางสวยๆ ใน Terminal
    console.table(rows);
    
    console.log("✅ ตรวจสอบเรียบร้อย ข้อมูลอยู่ในลิ้นชักครบถ้วน!");
    db.close();
});