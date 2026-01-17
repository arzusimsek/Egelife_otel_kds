const db = require("../db/db");

class AdminModel {
    // Kullanıcı doğrulama
    static authenticate(kullanici_adi, sifre, callback) {
        const sql = "SELECT * FROM admin WHERE kullanici_adi = ? AND sifre = ?";
        db.query(sql, [kullanici_adi, sifre], callback);
    }
}

module.exports = AdminModel;

