async function renderGlobalDashboard() {
    try {
        const response = await fetch('/api/global-stats');
        const data = await response.json();
        if (data.success) {
            document.getElementById('gdTotalScore').innerText = data.totalScore;
            document.getElementById('gdTotalStaff').innerText = data.totalStaff;
            document.getElementById('gdAvgScore').innerText = data.avgScore;
        }
    } catch (e) { console.error("Load Stats Fail"); }
}

// --- ฟังก์ชันค้นหาพนักงานรายบุคคล ---
async function execStaffSearch() {
  const keyword = document.getElementById('gdSearchKeyword').value;
  const dept = document.getElementById('gdSearchDept').value;
  const resultsContainer = document.getElementById('gdSearchResults');
  
  resultsContainer.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-purple"></div></div>';

  try {
    // ยิง API ค้นหา (ที่เราเขียนไว้ใน server.js)
    const response = await fetch(`/api/staff-search?keyword=${keyword}&dept=${dept}`);
    const result = await response.json();
    
    if (result.success && result.data.length > 0) {
      let html = '';
      result.data.forEach(user => {
        html += `
          <div class="col-md-4 mb-3">
            <div class="card staff-card p-3 shadow-sm" onclick="showStaffPortfolio('${user.EmpID}')" style="cursor: pointer;">
              <div class="d-flex align-items-center">
                <img src="${user.ProfilePic || 'https://via.placeholder.com/50'}" class="rounded-circle me-3" style="width:50px; height:50px; object-fit:cover; border: 2px solid #ce93d8;">
                <div>
                  <h6 class="mb-0 fw-bold text-purple">${user.FullName}</h6>
                  <small class="text-muted">${user.ShortDept || user.FullDept}</small>
                </div>
              </div>
            </div>
          </div>`;
      });
      resultsContainer.innerHTML = html;
    } else {
      resultsContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="bi bi-search display-4 d-block mb-3 opacity-25"></i> ไม่พบข้อมูลพนักงานที่ระบุ</div>';
    }
  } catch (error) {
    console.error("Search failed:", error);
    resultsContainer.innerHTML = '<div class="col-12 text-center py-5 text-danger">เกิดข้อผิดพลาดในการเชื่อมต่อ</div>';
  }
}

// --- ฟังก์ชันเปิดหน้าต่างแฟ้มประวัติ (คลิกจากผลการค้นหา) ---
async function showStaffPortfolio(empId) {
  // 1. โหลดข้อมูลพื้นฐาน
  try {
    const res = await fetch(`/api/profile/${empId}`);
    const data = await res.json();
    if (data.success) {
      const u = data.user;
      document.getElementById('modalStaffName').innerText = u.FullName;
      document.getElementById('modalStaffDept').innerText = u.FullDept;
      document.getElementById('modalStaffPic').src = u.ProfilePic || 'https://via.placeholder.com/150';
      // สมมติคะแนน Score ชั่วคราวก่อน (เดี๋ยวเราค่อยดึงของจริงจากตาราง Achievements)
      document.getElementById('modalStaffScore').innerText = "Loading..."; 
      
      // เปิด Modal
      new bootstrap.Modal(document.getElementById('staffPortfolioModal')).show();
    }
  } catch (error) {
    console.error("โหลดแฟ้มประวัติล้มเหลว:", error);
  }
}
