const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// ==========================================
// 🗂️ เครื่องมือจัดการโฟลเดอร์อัปโหลดอัตโนมัติ
// ==========================================
function getUploadPaths(category, subFolder, fileName) {
    // 1. สร้างเส้นทางโฟลเดอร์ เช่น uploads/profiles/261478
    // ใช้ string ว่าง '' ถ้าไม่มี subFolder
    const relativeDir = path.join('uploads', category, String(subFolder || '')); 
    const absoluteDir = path.join(__dirname, 'public', relativeDir);

    // 2. ถ้าโฟลเดอร์นี้ยังไม่มี ให้สร้างขึ้นมาใหม่ทันที (รวมถึงโฟลเดอร์แม่ด้วย)
    if (!fs.existsSync(absoluteDir)) {
        fs.mkdirSync(absoluteDir, { recursive: true });
    }

    // 3. สร้าง URL สำหรับให้หน้าเว็บเรียกใช้ (แปลง \ เป็น / เผื่อรันบน Windows)
    const fileUrl = `/${relativeDir}/${fileName}`.replace(/\\/g, '/');
    
    // 4. เส้นทางจริงบนฮาร์ดดิสก์
    const absolutePath = path.join(absoluteDir, fileName);

    return { absolutePath, fileUrl };
}

// ==========================================
// ⚙️ Middleware Setup
// ==========================================
app.use(cors()); 
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 🔴 ล็อคพิกัดที่ 1: บังคับให้ระบบรู้จักโฟลเดอร์ public อย่างแม่นยำ
app.use(express.static(path.join(__dirname, 'public')));

// 🔴 ล็อคพิกัดที่ 2: บังคับให้ฐานข้อมูลอยู่ที่เดียวกับไฟล์ server.js
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// 🔴 ล็อคพิกัดที่ 3: สร้างโฟลเดอร์รูปภาพในโปรเจกต์เท่านั้น
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ==========================================
// 🚀 API Endpoints
// ==========================================

app.get('/', (req, res) => {
    res.send('<h1 style="color: #4a148c; text-align: center; margin-top: 50px;">🚀 HRD HUB Local Server is Online!</h1>');
});

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

app.get('/api/latest-catalog', (req, res) => {
    const sql = "SELECT * FROM Learning_Catalog ORDER BY rowid DESC LIMIT 3";
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: rows });
    });
});

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

app.get('/api/profile/:empId', (req, res) => {
    const empId = req.params.empId;
    const sql = "SELECT * FROM Users WHERE EmpID = ?";
    db.get(sql, [empId], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, user: row });
    });
});

app.post('/api/update-profile', (req, res) => {
    const { empId, fullName, shortDept, fullDept, level, fullPosition } = req.body;
    const sql = "UPDATE Users SET FullName = ?, ShortDept = ?, FullDept = ?, Level = ?, FullPosition = ? WHERE EmpID = ?";
    db.run(sql, [fullName, shortDept, fullDept, level, fullPosition, empId], function(err) {
        if (err) return res.status(500).json({ success: false, message: "ฐานข้อมูลขัดข้อง: " + err.message });
        res.json({ success: true, message: "อัปเดตข้อมูลสำเร็จ!" });
    });
});

app.post('/api/update-password', (req, res) => {
    const { empId, newPassword } = req.body;
    const sql = "UPDATE Users SET Password = ? WHERE EmpID = ?";
    db.run(sql, [newPassword, empId], function(err) {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!" });
    });
});

// --- API อัปโหลดรูปโปรไฟล์ (เวอร์ชันแยกโฟลเดอร์อัจฉริยะ) ---
app.post('/api/upload-profile-pic', (req, res) => {
    console.log("=========================================");
    console.log("📥 เริ่มกระบวนการอัปโหลดรูปภาพ...");
    
    const { empId, base64Image } = req.body;

    if (!base64Image) {
        return res.status(400).json({ success: false, message: "ไม่มีข้อมูลรูปภาพส่งมา" });
    }

    try {
        const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
             return res.status(400).json({ success: false, message: "ข้อมูลรูปภาพผิดรูปแบบ" });
        }

        const mimeType = matches[1];
        const imageData = Buffer.from(matches[2], 'base64');
        let extension = mimeType.split('/')[1] || 'jpg';
        if (extension === 'jpeg') extension = 'jpg';

        // 🌟 เรียกใช้เครื่องจักรแยกไฟล์ 🌟
        // บอกมันว่า: หมวดหมู่ 'profiles', โฟลเดอร์ย่อยคือ 'รหัสพนักงาน'
        const fileName = `pic_${Date.now()}.${extension}`;
        const paths = getUploadPaths('profiles', empId, fileName);

        console.log(`💾 กำลังบันทึกไฟล์ไปที่: ${paths.absolutePath}`);

        fs.writeFile(paths.absolutePath, imageData, (err) => {
            if (err) {
                console.error("❌ เขียนไฟล์ไม่สำเร็จ:", err);
                return res.status(500).json({ success: false, message: `เขียนไฟล์ไม่สำเร็จ: ${err.message}` });
            }

            console.log(`✅ เขียนไฟล์สำเร็จ! เข้าโฟลเดอร์ profiles/${empId} แล้ว`);

            // อัปเดต Database ด้วย URL ใหม่
            const sql = "UPDATE Users SET ProfilePic = ? WHERE EmpID = ?";
            db.run(sql, [paths.fileUrl, empId], function(dbErr) {
                if (dbErr) {
                    console.error("❌ อัปเดต Database ไม่สำเร็จ!", dbErr);
                    return res.status(500).json({ success: false, message: "อัปเดต DB ไม่สำเร็จ" });
                }
                
                console.log(`🎉 อัปโหลดสมบูรณ์! URL: ${paths.fileUrl}`);
                console.log("=========================================");
                res.json({ success: true, message: "อัปโหลดรูปสำเร็จ!", imageUrl: paths.fileUrl });
            });
        });

    } catch (error) {
        console.error("❌ เกิด Error ร้ายแรงในระบบ:", error);
        res.status(500).json({ success: false, message: `Server Error: ${error.message}` });
    }
});

app.get('/api/staff-search', (req, res) => {
    const { keyword, dept } = req.query;
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

app.get('/api/staff-achievements/:empId', (req, res) => {
    const empId = req.params.empId;
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
