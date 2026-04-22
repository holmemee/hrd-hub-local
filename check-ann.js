const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all("SELECT * FROM Announcements", [], (err, rows) => {
    if (err) {
        console.error("❌ เกิดข้อผิดพลาด:", err.message);
    } else {
        console.log(`📊 พบข้อมูลในตาราง Announcements ทั้งหมด: ${rows.length} แถว`);
        if (rows.length > 0) {
            console.log("ตัวอย่างข้อมูลแถวแรก:");
            console.log(rows[0]); // จะเห็นเลยว่าคอลัมน์ชื่ออะไร และค่าเป็นยังไง
        } else {
            console.log("⚠️ ไม่มีข้อมูลในตารางนี้เลยครับกัปตัน!");
        }
    }
    db.close();
});