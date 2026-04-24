// --- 1. โหลดข้อมูลโปรไฟล์ ---
async function loadUserProfile() {
    if (!currentUser) return;
    try {
        const response = await fetch(`/api/profile/${currentUser.EmpID}`);
        const result = await response.json();
        if (result.success) {
            const u = result.user;
            document.getElementById('profileName').innerText = u.FullName;
            document.getElementById('profileEmpId').innerText = u.EmpID;
            document.getElementById('profileLevel').innerText = u.Level || '-';
            document.getElementById('profileDept').innerText = u.FullDept;
            document.getElementById('profilePosition').innerText = u.FullPosition || '-';
            
            if(u.ProfilePic) {
                // เติม ?t= เพื่อป้องกันภาพจำของเก่า (Cache Busting)
                document.getElementById('profilePicBig').src = u.ProfilePic + '?t=' + Date.now();
            }
        }
    } catch (e) { console.error("Load Profile Fail"); }
}

// ในไฟล์ public/js/profile.js (อัปเดตเฉพาะฟังก์ชันนี้)
function uploadProfilePic(event) {
    const file = event.target.files[0];
    if(!file) return;

    // จำรูปเก่าไว้ เผื่ออัปโหลดพังจะได้คืนค่าเดิม
    const oldPicSrc = document.getElementById('profilePicBig').src;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64 = e.target.result;
        document.getElementById('profilePicBig').style.opacity = '0.5';

        try {
            const res = await fetch('/api/upload-profile-pic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empId: currentUser.EmpID, base64Image: base64 })
            });
            
            const data = await res.json();
            
            if(res.ok && data.success) {
                // อัปโหลดผ่าน!
                currentUser.ProfilePic = data.imageUrl;
                localStorage.setItem('currentUser', JSON.stringify(currentUser)); 
                
                const newPath = data.imageUrl + '?t=' + Date.now();
                document.getElementById('profilePicBig').src = newPath;
                document.getElementById('navProfilePic').src = newPath;
                alert("เปลี่ยนรูปโปรไฟล์สำเร็จ!");
            } else {
                // อัปโหลดไม่ผ่าน ให้คืนค่ารูปเก่าและแจ้งเตือน
                document.getElementById('profilePicBig').src = oldPicSrc;
                alert("❌ อัปโหลดพัง: " + data.message);
            }
        } catch(err) {
            document.getElementById('profilePicBig').src = oldPicSrc;
            alert('❌ หน้าเว็บพัง หรือ ข้อมูลใหญ่เกินกว่าท่อส่งได้ (Payload Too Large)');
        }
        
        document.getElementById('profilePicBig').style.opacity = '1';
    };
    reader.readAsDataURL(file);
}

// --- 3. แก้ไขข้อมูลส่วนตัว ---
function openEditProfile() {
    document.getElementById('editFullName').value = currentUser.FullName || '';
    document.getElementById('editShortDept').value = currentUser.ShortDept || '';
    document.getElementById('editFullDept').value = currentUser.FullDept || '';
    document.getElementById('editLevel').value = currentUser.Level || '';
    document.getElementById('editPosition').value = currentUser.FullPosition || '';
    new bootstrap.Modal(document.getElementById('editProfileModal')).show();
}

async function saveProfile() {
    const btn = document.getElementById('btnSaveProfile');
    btn.innerHTML = 'กำลังบันทึก...';
    btn.disabled = true;

    const payload = {
        empId: currentUser.EmpID,
        fullName: document.getElementById('editFullName').value,
        shortDept: document.getElementById('editShortDept').value,
        fullDept: document.getElementById('editFullDept').value,
        level: document.getElementById('editLevel').value,
        fullPosition: document.getElementById('editPosition').value
    };
    
    try {
        const res = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(data.success) {
            // อัปเดตข้อมูลและเซฟลงความจำ Browser
            Object.assign(currentUser, payload);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            document.getElementById('navUserName').innerText = currentUser.FullName;
            bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
            loadUserProfile(); // โหลดหน้าจอใหม่
        } else {
            alert(data.message);
        }
    } catch(e) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    
    btn.innerHTML = 'บันทึกการเปลี่ยนแปลง';
    btn.disabled = false;
}

// --- 4. เปลี่ยนรหัสผ่าน ---
function openChangePassword() { 
    document.getElementById('changePasswordForm').reset();
    new bootstrap.Modal(document.getElementById('changePasswordModal')).show(); 
}

async function savePassword() {
    const p1 = document.getElementById('newPassword').value;
    if(p1 !== document.getElementById('confirmPassword').value) return alert('รหัสผ่านไม่ตรงกัน');
    
    const btn = document.getElementById('btnSavePassword');
    btn.innerHTML = 'กำลังบันทึก...';
    btn.disabled = true;

    try {
        const res = await fetch('/api/update-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId: currentUser.EmpID, newPassword: p1 })
        });
        const data = await res.json();
        if(data.success) {
            alert("เปลี่ยนรหัสสำเร็จ!");
            bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
        } else {
            alert(data.message);
        }
    } catch(e) {
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    
    btn.innerHTML = 'บันทึกรหัสผ่านใหม่';
    btn.disabled = false;
}
