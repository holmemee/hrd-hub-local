const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
    console.log("🔨 กำลังเริ่มสร้างลิ้นชักฐานข้อมูลใหม่ทั้งหมด...");

    // 1. ตารางพื้นฐาน
    db.run(`CREATE TABLE IF NOT EXISTS Users (EmpID TEXT PRIMARY KEY, FullName TEXT, ShortDept TEXT, FullDept TEXT, Level TEXT, MainOffice TEXT, FullPosition TEXT, Password TEXT, Role TEXT, Status TEXT, ProfilePic TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS Achievements (Record_ID TEXT PRIMARY KEY, Emp_ID TEXT, Date TEXT, Source TEXT, Title TEXT, Category TEXT, Award_Level TEXT, Body_Level TEXT, Score REAL, Team_Members TEXT, External_Link TEXT)`);
    
    // 2. ตารางเกี่ยวกับงาน (Tasks)
    db.run(`CREATE TABLE IF NOT EXISTS Task_Templates (TemplateID TEXT, RoleName TEXT, Year TEXT, StepNumber INTEGER, StepTitle TEXT, Instructions TEXT, TargetDate TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS Task_Assignments (AssignmentID TEXT PRIMARY KEY, EmpID TEXT, TemplateID TEXT, AssignDate TEXT, OverallStatus TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS Task_Responses (ResponseID TEXT PRIMARY KEY, AssignmentID TEXT, StepNumber INTEGER, SubmissionText TEXT, IsCompleted TEXT, SubmitTimestamp TEXT, Feedback TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS Tasks (TaskID TEXT, EmpID TEXT, TaskName TEXT, Deadline TEXT, Status TEXT, FileURL TEXT, Year TEXT, Note TEXT)`);

    // 3. ตาราง Content และระบบอื่นๆ (ที่เป็นปัญหาเมื่อกี้)
    db.run(`CREATE TABLE IF NOT EXISTS Learning_Catalog (ContentID TEXT PRIMARY KEY, Category TEXT, Title TEXT, URL_Link TEXT, Tags TEXT, ThumbnailURL TEXT, Description TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS Announcements (
    id TEXT PRIMARY KEY, 
    title TEXT, 
    image TEXT, 
    link TEXT, 
    isPopup TEXT, 
    status TEXT
)`);
    db.run(`CREATE TABLE IF NOT EXISTS User_Likes (EmpID TEXT, ContentID TEXT, Timestamp TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS Dept_Mapping (FullDept TEXT, TrackingUnit TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS Config (Key TEXT, Value TEXT)`);

    console.log("✅ สร้างลิ้นชักครบทุกใบแล้ว! (Users, Achievements, Task_Templates, Task_Assignments, Task_Responses, Tasks, Learning_Catalog, Announcements, User_Likes, Dept_Mapping, Config)");
});
db.close();