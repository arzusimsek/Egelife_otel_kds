const { renderHTML } = require("../utils/templateHelper");
const AdminModel = require("../models/AdminModel");

// Login sayfasını göster
exports.loginSayfasi = (req, res) => {
    const html = renderHTML("login", { hata: null });
    res.send(html);
};

// Login işlemini yap
exports.loginYap = (req, res) => {
    console.log("=== LOGIN İSTEĞİ ===");
    console.log("Request body:", req.body);
    console.log("Request method:", req.method);
    console.log("Content-Type:", req.headers['content-type']);
    
    const { kullanici_adi, sifre } = req.body;
    
    console.log("Login denemesi:", { kullanici_adi, sifre: sifre ? "***" : "boş" });
    
    if (!kullanici_adi || !sifre) {
        console.log("Eksik bilgi hatası");
        const html = renderHTML("login", { 
            hata: "Kullanıcı adı ve şifre gereklidir!" 
        });
        return res.send(html);
    }
    
    // Model kullanarak kullanıcıyı kontrol et
    AdminModel.authenticate(kullanici_adi, sifre, (err, results) => {
        if (err) {
            console.error("=== VERİTABANI HATASI ===");
            console.error("Hata kodu:", err.code);
            console.error("Hata mesajı:", err.message);
            console.error("Hata detayı:", err);
            
            // Kullanıcı dostu hata mesajı
            let hataMesaji = "Veritabanı bağlantı hatası! ";
            
            if (err.code === 'ECONNREFUSED') {
                hataMesaji += "MySQL servisi çalışmıyor olabilir. Lütfen MySQL servisini başlatın.";
            } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
                hataMesaji += "Kullanıcı adı veya şifre hatalı. db/config.js dosyasını kontrol edin.";
            } else if (err.code === 'ER_BAD_DB_ERROR') {
                hataMesaji += "Veritabanı bulunamadı. Veritabanının mevcut olduğundan emin olun.";
            } else if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                hataMesaji += "Veritabanı bağlantısı kesildi. Lütfen tekrar deneyin.";
            } else {
                hataMesaji += `Hata: ${err.message || 'Bilinmeyen hata'}`;
            }
            
            hataMesaji += " (Konsolu kontrol edin)";
            
            const html = renderHTML("login", { hata: hataMesaji });
            return res.send(html);
        }
        
        console.log("Veritabanı sonucu:", results ? results.length : 0, "kullanıcı bulundu");
        if (results) {
            console.log("Sonuçlar:", JSON.stringify(results, null, 2));
        }
        
        if (results && results.length > 0) {
            // Başarılı giriş - dashboard'a yönlendir
            console.log("✓ Başarılı giriş, dashboard'a yönlendiriliyor...");
            res.redirect("/dashboard");
        } else {
            // Hatalı giriş
            console.log("✗ Kullanıcı bulunamadı");
            const html = renderHTML("login", { 
                hata: "Kullanıcı adı veya şifre hatalı!" 
            });
            res.send(html);
        }
    });
};

