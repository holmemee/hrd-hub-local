const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// ==========================================
// ⚙️ Middleware Setup
// ==========================================
app.use(cors()); 
// สำคัญ: ขยายท่อรับข้อมูลเป็น 50MB เพื่อรองรับ Base64 จากหน้าบ้าน
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// เชื่อมต่อฐานข้อมูล
const db = new sqlite3.Database('./database.sqlite');

// สร้างโฟลเดอร์เก็บรูปอัตโนมัติ (ถ้ายังไม่มี)
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ==========================================
// 🚀 API Endpoints
// ==========================================

// --- 1. หน้าแรกทดสอบ ---
app.get('/', (req, res) => {
    res.send('<h1 style="color: #4a148c; text-align: center; margin-top: 50px;">🚀 HRD HUB Local Server is Online!</h1>');
});

// --- 2. ระบบ Login ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const sql = "SELECT * FROM Users WHERE EmpID = ? AND Password = ?";
    db.get(sql, [username, password], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        if (row) {
            res.json({ success: true, user: row });
        } else {
            res.json({ success: false, message: "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง" });
        }
    });
});

// --- 3. ดึง Config (รางวัล/แผนก) ---
app.get('/api/config', (req, res) => {
    db.all("SELECT * FROM Config", [], (err, configRows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        let config = { mainOffice: [], dept: [], awardLevel: [], awardType: [], activityCategory: [] };
        configRows.forEach(row => {
            if (row.Key === 'AwardLevel') config.awardLevel.push(row.Value);
            if (row.Key === 'AwardBody') config.awardType.push(row.Value);
            if (row.Key === 'AwardCategory') config.activityCategory.push(row.Value);
            if (row.Key === 'TaskCategory') config.activityCategory.push(row.Value);
        });

        db.all("SELECT DISTINCT FullDept FROM Dept_Mapping", [], (err, deptRows) => {
            if (!err) config.dept = deptRows.map(d => d.FullDept);
            res.json({ success: true, data: config });
        });
    });
});

// --- 4. ดึง Catalog 3 อันล่าสุด ---
app.get('/api/latest-catalog', (req, res) => {
    const sql = "SELECT * FROM Learning_Catalog ORDER BY rowid DESC LIMIT 3";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// --- 5. ดึงประกาศ (Banners & Popups) ---
app.get('/api/announcements', (req, res) => {
    const sql = "SELECT * FROM Announcements WHERE UPPER(status) = 'TRUE'";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        const all = rows.map(row => ({
            id: row.id,
            title: row.title,
            image: row.image,
            link: row.link,
            isPopup: (String(row.isPopup).toUpperCase().trim() === 'TRUE'),
            date: 'ประกาศล่าสุด'
        }));

        const banners = all.filter(ann => !ann.isPopup);
        const popups = all.filter(ann => ann.isPopup);
        res.json({ success: true, all, banners, popups });
    });
});

// --- 6. ข้อมูลโปรไฟล์รายบุคคล ---
app.get('/api/profile/:empId', (req, res) => {
    const empId = req.params.empId;
    const sql = "SELECT * FROM Users WHERE EmpID = ?";
    db.get(sql, [empId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, user: row });
    });
});

// --- 7. แก้ไขข้อมูลส่วนตัว ---
app.post('/api/update-profile', (req, res) => {
    const { empId, fullName, shortDept, fullDept, level, fullPosition } = req.body;
    const sql = "UPDATE Users SET FullName = ?, ShortDept = ?, FullDept = ?, Level = ?, FullPosition = ? WHERE EmpID = ?";
    db.run(sql, [fullName, shortDept, fullDept, level, fullPosition, empId], function(err) {
        if (err) return res.status(500).json({ success: false, message: "ฐานข้อมูลขัดข้อง: " + err.message });
        res.json({ success: true, message: "อัปเดตข้อมูลสำเร็จ!" });
    });
});

// --- 8. เปลี่ยนรหัสผ่าน ---
app.post('/api/update-password', (req, res) => {
    const { empId, newPassword } = req.body;
    const sql = "UPDATE Users SET Password = ? WHERE EmpID = ?";
    db.run(sql, [newPassword, empId], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!" });
    });
});

// --- API อัปโหลดรูปโปรไฟล์ (เวอร์ชันตรวจจับ Error ละเอียด) ---
app.post('/api/upload-profile-pic', (req, res) => {
    console.log("=========================================");
    console.log("📥 เริ่มกระบวนการอัปโหลดรูปภาพ...");
    
    const { empId, base64Image } = req.body;

    if (!base64Image) {
        console.log("❌ พังจุดที่ 1: หน้าเว็บไม่ได้ส่งข้อมูลรูปมาให้");
        return res.status(400).json({ success: false, message: "ไม่มีข้อมูลรูปภาพส่งมา" });
    }

    try {
        // 1. เช็คและสร้างโฟลเดอร์แบบ Real-time (ใช้ process.cwd() ชัวร์กว่า __dirname)
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            console.log("📁 ไม่พบโฟลเดอร์ uploads กำลังสร้างใหม่...");
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // 2. แยกข้อมูล Base64
        const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
             console.log("❌ พังจุดที่ 2: ข้อมูลที่ส่งมาไม่ใช่ Base64 ที่อ่านได้");
             return res.status(400).json({ success: false, message: "ข้อมูลรูปภาพผิดรูปแบบ" });
        }

        const mimeType = matches[1];
        const imageData = Buffer.from(matches[2], 'base64');
        let extension = mimeType.split('/')[1] || 'jpg';
        if (extension === 'jpeg') extension = 'jpg';

        // 3. กำหนดชื่อและเส้นทาง
        const fileName = `profile_${empId}_${Date.now()}.${extension}`;
        const filePath = path.join(uploadDir, fileName);
        const fileUrl = `/uploads/${fileName}`;

        console.log(`💾 พยายามบันทึกไฟล์ไปที่: ${filePath}`);

        // 4. บันทึกไฟล์ลงเครื่อง
        fs.writeFile(filePath, imageData, (err) => {
            if (err) {
                console.error("❌ พังจุดที่ 3: คอมพิวเตอร์ไม่ยอมให้เขียนไฟล์!", err);
                return res.status(500).json({ success: false, message: `เขียนไฟล์ไม่สำเร็จ: ${err.message}` });
            }

            console.log(`✅ เขียนไฟล์สำเร็จ! รูปเข้าไปอยู่ในโฟลเดอร์แล้ว`);
            console.log(`🔄 กำลังอัปเดต Database ให้จำ URL: ${fileUrl}`);

            // 5. บันทึกลง Database
            const sql = "UPDATE Users SET ProfilePic = ? WHERE EmpID = ?";
            db.run(sql, [fileUrl, empId], function(dbErr) {
                if (dbErr) {
                    console.error("❌ พังจุดที่ 4: อัปเดต Database ไม่สำเร็จ!", dbErr);
                    return res.status(500).json({ success: false, message: `อัปเดต DB ไม่สำเร็จ: ${dbErr.message}` });
                }
                
                console.log(`🎉 สำเร็จทุกขั้นตอน!`);
                console.log("=========================================");
                res.json({ success: true, message: "อัปโหลดรูปสำเร็จ!", imageUrl: fileUrl });
            });
        });

    } catch (error) {
        console.error("❌ พังจุดที่ 5: เกิด Error ร้ายแรงในระบบ:", error);
        res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
});

// --- 10. ค้นหาพนักงาน (Directory Lookup) ---
app.get('/api/staff-search', (req, res) => {
    const { keyword, dept } = req.query;
    // ป้องกันการดึง ProfilePic มาโดยไม่จำเป็นเพื่อความเร็ว (ดึงเฉพาะตอนดูโปรไฟล์เต็ม)
    let sql = "SELECT EmpID, FullName, ShortDept, FullDept, Role, ProfilePic FROM Users WHERE (FullName LIKE ? OR EmpID LIKE ?)";
    let params = [`%${keyword}%`, `%${keyword}%`];

    if (dept) {
        sql += " AND FullDept = ?";
        params.push(dept);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// --- 11. สถิติ Dashboard (คะแนน/จำนวนคน) ---
app.get('/api/global-stats', (req, res) => {
    const sql = `
        SELECT 
            (SELECT COUNT(*) FROM Users) as totalStaff,
            (SELECT SUM(Score) FROM Achievements) as totalScore
    `;
    db.get(sql, [], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        const avg = row.totalStaff > 0 ? (row.totalScore / row.totalStaff).toFixed(2) : 0;
        res.json({ 
            success: true, 
            totalStaff: row.totalStaff || 0, 
            totalScore: (row.totalScore || 0).toLocaleString(), 
            avgScore: avg 
        });
    });
});

// --- 12. ติดตามสถานะงานแยกแผนก ---
app.get('/api/task-tracking-stats', (req, res) => {
    const sql = `
        SELECT 
            u.FullDept,
            COUNT(CASE WHEN ta.OverallStatus = 'Completed' THEN 1 END) as completed,
            COUNT(CASE WHEN ta.OverallStatus = 'In Progress' THEN 1 END) as inProgress,
            COUNT(CASE WHEN ta.OverallStatus IS NULL OR ta.OverallStatus = 'Not Started' THEN 1 END) as pending
        FROM Users u
        LEFT JOIN Task_Assignments ta ON u.EmpID = ta.EmpID
        GROUP BY u.FullDept
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// --- 13. ดึงประวัติผลงานรายบุคคล ---
app.get('/api/staff-achievements/:empId', (req, res) => {
    const empId = req.params.empId;
    const sql = "SELECT * FROM Achievements WHERE Emp_ID = ? ORDER BY Date DESC";
    db.all(sql, [empId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// ==========================================
// 🏁 Start Server
// ==========================================
app.listen(PORT, () => {
    console.log(`
    =============================================
    ✅ HRD HUB Server พร้อมรับออเดอร์แล้ว!
    📍 URL: http://localhost:${PORT}
    📁 โฟลเดอร์รูปภาพ: public/uploads
    =============================================
    `);
});
