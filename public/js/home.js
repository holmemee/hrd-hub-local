let allAnnouncementsData = [];

async function loadHomeData() {
    try {
        const response = await fetch('/api/announcements');
        const data = await response.json();
        if (data.success) {
            allAnnouncementsData = data.all || [];
            renderBanners(data.banners || []);
            renderAnnouncementList(allAnnouncementsData);
            if (data.popups && data.popups.length > 0) showPopups(data.popups);
        }
    } catch (error) { console.error("โหลดประกาศล้มเหลว:", error); }
}

function renderBanners(banners) {
    const container = document.getElementById('homeCarouselContainer');
    if (!banners || banners.length === 0) {
        container.innerHTML = `<div class="card bg-purple text-white p-5 text-center" style="border-radius:15px;"><h3>🚀 HRD HUB 2026</h3></div>`;
        return;
    }
    let items = banners.map((b, i) => `
        <div class="carousel-item ${i === 0 ? 'active' : ''}" onclick="if('${b.link}') window.open('${b.link}', '_blank')">
            <img src="${b.image}" class="d-block w-100" style="height:350px; object-fit:cover; border-radius:15px;">
            <div class="carousel-caption d-none d-md-block" style="background: rgba(0,0,0,0.5); border-radius: 10px;"><h5>${b.title}</h5></div>
        </div>`).join('');
    container.innerHTML = `<div id="homeCarousel" class="carousel slide carousel-fade" data-bs-ride="carousel"><div class="carousel-inner">${items}</div></div>`;
}

function renderAnnouncementList(all) {
    const container = document.getElementById('announcementListContainer');
    if (!all || all.length === 0) {
        container.innerHTML = '<div class="text-center py-4 text-muted">ไม่มีข่าวสาร</div>';
        return;
    }
    container.innerHTML = all.map(ann => `
        <a href="javascript:void(0);" class="list-group-item list-group-item-action border-0 py-3" onclick="viewOldAnnouncement('${ann.id}')">
            <div class="d-flex align-items-center">
                <img src="${ann.image}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 5px;" class="me-3">
                <div class="flex-grow-1"><h6 class="mb-0 fw-bold">${ann.title}</h6></div>
                <i class="bi bi-chevron-right text-muted"></i>
            </div>
        </a>`).join('');
}

function showPopups(popups) {
    if (sessionStorage.getItem('popup_shown')) return;
    openAnnouncementModal(popups[0]);
    sessionStorage.setItem('popup_shown', 'true');
}

function viewOldAnnouncement(id) {
    const ann = allAnnouncementsData.find(a => a.id === id);
    if (ann) openAnnouncementModal(ann);
}

function openAnnouncementModal(annData) {
    document.getElementById('popupImage').src = annData.image;
    new bootstrap.Modal(document.getElementById('announcementModal')).show();
}
