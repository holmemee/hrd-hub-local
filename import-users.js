const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

// ฟังก์ชันดูดข้อมูลแบบอัตโนมัติ
async function fastImport(fileName, tableName, columns) {
    return new Promise((resolve) => {
        let count = 0;
        const placeholders = columns.map(() => '?').join(',');
        const sql = `INSERT OR IGNORE INTO ${tableName} VALUES (${placeholders})`;

        fs.createReadStream(`./${fileName}`)
            .pipe(csv())
            .on('data', (row) => {
                // ดึงค่าจากแต่ละแถวตามลำดับคอลัมน์
                const params = Object.values(row);
                db.run(sql, params);
                count++;
            })
            .on('end', () => {
                console.log(`✅ นำเข้า ${tableName} เรียบร้อย: ${count} แถว`);
                resolve();
            });
    });
}

async function runMegaMission() {
    console.log("🚀 เริ่มภารกิจดูดข้อมูลมหาศาล...");
    
    // กัปตันสามารถเพิ่มบรรทัดตามชื่อไฟล์ที่มีได้เลยครับ
    await fastImport('ED Hub 2.0 - Users.csv', 'Users', 11);
    await fastImport('ED Hub 2.0 - Achievements.csv', 'Achievements', 11);
    await fastImport('ED Hub 2.0 - Task_Templates.csv', 'Task_Templates', 7);
    await fastImport('ED Hub 2.0 - Task_Assignments.csv', 'Task_Assignments', 5);
    await fastImport('ED Hub 2.0 - Task_Responses.csv', 'Task_Responses', 7);
    await fastImport('ED Hub 2.0 - Learning_Catalog.csv', 'Learning_Catalog', 7);
    await fastImport('ED Hub 2.0 - Announcements.csv', 'Announcements', 6);
    await fastImport('ED Hub 2.0 - User_Likes.csv', 'User_Likes', 3);
    await fastImport('ED Hub 2.0 - Dept_Mapping.csv', 'Dept_Mapping', 2);
    await fastImport('ED Hub 2.0 - Config.csv', 'Config', 2);

    console.log("✨ ภารกิจเสร็จสมบูรณ์! ตอนนี้ Mac M1 ของกัปตันมีฐานข้อมูลที่แข็งแกร่งที่สุดในเขต 3 แล้วครับ!");
}

runMegaMission();