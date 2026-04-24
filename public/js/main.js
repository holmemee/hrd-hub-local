// --- Global State ---
let currentUser = null;

// --- ระบบ Login & App Setup ---
async function handleLogin() {
    const empId = document.getElementById('loginEmpId').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('btnLogin');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> ตรวจสอบ...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: empId, password: password })
        });
        const result = await response.json();
        if (result.success) {
            currentUser = result.user;
            showMainApp();
        } else {
            alert(result.message);
        }
    } catch (error) { alert("Offline"); }
    btn.innerHTML = 'เข้าสู่ระบบ';
    btn.disabled = false;
}

function showMainApp() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    document.getElementById('navUserName').innerText = currentUser.FullName || 'User';
    if(currentUser.ProfilePic) document.getElementById('navProfilePic').src = currentUser.ProfilePic;
    renderSidebar();
    switchPage('page-home'); 
}

const menuConfig = [
    { id: 'page-home', name: 'หน้าแรก', icon: 'bi-house-heart', roles: ['User', 'Admin', 'Executive'] },
    { id: 'page-global-dash', name: 'ภาพรวมองค์กร', icon: 'bi-globe-asia-australia', roles: ['Admin', 'Executive', 'User'] },
    { id: 'page-profile', name: 'โปรไฟล์ของฉัน', icon: 'bi-person-badge', roles: ['User', 'Admin', 'Executive'] }
];

function renderSidebar() {
    const sidebarMenu = document.getElementById('sidebarMenu');
    sidebarMenu.innerHTML = '';
    menuConfig.forEach(item => {
        if (item.roles.includes(currentUser.Role || 'User')) {
            sidebarMenu.innerHTML += `
            <li class="nav-item mb-1 mx-2">
                <a href="javascript:void(0);" id="nav-${item.id}" class="nav-link text-dark d-flex align-items-center p-2 rounded-3" onclick="switchPage('${item.id}')">
                    <i class="bi ${item.icon} me-3 fs-5 text-purple"></i><span class="fw-bold">${item.name}</span>
                </a>
            </li>`;
        }
    });
}

async function switchPage(pageId) {
    document.querySelectorAll('.app-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#sidebarMenu .nav-link').forEach(link => {
        link.classList.remove('active', 'text-white');
        link.classList.add('text-dark');
        link.style.backgroundColor = '';
    });
    
    const target = document.getElementById(pageId);
    if (target) {
        target.classList.add('active');
        const activeLink = document.getElementById('nav-' + pageId);
        if (activeLink) {
            activeLink.classList.remove('text-dark');
            activeLink.classList.add('active', 'text-white');
            activeLink.style.backgroundColor = '#4a148c';
        }
        if (target.innerHTML.trim() === '') {
            try {
                const res = await fetch(`/pages/${pageId}.html`);
                if (res.ok) target.innerHTML = await res.text();
            } catch (e) { console.error("Load fail"); }
        }
        // เรียกใช้ฟังก์ชันประจำหน้า
        if (pageId === 'page-home') loadHomeData();
        if (pageId === 'page-profile') loadUserProfile();
        if (pageId === 'page-global-dash') renderGlobalDashboard();
    }
}

function toggleSidebar() { document.getElementById('sidebar-container').classList.toggle('collapsed'); }
function handleLogout() { location.reload(); }
