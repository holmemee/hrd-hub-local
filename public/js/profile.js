async function loadUserProfile() {
    if (!currentUser) return;
    try {
        const response = await fetch(`/api/profile/${currentUser.EmpID}`);
        const result = await response.json();
        if (result.success) {
            const u = result.user;
            document.getElementById('profileName').innerText = u.FullName;
            document.getElementById('profileEmpId').innerText = u.EmpID;
            document.getElementById('profileLevel').innerText = u.Level;
            document.getElementById('profileDept').innerText = u.FullDept;
            document.getElementById('profilePosition').innerText = u.FullPosition;
            if(u.ProfilePic) document.getElementById('profilePicBig').src = u.ProfilePic;
        }
    } catch (e) { console.error("Load Profile Fail"); }
}

function uploadProfilePic(event) {
    const file = event.target.files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const base64 = e.target.result;
        
        // ทำให้รูปเบลอตอนกำลังโหลด
        document.getElementById('profilePicBig').style.opacity = '0.5';

        try {
            const res = await fetch('/api/upload-profile-pic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empId: currentUser.EmpID, base64Image: base64 })
            });
            
            const data = await res.json();
            
            if(data.success) {
                // 🌟 ใช้ URL ไฟล์จริงๆ ที่ส่งกลับมาจาก Server
                currentUser.ProfilePic = data.imageUrl;
                document.getElementById('profilePicBig').src = data.imageUrl;
                document.getElementById('navProfilePic').src = data.imageUrl;
            } else {
                alert(data.message);
            }
        } catch(err) {
            alert('การเชื่อมต่อขัดข้อง');
        }
        
        // คืนค่าความชัดให้รูป
        document.getElementById('profilePicBig').style.opacity = '1';
    };
    
    reader.readAsDataURL(file);
}

function openEditProfile() {
    document.getElementById('editFullName').value = currentUser.FullName || '';
    document.getElementById('editShortDept').value = currentUser.ShortDept || '';
    document.getElementById('editFullDept').value = currentUser.FullDept || '';
    document.getElementById('editLevel').value = currentUser.Level || '';
    document.getElementById('editPosition').value = currentUser.FullPosition || '';
    new bootstrap.Modal(document.getElementById('editProfileModal')).show();
}

async function saveProfile() {
    const payload = {
        empId: currentUser.EmpID,
        fullName: document.getElementById('editFullName').value,
        shortDept: document.getElementById('editShortDept').value,
        fullDept: document.getElementById('editFullDept').value,
        level: document.getElementById('editLevel').value,
        fullPosition: document.getElementById('editPosition').value
    };
    const res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if((await res.json()).success) {
        Object.assign(currentUser, payload);
        document.getElementById('navUserName').innerText = currentUser.FullName;
        bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
        loadUserProfile();
    }
}

function openChangePassword() { new bootstrap.Modal(document.getElementById('changePasswordModal')).show(); }

async function savePassword() {
    const p1 = document.getElementById('newPassword').value;
    if(p1 !== document.getElementById('confirmPassword').value) return alert('รหัสผ่านไม่ตรงกัน');
    const res = await fetch('/api/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: currentUser.EmpID, newPassword: p1 })
    });
    if((await res.json()).success) {
        alert("เปลี่ยนรหัสสำเร็จ");
        bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
    }
}
