const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

function importCSV(fileName, tableName, columnsCount) {
    return new Promise((resolve) => {
        if (!fs.existsSync(`./${fileName}`)) {
            console.warn(`⚠️ ไม่พบไฟล์: ${fileName} (ข้ามไป)`);
            return resolve();
        }

        let count = 0;
        const placeholders = Array(columnsCount).fill('?').join(',');
        const sql = `INSERT OR IGNORE INTO ${tableName} VALUES (${placeholders})`;

        console.log(`⏳ กำลังดูดข้อมูลจาก ${fileName}...`);
        
        fs.createReadStream(`./${fileName}`)
            .pipe(csv())
            .on('data', (row) => {
                const params = Object.values(row).slice(0, columnsCount);
                if (params.length === columnsCount) {
                    db.run(sql, params);
                    count++;
                }
            })
            .on('end', () => {
                console.log(`✅ นำเข้า ${tableName} สำเร็จ! (${count} แถว)`);
                setTimeout(resolve, 100); 
            });
    });
}

async function runMegaMission() {
    console.log("🚀 เริ่มภารกิจย้ายข้อมูลมหาศาล (Safe Mode)...");
    
    await importCSV('ED Hub 2.0 - Users.csv', 'Users', 11);
    await importCSV('ED Hub 2.0 - Achievements.csv', 'Achievements', 11);
    await importCSV('ED Hub 2.0 - Learning_History.csv', 'Learning_History', 11); // เพิ่มบรรทัดนี้
    await importCSV('ED Hub 2.0 - Task_Templates.csv', 'Task_Templates', 7);
    await importCSV('ED Hub 2.0 - Task_Assignments.csv', 'Task_Assignments', 5);
    await importCSV('ED Hub 2.0 - Task_Responses.csv', 'Task_Responses', 7);
    await importCSV('ED Hub 2.0 - Learning_Catalog.csv', 'Learning_Catalog', 7);
    await importCSV('ED Hub 2.0 - Announcements.csv', 'Announcements', 6);
    await importCSV('ED Hub 2.0 - User_Likes.csv', 'User_Likes', 3);
    await importCSV('ED Hub 2.0 - Dept_Mapping.csv', 'Dept_Mapping', 2);
    await importCSV('ED Hub 2.0 - Config.csv', 'Config', 2);

    console.log("✨ ภารกิจเสร็จสิ้น! ข้อมูลทุกอย่างอยู่ในลิ้นชัก SQL ครบถ้วนแล้วครับกัปตัน");
}

runMegaMission();