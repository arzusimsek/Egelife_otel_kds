// Global chart instances
const charts = {};

// Section titles
const sectionTitles = {
    'dashboard': 'Dashboard',
    'musteri': 'Müşteri Analizi',
    'oda': 'Oda Analizi',
    'kampanya': 'Kampanya Raporu',
    'memnuniyet': 'Memnuniyet Raporu'
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeMenu();
    initializeFilters();
    loadActiveSection();
});

// Initialize menu
function initializeMenu() {
    const menuItems = document.querySelectorAll('.menu-item');
    const currentPath = window.location.pathname;
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active menu item
            menuItems.forEach(mi => mi.classList.remove('active'));
            this.classList.add('active');
        });
        
        // Set active menu item based on current path
        const href = this.getAttribute('href');
        if (currentPath === href || (currentPath === '/' && href === '/dashboard')) {
            this.classList.add('active');
        }
    });
}

// Show section
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show selected section
    const sectionElement = document.getElementById(`${section}-section`);
    if (sectionElement) {
        sectionElement.classList.add('active');
        document.getElementById('pageTitle').textContent = sectionTitles[section] || 'Dashboard';
        
        // Load charts for this section
        loadSectionCharts(section);
    }
}

// Load active section based on URL
function loadActiveSection() {
    const path = window.location.pathname;
    let section = 'dashboard';
    
    if (path.includes('musteri-analizi')) section = 'musteri';
    else if (path.includes('oda-analizi')) section = 'oda';
    else if (path.includes('kampanya-raporu')) section = 'kampanya';
    else if (path.includes('memnuniyet-raporu')) section = 'memnuniyet';
    
    showSection(section);
}

// Initialize filters
function initializeFilters() {
    const yearFilter = document.getElementById('yearFilter');
    const hotelFilter = document.getElementById('hotelFilter');
    
    if (yearFilter) {
        yearFilter.addEventListener('change', function() {
            reloadCharts();
        });
    }
    
    if (hotelFilter) {
        hotelFilter.addEventListener('change', function() {
            reloadCharts();
        });
    }
}

// Get filter values
function getFilters() {
    return {
        year: document.getElementById('yearFilter')?.value || 'all',
        hotel: document.getElementById('hotelFilter')?.value || 'all'
    };
}

// Load section charts
function loadSectionCharts(section) {
    const filters = getFilters();
    
    switch(section) {
        case 'dashboard':
            loadDashboardCharts(filters);
            break;
        case 'musteri':
            loadMusteriCharts(filters);
            break;
        case 'oda':
            loadOdaCharts(filters);
            break;
        case 'kampanya':
            loadKampanyaCharts(filters);
            break;
        case 'memnuniyet':
            loadMemnuniyetCharts(filters);
            break;
    }
}

// Reload charts
function reloadCharts() {
    const activeSection = document.querySelector('.content-section.active');
    if (activeSection) {
        const sectionId = activeSection.id.replace('-section', '');
        loadSectionCharts(sectionId);
    }
}

// ========== DASHBOARD CHARTS ==========

function loadDashboardCharts(filters) {
    loadGelirGiderKarChart(filters);
    loadOtellerKarChart(filters);
    loadDashboardKPIs(filters);
}

function loadDashboardKPIs(filters) {
    // Load KPI data
    fetch('/api/yillara-gore-gelir-gider-kar')
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                let filteredData = data;
                if (filters.year !== 'all') {
                    filteredData = data.filter(d => d.yil == filters.year);
                }
                
                const totalRevenue = filteredData.reduce((sum, d) => sum + parseFloat(d.gelir || 0), 0);
                const totalProfit = filteredData.reduce((sum, d) => sum + parseFloat(d.kar || 0), 0);
                
                document.getElementById('totalRevenue').textContent = '$' + totalRevenue.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                document.getElementById('totalProfit').textContent = '$' + totalProfit.toLocaleString('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
            }
        })
        .catch(err => console.error('KPI yükleme hatası:', err));
    
    // Load hotel count
    fetch('/api/oteller')
        .then(res => res.json())
        .then(data => {
            document.getElementById('activeHotels').textContent = data.length || 0;
        })
        .catch(err => console.error('Otel sayısı yükleme hatası:', err));
}

function loadGelirGiderKarChart(filters) {
    fetch('/api/yillara-gore-gelir-gider-kar')
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            let filteredData = data;
            if (filters.year !== 'all') {
                filteredData = data.filter(d => d.yil == filters.year);
            }
            
            const labels = filteredData.map(d => d.yil.toString());
            const gelirData = filteredData.map(d => parseFloat(d.gelir || 0));
            const giderData = filteredData.map(d => parseFloat(d.gider || 0));
            const karData = filteredData.map(d => parseFloat(d.kar || 0));
            
            const ctx = document.getElementById('dashboardChart1');
            if (!ctx) return;
            
            if (charts.dashboardChart1) {
                charts.dashboardChart1.destroy();
            }
            
            charts.dashboardChart1 = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Gelir ($)',
                            data: gelirData,
                            backgroundColor: '#10b981',
                            borderColor: '#059669',
                            borderWidth: 1
                        },
                        {
                            label: 'Gider ($)',
                            data: giderData,
                            backgroundColor: '#ef4444',
                            borderColor: '#dc2626',
                            borderWidth: 1
                        },
                        {
                            label: 'Kar ($)',
                            data: karData,
                            backgroundColor: '#667eea',
                            borderColor: '#5568d3',
                            borderWidth: 1
                        }
                    ]
                },
                options: getChartOptions()
            });
        })
        .catch(err => console.error('Gelir-Gider-Kar grafiği hatası:', err));
}

function loadOtellerKarChart(filters) {
    fetch('/api/otellerin-yillara-gore-kar')
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            let filteredData = data;
            if (filters.year !== 'all') {
                filteredData = data.filter(d => d.yil == filters.year);
            }
            
            const hotelGroups = {};
            filteredData.forEach(item => {
                if (!hotelGroups[item.otel_adi]) {
                    hotelGroups[item.otel_adi] = 0;
                }
                hotelGroups[item.otel_adi] += parseFloat(item.kar || 0);
            });
            
            const labels = Object.keys(hotelGroups);
            const karData = Object.values(hotelGroups);
            
            const ctx = document.getElementById('dashboardChart2');
            if (!ctx) return;
            
            if (charts.dashboardChart2) {
                charts.dashboardChart2.destroy();
            }
            
            charts.dashboardChart2 = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Kar ($)',
                        data: karData,
                        backgroundColor: '#667eea',
                        borderColor: '#5568d3',
                        borderWidth: 1
                    }]
                },
                options: getChartOptions()
            });
        })
        .catch(err => console.error('Oteller kar grafiği hatası:', err));
}

// ========== MÜŞTERİ ANALİZİ CHARTS ==========

function loadMusteriCharts(filters) {
    loadMusteriTipiDagilimi(filters);
    loadAylikMusteriTipleri(filters);
}

function loadMusteriTipiDagilimi(filters) {
    const url = `/api/musteri-tipi-dagilimi${filters.year !== 'all' ? '?yil=' + filters.year : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const labels = data.map(d => d.tip);
            const values = data.map(d => parseInt(d.sayi || 0));
            
            const ctx = document.getElementById('musteriChart1');
            if (!ctx) return;
            
            if (charts.musteriChart1) {
                charts.musteriChart1.destroy();
            }
            
            charts.musteriChart1 = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
                    }]
                },
                options: getChartOptions()
            });
        })
        .catch(err => console.error('Müşteri tipi dağılımı hatası:', err));
}

function loadAylikMusteriTipleri(filters) {
    const yillar = filters.year !== 'all' ? filters.year : '2023,2024,2025';
    const url = `/api/aylik-musteri-tipleri?yillar=${yillar}${filters.hotel !== 'all' ? '&otel_id=' + filters.hotel : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            // Group by month and customer type
            const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                              'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
            const grouped = {};
            const types = new Set();
            
            data.forEach(d => {
                const key = `${d.yil}-${d.ay}`;
                if (!grouped[key]) {
                    grouped[key] = {};
                }
                grouped[key][d.musteri_tipi] = parseInt(d.musteri_sayisi || 0);
                types.add(d.musteri_tipi);
            });
            
            const labels = Object.keys(grouped).sort().map(key => {
                const [yil, ay] = key.split('-');
                return `${monthNames[parseInt(ay) - 1]} ${yil}`;
            });
            
            const datasets = Array.from(types).map((type, index) => ({
                label: type,
                data: Object.keys(grouped).sort().map(key => grouped[key][type] || 0),
                backgroundColor: getColorForIndex(index)
            }));
            
            const ctx = document.getElementById('musteriChart2');
            if (!ctx) return;
            
            if (charts.musteriChart2) {
                charts.musteriChart2.destroy();
            }
            
            charts.musteriChart2 = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: getChartOptions()
            });
        })
        .catch(err => console.error('Aylık müşteri tipleri hatası:', err));
}

// ========== ODA ANALİZİ CHARTS ==========

function loadOdaCharts(filters) {
    loadOdaDolulukOrani(filters);
    loadOdaTipiDagilimi(filters);
    loadOtellereGoreDoluluk(filters);
}

function loadOdaDolulukOrani(filters) {
    const url = `/api/oda-doluluk-orani${filters.year !== 'all' ? '?yil=' + filters.year : ''}${filters.hotel !== 'all' ? (filters.year !== 'all' ? '&' : '?') + 'otel_id=' + filters.hotel : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                              'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
            const labels = data.map(d => monthNames[parseInt(d.ay) - 1] || `Ay ${d.ay}`);
            const values = data.map(d => parseFloat(d.doluluk_orani || 0));
            
            const ctx = document.getElementById('odaChart1');
            if (!ctx) return;
            
            if (charts.odaChart1) {
                charts.odaChart1.destroy();
            }
            
            charts.odaChart1 = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Doluluk Oranı (%)',
                        data: values,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    ...getChartOptions(),
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(err => console.error('Oda doluluk oranı hatası:', err));
}

function loadOdaTipiDagilimi(filters) {
    const url = `/api/oda-tipi-dagilimi${filters.year !== 'all' ? '?yil=' + filters.year : ''}${filters.hotel !== 'all' ? (filters.year !== 'all' ? '&' : '?') + 'otel_id=' + filters.hotel : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const labels = data.map(d => d.oda_tipi_adi);
            const values = data.map(d => parseInt(d.rezervasyon_sayisi || 0));
            
            const ctx = document.getElementById('odaChart2');
            if (!ctx) return;
            
            if (charts.odaChart2) {
                charts.odaChart2.destroy();
            }
            
            charts.odaChart2 = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b']
                    }]
                },
                options: getChartOptions()
            });
        })
        .catch(err => console.error('Oda tipi dağılımı hatası:', err));
}

function loadOtellereGoreDoluluk(filters) {
    const url = `/api/otellere-gore-doluluk${filters.year !== 'all' ? '?yil=' + filters.year : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const labels = data.map(d => d.otel_adi);
            const values = data.map(d => parseFloat(d.doluluk_orani || 0));
            
            const ctx = document.getElementById('odaChart3');
            if (!ctx) return;
            
            if (charts.odaChart3) {
                charts.odaChart3.destroy();
            }
            
            charts.odaChart3 = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Doluluk Oranı (%)',
                        data: values,
                        backgroundColor: '#667eea',
                        borderColor: '#5568d3',
                        borderWidth: 1
                    }]
                },
                options: {
                    ...getChartOptions(),
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(err => console.error('Otellere göre doluluk hatası:', err));
}

// ========== KAMPANYA RAPORU CHARTS ==========

function loadKampanyaCharts(filters) {
    loadKampanyaPerformansi(filters);
    loadAylikKampanyaGelirleri(filters);
    loadKampanyaTuruDagilimi(filters);
}

function loadKampanyaPerformansi(filters) {
    const url = `/api/kampanya-performansi${filters.year !== 'all' ? '?yil=' + filters.year : ''}${filters.hotel !== 'all' ? (filters.year !== 'all' ? '&' : '?') + 'otel_id=' + filters.hotel : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const labels = data.map(d => d.kampanya_adi);
            const values = data.map(d => parseFloat(d.toplam_gelir || 0));
            
            const ctx = document.getElementById('kampanyaChart1');
            if (!ctx) return;
            
            if (charts.kampanyaChart1) {
                charts.kampanyaChart1.destroy();
            }
            
            charts.kampanyaChart1 = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Toplam Gelir ($)',
                        data: values,
                        backgroundColor: '#667eea',
                        borderColor: '#5568d3',
                        borderWidth: 1
                    }]
                },
                options: getChartOptions()
            });
        })
        .catch(err => console.error('Kampanya performansı hatası:', err));
}

function loadAylikKampanyaGelirleri(filters) {
    const url = `/api/aylik-kampanya-gelirleri${filters.year !== 'all' ? '?yil=' + filters.year : ''}${filters.hotel !== 'all' ? (filters.year !== 'all' ? '&' : '?') + 'otel_id=' + filters.hotel : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                              'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
            const labels = data.map(d => monthNames[parseInt(d.ay) - 1] || `Ay ${d.ay}`);
            const values = data.map(d => parseFloat(d.toplam_gelir || 0));
            
            const ctx = document.getElementById('kampanyaChart2');
            if (!ctx) return;
            
            if (charts.kampanyaChart2) {
                charts.kampanyaChart2.destroy();
            }
            
            charts.kampanyaChart2 = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gelir ($)',
                        data: values,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: getChartOptions()
            });
        })
        .catch(err => console.error('Aylık kampanya gelirleri hatası:', err));
}

function loadKampanyaTuruDagilimi(filters) {
    const url = `/api/kampanya-turu-dagilimi${filters.year !== 'all' ? '?yil=' + filters.year : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const labels = data.map(d => d.kampanya_turu);
            const values = data.map(d => parseInt(d.kampanya_sayisi || 0));
            
            const ctx = document.getElementById('kampanyaChart3');
            if (!ctx) return;
            
            if (charts.kampanyaChart3) {
                charts.kampanyaChart3.destroy();
            }
            
            charts.kampanyaChart3 = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#4facfe']
                    }]
                },
                options: getChartOptions()
            });
        })
        .catch(err => console.error('Kampanya türü dağılımı hatası:', err));
}

// ========== MEMNUNİYET RAPORU CHARTS ==========

function loadMemnuniyetCharts(filters) {
    loadMemnuniyetSkorlari(filters);
    loadOtellereGoreMemnuniyet(filters);
    loadMemnuniyetKategoriDagilimi(filters);
}

function loadMemnuniyetSkorlari(filters) {
    const url = `/api/memnuniyet-skorlari${filters.year !== 'all' ? '?yil=' + filters.year : ''}${filters.hotel !== 'all' ? (filters.year !== 'all' ? '&' : '?') + 'otel_id=' + filters.hotel : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
                              'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
            const labels = data.map(d => monthNames[parseInt(d.ay) - 1] || `Ay ${d.ay}`);
            const genelPuan = data.map(d => parseFloat(d.ortalama_puan || 0));
            const temizlik = data.map(d => parseFloat(d.temizlik_puani || 0));
            const hizmet = data.map(d => parseFloat(d.hizmet_puani || 0));
            const konum = data.map(d => parseFloat(d.konum_puani || 0));
            
            const ctx = document.getElementById('memnuniyetChart1');
            if (!ctx) return;
            
            if (charts.memnuniyetChart1) {
                charts.memnuniyetChart1.destroy();
            }
            
            charts.memnuniyetChart1 = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Genel Puan',
                            data: genelPuan,
                            borderColor: '#667eea',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            borderWidth: 2,
                            fill: false
                        },
                        {
                            label: 'Temizlik',
                            data: temizlik,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            fill: false
                        },
                        {
                            label: 'Hizmet',
                            data: hizmet,
                            borderColor: '#f59e0b',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderWidth: 2,
                            fill: false
                        },
                        {
                            label: 'Konum',
                            data: konum,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 2,
                            fill: false
                        }
                    ]
                },
                options: {
                    ...getChartOptions(),
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 5,
                            ticks: {
                                callback: function(value) {
                                    return value.toFixed(1);
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(err => console.error('Memnuniyet skorları hatası:', err));
}

function loadOtellereGoreMemnuniyet(filters) {
    const url = `/api/otellere-gore-memnuniyet${filters.year !== 'all' ? '?yil=' + filters.year : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const labels = data.map(d => d.otel_adi);
            const values = data.map(d => parseFloat(d.ortalama_puan || 0));
            
            const ctx = document.getElementById('memnuniyetChart2');
            if (!ctx) return;
            
            if (charts.memnuniyetChart2) {
                charts.memnuniyetChart2.destroy();
            }
            
            charts.memnuniyetChart2 = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Ortalama Puan',
                        data: values,
                        backgroundColor: '#667eea',
                        borderColor: '#5568d3',
                        borderWidth: 1
                    }]
                },
                options: {
                    ...getChartOptions(),
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 5,
                            ticks: {
                                callback: function(value) {
                                    return value.toFixed(1);
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(err => console.error('Otellere göre memnuniyet hatası:', err));
}

function loadMemnuniyetKategoriDagilimi(filters) {
    const url = `/api/memnuniyet-kategori-dagilimi${filters.year !== 'all' ? '?yil=' + filters.year : ''}${filters.hotel !== 'all' ? (filters.year !== 'all' ? '&' : '?') + 'otel_id=' + filters.hotel : ''}`;
    
    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (!data || data.length === 0) return;
            
            const labels = data.map(d => d.kategori);
            const values = data.map(d => parseInt(d.sayi || 0));
            
            const ctx = document.getElementById('memnuniyetChart3');
            if (!ctx) return;
            
            if (charts.memnuniyetChart3) {
                charts.memnuniyetChart3.destroy();
            }
            
            charts.memnuniyetChart3 = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#dc2626']
                    }]
                },
                options: getChartOptions()
            });
        })
        .catch(err => console.error('Memnuniyet kategori dağılımı hatası:', err));
}

// ========== HELPER FUNCTIONS ==========

function getChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top'
            },
            tooltip: {
                enabled: true
            }
        }
    };
}

function getColorForIndex(index) {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
    return colors[index % colors.length];
}

