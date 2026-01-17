const express = require("express");
require('dotenv').config();
const app = express();
const path = require("path");

// Veritabanı bağlantısı
const db = require("./db/db");

// Routerlar (MVC yapısına uygun)
const otelRoutes = require("./routers/otelRoutes");
const loginRoutes = require("./routers/loginRoutes");
const pageRoutes = require("./routers/pageRoutes");
const musteriRoutes = require("./routers/musteriRoutes");
const dashboardRoutes = require("./routers/dashboardRoutes");

// EJS view engine'i ayarla
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// HTML template sistemi kullanılıyor (utils/templateHelper.js)
// Views klasörü HTML dosyaları içeriyor

// Form verilerini almak için (Express 5 için) - Router'lardan ÖNCE olmalı!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public klasör
app.use(express.static("public"));


// Router'ları bağla (pageRoutes önce yüklenmeli ki sidebar sayfaları öncelikli olsun)
try {
    app.use("/", loginRoutes);   // ← BUNU EKLEMEZSE ÇALIŞMAZ
    app.use("/", pageRoutes);    // Sidebar sayfaları için route'lar (ÖNCE YÜKLENMELİ)
    app.use("/", otelRoutes);
    app.use("/", musteriRoutes); // Müşteri analizi API route'ları
    app.use("/", dashboardRoutes); // Dashboard API route'ları

    console.log("✓ Tüm router'lar başarıyla yüklendi!");
} catch (error) {
    console.error("✗ Router yükleme hatası:", error);
}

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <html>
            <body>
                <h1>404 - Sayfa Bulunamadı</h1>
                <p>Aradığınız sayfa bulunamadı: ${req.path}</p>
                <a href="/login">Login sayfasına git</a>
            </body>
        </html>
    `);
});

// Hata yakalama middleware'i
app.use((err, req, res, next) => {
    console.error("Sunucu hatası:", err);
    res.status(500).send(`
        <html>
            <body>
                <h1>500 - Sunucu Hatası</h1>
                <p>${err.message}</p>
                <a href="/login">Login sayfasına git</a>
            </body>
        </html>
    `);
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log("==========================================");
    console.log("✓ Sunucu çalışıyor! (V: Decision Support Added)");
    console.log(`✓ URL: http://localhost:${PORT}`);
    console.log(`✓ Login: http://localhost:${PORT}/login`);
    console.log("==========================================");
});