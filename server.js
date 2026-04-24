const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors()); 
app.use(express.json({ limit: '50mb' })); // ขยายท่อรับข้อมูลเป็น 50MB (สำหรับรูปภาพ)
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// เชื่อมต่อฐานข้อมูล
const db = new sqlite3.Database('./database.sqlite');

const fs = require('fs');
const path = require('path');

// สร้างโฟลเดอร์เก็บรูปอัตโนมัติ (ถ้ายังไม่มี)
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- 1. หน้าแรกทดสอบ ---
app.get('/', (req, res) => {
    res.send('<h1 style="color: #4a148c; text-align: center; margin-top: 50px;">🚀 HRD HUB Local Server is Online!</h1>');
});

// --- 2. ระบบ Login (แทนที่ verifyUser เดิม) ---
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

// --- 3. ดึง Config (แทนที่ getConfigData เดิม) ---
app.get('/api/config', (req, res) => {
    // ดึงข้อมูลจากตาราง Config และ Dept_Mapping มาประกอบกัน
    db.all("SELECT * FROM Config", [], (err, configRows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        let config = { mainOffice: [], dept: [], awardLevel: [], awardType: [], activityCategory: [] };
        
        configRows.forEach(row => {
            if (row.Key === 'AwardLevel') config.awardLevel.push(row.Value);
            if (row.Key === 'AwardBody') config.awardType.push(row.Value);
            if (row.Key === 'AwardCategory') config.activityCategory.push(row.Value);
            if (row.Key === 'TaskCategory') config.activityCategory.push(row.Value);
        });

        // ดึงรายชื่อแผนกจากตาราง Dept_Mapping เพิ่มเติม
        db.all("SELECT DISTINCT FullDept FROM Dept_Mapping", [], (err, deptRows) => {
            if (!err) config.dept = deptRows.map(d => d.FullDept);
            // ส่วน mainOffice กัปตันสามารถเพิ่มในตาราง Config หรือดึงจากตารางอื่นได้ครับ
            res.json({ success: true, data: config });
        });
    });
});

// --- 4. ดึง Catalog 3 อันล่าสุด (แทนที่ getLatestCatalogContent เดิม) ---
app.get('/api/latest-catalog', (req, res) => {
    // ใน SQL เราไม่ต้องใช้ Loop ย้อนกลับเหมือน GAS 
    // เราสั่ง ORDER BY rowid DESC (เรียงจากล่าสุด) และ LIMIT 3 ได้เลยครับ
    const sql = "SELECT * FROM Learning_Catalog ORDER BY rowid DESC LIMIT 3";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// --- 🚀 อัปเดต API ประกาศ (ฉบับคอลัมน์ภาษาอังกฤษ) ---
app.get('/api/announcements', (req, res) => {
    // ใช้ UPPER เพื่อให้ค้นหาได้แม่นยำขึ้น
    const sql = "SELECT * FROM Announcements WHERE UPPER(status) = 'TRUE'";
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        
        console.log(`📢 พบประกาศในระบบ: ${rows.length} รายการ`);

        const all = rows.map(row => {
            // ตรวจสอบชื่อคอลัมน์ให้ตรงกับที่สร้างใน init-db.js (id, title, image, link, ispopup, status)
            return {
                id: row.id,
                title: row.title,
                image: row.image,
                link: row.link,
                // ตรวจสอบค่าที่เป็นได้ทั้ง 'TRUE', 'true', หรือ 1
                isPopup: (String(row.isPopup).toUpperCase().trim() === 'TRUE'),
                date: 'ประกาศล่าสุด'
            };
        });

        const banners = all.filter(ann => !ann.isPopup);
        const popups = all.filter(ann => ann.isPopup);

        res.json({ success: true, all, banners, popups });
    });
});

// --- 5. API สำหรับ Profile (ดึงข้อมูลรายบุคคล) ---
app.get('/api/profile/:empId', (req, res) => {
    const empId = req.params.empId;
    const sql = "SELECT * FROM Users WHERE EmpID = ?";
    db.get(sql, [empId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, user: row });
    });
});

// --- 6. API สำหรับ Global Dashboard (สรุปภาพรวม) ---
app.get('/api/global-stats', (req, res) => {
    // ใช้ SQL คำนวณค่าเฉลี่ยและยอดรวมจากตาราง Users และ Achievements
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

// --- 7. API อัปเดตข้อมูลส่วนตัว (Edit Profile) ---
app.post('/api/update-profile', (req, res) => {
    const { empId, fullName, shortDept, fullDept, level, fullPosition } = req.body;
    const sql = "UPDATE Users SET FullName = ?, ShortDept = ?, FullDept = ?, Level = ?, FullPosition = ? WHERE EmpID = ?";
    db.run(sql, [fullName, shortDept, fullDept, level, fullPosition, empId], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: "อัปเดตข้อมูลสำเร็จ!" });
    });
});

// --- 8. API เปลี่ยนรหัสผ่าน (Change Password) ---
app.post('/api/update-password', (req, res) => {
    const { empId, newPassword } = req.body;
    const sql = "UPDATE Users SET Password = ? WHERE EmpID = ?";
    db.run(sql, [newPassword, empId], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!" });
    });
});

// --- 9. API อัปโหลดรูปโปรไฟล์ (บันทึกเป็นไฟล์จริงๆ) ---
app.post('/api/upload-profile-pic', (req, res) => {
    const { empId, base64Image } = req.body;

    // 1. แยกส่วนหัวของ Base64 ออก (เช่น "data:image/png;base64,...")
    const matches = base64Image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, message: "ไฟล์รูปภาพไม่ถูกต้อง" });
    }

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const imageData = Buffer.from(matches[2], 'base64');
    
    // 2. ตั้งชื่อไฟล์ใหม่ (ใส่ Date.now() ป้องกันเบราว์เซอร์จำรูปเก่า)
    const fileName = `profile_${empId}_${Date.now()}.${extension}`;
    const filePath = path.join(uploadDir, fileName);
    const fileUrl = `/uploads/${fileName}`; // เส้นทางที่จะส่งให้หน้าเว็บ

    // 3. เขียนไฟล์ลงโฟลเดอร์ public/uploads/
    fs.writeFile(filePath, imageData, (err) => {
        if (err) return res.status(500).json({ success: false, message: "บันทึกไฟล์ล้มเหลว" });

        // 4. เอาเส้นทางไฟล์ (URL) ไปเซฟลง Database แทน Base64 ยาวๆ
        const sql = "UPDATE Users SET ProfilePic = ? WHERE EmpID = ?";
        db.run(sql, [fileUrl, empId], function(dbErr) {
            if (dbErr) return res.status(500).json({ success: false, message: dbErr.message });
            res.json({ success: true, message: "เปลี่ยนรูปโปรไฟล์สำเร็จ!", imageUrl: fileUrl });
        });
    });
});

// ==========================================
// 🚀 API สำหรับหน้า Profile (บันทึก/แก้ไขข้อมูล)
// ==========================================

// --- 7. API อัปเดตข้อมูลส่วนตัว (Edit Profile) ---
app.post('/api/update-profile', (req, res) => {
    const { empId, fullName, shortDept, fullDept, level, fullPosition } = req.body;
    const sql = "UPDATE Users SET FullName = ?, ShortDept = ?, FullDept = ?, Level = ?, FullPosition = ? WHERE EmpID = ?";
    
    db.run(sql, [fullName, shortDept, fullDept, level, fullPosition, empId], function(err) {
        if (err) return res.status(500).json({ success: false, message: "ฐานข้อมูลขัดข้อง: " + err.message });
        res.json({ success: true, message: "อัปเดตข้อมูลสำเร็จ!" });
    });
});

// --- 8. API เปลี่ยนรหัสผ่าน (Change Password) ---
app.post('/api/update-password', (req, res) => {
    const { empId, newPassword } = req.body;
    const sql = "UPDATE Users SET Password = ? WHERE EmpID = ?";
    
    db.run(sql, [newPassword, empId], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!" });
    });
});

// --- 9. API อัปโหลดรูปโปรไฟล์ (Upload Profile Pic) ---
app.post('/api/upload-profile-pic', (req, res) => {
    const { empId, base64Image } = req.body;
    const sql = "UPDATE Users SET ProfilePic = ? WHERE EmpID = ?";
    
    db.run(sql, [base64Image, empId], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: "เปลี่ยนรูปโปรไฟล์สำเร็จ!" });
    });
});

// --- 10. API ค้นหาพนักงาน (Directory Lookup) ---
app.get('/api/staff-search', (req, res) => {
    const { keyword, dept } = req.query;
    let sql = "SELECT * FROM Users WHERE (FullName LIKE ? OR EmpID LIKE ?)";
    let params = [`%${keyword}%`, `%${keyword}%` || '%%'];

    if (dept) {
        sql += " AND FullDept = ?";
        params.push(dept);
    }

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

// --- 11. API ติดตามสถานะงาน (Task Tracking) ---
// ตัวนี้จะไปนับว่าแต่ละแผนก ทำงานสำเร็จ (Green), กำลังทำ (Orange), หรือยังไม่เริ่ม (Red)
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


// --- 12. API ดึงประวัติผลงานรายบุคคล (Staff Achievements) ---
app.get('/api/staff-achievements/:empId', (req, res) => {
    const empId = req.params.empId;
    // ดึงผลงานของพนักงานคนนี้ เรียงจากวันที่ล่าสุดไปเก่าสุด
    const sql = "SELECT * FROM Achievements WHERE Emp_ID = ? ORDER BY Date DESC";
    
    db.all(sql, [empId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

app.listen(PORT, () => {
    console.log(`
    =============================================
    ✅ HRD HUB Server พร้อมรับออเดอร์แล้ว!
    📍 URL: http://localhost:${PORT}
    =============================================
    `);
});
