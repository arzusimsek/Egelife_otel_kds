const mysql = require("mysql2");
const config = require("./config");

// Connection Pool oluştur (daha iyi performans için)
const pool = mysql.createPool({
    host: config.host,
    user: config.user,
    password: config.password,
    database: config.database,
    waitForConnections: config.waitForConnections,
    connectionLimit: config.connectionLimit,
    queueLimit: config.queueLimit
});

// Bağlantıyı test et
pool.getConnection((err, connection) => {
    if (err) {
        console.error("=== MYSQL BAĞLANTI HATASI ===");
        console.error("Hata kodu:", err.code);
        console.error("Hata mesajı:", err.message);
        console.error("Lütfen şunları kontrol edin:");
        console.error("1. MySQL servisi çalışıyor mu?");
        console.error("2. db/config.js dosyasındaki ayarlar doğru mu?");
        console.error("3. Veritabanı 'egelife_otel' mevcut mu?");
        console.error("4. Kullanıcı adı ve şifre doğru mu?");
        return;
    }
    console.log("✓ MySQL bağlantısı başarılı!");
    console.log(`✓ Veritabanı: ${config.database}`);
    connection.release();
});

// Bağlantı hatalarını yakala
pool.on('error', (err) => {
    console.error("=== MYSQL POOL HATASI ===");
    console.error("Hata:", err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.error("Veritabanı bağlantısı kesildi!");
    } else if (err.fatal) {
        console.error("Ölümcül hata! Bağlantı yeniden kurulmalı.");
    }
});

// Promise tabanlı query için pool.promise() kullanılabilir
const promisePool = pool.promise();

module.exports = pool;