const db = require("../db/db");
const promisePool = db.promise();

class OtelModel {
    // Tüm otelleri getir
    static getAllOteller(callback) {
        db.query("SELECT * FROM oteller", callback);
    }

    // Yılları getir
    static getYillar(callback) {
        db.query("SELECT DISTINCT yil FROM aylik_istatistik WHERE yil IS NOT NULL ORDER BY yil DESC", callback);
    }

    // En büyük yılı getir (varsayılan yıl için)
    static getEnBuyukYil(callback) {
        db.query("SELECT MAX(yil) AS maxYil FROM aylik_istatistik WHERE yil IS NOT NULL", (err, results) => {
            if (err) {
                return callback(err, null);
            }
            const maxYil = results && results.length > 0 && results[0].maxYil ? parseInt(results[0].maxYil) : 2025;
            callback(null, maxYil);
        });
    }

    // İlk oteli getir (varsayılan otel için)
    static getIlkOtel(callback) {
        db.query("SELECT otel_id, otel_adi FROM oteller ORDER BY otel_id ASC LIMIT 1", (err, results) => {
            if (err) {
                return callback(err, null);
            }
            const ilkOtel = results && results.length > 0 ? results[0] : null;
            callback(null, ilkOtel);
        });
    }

    // Yıllara göre gelir, gider, kar
    static getYillaraGoreGelirGiderKar(callback) {
        const sql = `
            SELECT 
                yil,
                SUM(gelir) as toplam_gelir,
                SUM(maliyet) as toplam_gider,
                SUM(kar) as toplam_kar
            FROM aylik_istatistik
            WHERE yil IS NOT NULL
            GROUP BY yil
            ORDER BY yil ASC
        `;
        db.query(sql, callback);
    }


    // Otellerin yıllara göre kar
    static getOtellerinYillaraGoreKar(callback) {
        const sql = `
            SELECT 
                o.otel_adi,
                a.yil,
                SUM(a.kar) as toplam_kar
            FROM aylik_istatistik a
            INNER JOIN oteller o ON a.otel_id = o.otel_id
            WHERE a.yil IS NOT NULL
            GROUP BY o.otel_id, o.otel_adi, a.yil
            ORDER BY a.yil ASC, o.otel_adi ASC
        `;
        db.query(sql, callback);
    }

    // Otellerin yıllara göre detaylı finansal verisi (Gelir, Gider, Kar)
    static getOtellerinDetayliFinansalVerisi(callback) {
        const sql = `
            SELECT 
                o.otel_adi,
                a.yil,
                SUM(a.gelir) as toplam_gelir,
                SUM(a.maliyet) as toplam_gider,
                SUM(a.kar) as toplam_kar
            FROM aylik_istatistik a
            INNER JOIN oteller o ON a.otel_id = o.otel_id
            WHERE a.yil IS NOT NULL
            GROUP BY o.otel_id, o.otel_adi, a.yil
            ORDER BY a.yil ASC, o.otel_adi ASC
        `;
        db.query(sql, callback);
    }

    // YENİ: Otellerin Aylık Finansal Verisi (Line Chart için)
    static getOtellerinAylikFinansalVerisi(yil, callback) {
        let sql = `
            SELECT 
                o.otel_adi,
                a.ay,
                a.yil,
                SUM(a.kar) as kar,
                SUM(a.maliyet) as maliyet
            FROM aylik_istatistik a
            INNER JOIN oteller o ON a.otel_id = o.otel_id
            WHERE a.yil = ?
            GROUP BY o.otel_id, o.otel_adi, a.yil, a.ay
            ORDER BY o.otel_adi ASC, a.ay ASC
        `;

        // Eğer yıl belirtilmemişse, varsayılan olarak son yılı alacak şekilde düzenlenebilir
        // Ancak şimdilik zorunlu tutalım veya controller'da default atayalım.

        db.query(sql, [yil], callback);
    }

    // Aylık istatistikleri getir
    static getAylikIstatistik(callback) {
        db.query("SELECT * FROM aylik_istatistik", callback);
    }

    // KPI verileri (belirli yıl için) - Toplam Kar
    static getToplamKar(yil, callback) {
        const sql = `
            SELECT SUM(kar) AS toplamKar
            FROM aylik_istatistik
            WHERE yil = ?
        `;
        db.query(sql, [yil], callback);
    }

    // KPI verileri (belirli yıl için) - Toplam Kar (Promise versiyonu)
    static async getToplamKarAsync(yil) {
        const sql = `
            SELECT SUM(kar) AS toplamKar
            FROM aylik_istatistik
            WHERE yil = ?
        `;
        const [rows] = await promisePool.query(sql, [yil]);
        return rows[0]?.toplamKar || 0;
    }

    // KPI verileri (belirli yıl için) - Toplam Zarar
    static getToplamZarar(yil, callback) {
        const sql = `
            SELECT SUM(maliyet - gelir) AS toplamZarar
            FROM aylik_istatistik
            WHERE yil = ? AND maliyet > gelir
        `;
        db.query(sql, [yil], callback);
    }

    // KPI verileri (belirli yıl için) - Toplam Maliyet
    static getToplamMaliyet(yil, callback) {
        const sql = `
            SELECT SUM(maliyet) AS toplamMaliyet
            FROM aylik_istatistik
            WHERE yil = ?
        `;
        db.query(sql, [yil], callback);
    }

    // KPI verileri (belirli yıl için) - Toplam Maliyet (Promise versiyonu)
    static async getToplamMaliyetAsync(yil) {
        const sql = `
            SELECT SUM(maliyet) AS toplamMaliyet
            FROM aylik_istatistik
            WHERE yil = ?
        `;
        const [rows] = await promisePool.query(sql, [yil]);
        return rows[0]?.toplamMaliyet || 0;
    }

    // KPI verileri (belirli yıl için) - Toplam Gelir (Promise versiyonu)
    static async getToplamGelirAsync(yil) {
        const sql = `
            SELECT SUM(gelir) AS toplamGelir
            FROM aylik_istatistik
            WHERE yil = ?
        `;
        const [rows] = await promisePool.query(sql, [yil]);
        return rows[0]?.toplamGelir || 0;
    }

    // KPI verileri (belirli yıl için) - Toplam Kar ve Toplam Zarar (eski metod - geriye dönük uyumluluk için)
    static getKPI(yil, callback) {
        const sql = `
            SELECT 
                COALESCE(SUM(kar), 0) as toplam_kar,
                COALESCE(SUM(CASE WHEN maliyet > gelir THEN maliyet - gelir ELSE 0 END), 0) as toplam_zarar
            FROM aylik_istatistik
            WHERE yil = ?
        `;
        db.query(sql, [yil], callback);
    }

    // Otel kar verileri (belirli yıl için) - En karlı ve en az karlı oteller
    static getOtelKar(yil, callback) {
        const sql = `
            SELECT 
                o.otel_adi,
                COALESCE(SUM(a.kar), 0) as otel_kar
            FROM aylik_istatistik a
            INNER JOIN oteller o ON a.otel_id = o.otel_id
            WHERE a.yil = ?
            GROUP BY o.otel_id, o.otel_adi
            ORDER BY otel_kar DESC
        `;
        db.query(sql, [yil], callback);
    }

    // En karlı otel (belirli yıl için) - Tek sorgu ile
    static getEnKarliOtel(yil, callback) {
        const sql = `
            SELECT otel_id, SUM(kar) AS toplamKar
            FROM aylik_istatistik
            WHERE yil = ?
            GROUP BY otel_id
            ORDER BY toplamKar DESC
            LIMIT 1
        `;
        db.query(sql, [yil], (err, results) => {
            if (err) {
                return callback(err, null);
            }
            // Otel adını almak için JOIN yapılmış versiyon
            if (results && results.length > 0) {
                const otelId = results[0].otel_id;
                const sql2 = `
                    SELECT o.otel_adi
                    FROM oteller o
                    WHERE o.otel_id = ?
                `;
                db.query(sql2, [otelId], (err2, results2) => {
                    if (err2) {
                        return callback(err2, null);
                    }
                    callback(null, results2);
                });
            } else {
                callback(null, []);
            }
        });
    }

    // En karlı otel (belirli yıl için) - Promise versiyonu
    static async getEnKarliOtelAsync(yil) {
        const sql = `
            SELECT a.otel_id, SUM(a.kar) AS toplamKar, o.otel_adi
            FROM aylik_istatistik a
            INNER JOIN oteller o ON a.otel_id = o.otel_id
            WHERE a.yil = ?
            GROUP BY a.otel_id, o.otel_adi
            ORDER BY toplamKar DESC
            LIMIT 1
        `;
        const [rows] = await promisePool.query(sql, [yil]);
        return rows.length > 0 ? rows[0].otel_adi : "-";
    }

    // En az karlı otel (belirli yıl için) - Tek sorgu ile
    static getEnAzKarliOtel(yil, callback) {
        const sql = `
            SELECT otel_id, SUM(kar) AS toplamKar
            FROM aylik_istatistik
            WHERE yil = ?
            GROUP BY otel_id
            ORDER BY toplamKar ASC
            LIMIT 1
        `;
        db.query(sql, [yil], (err, results) => {
            if (err) {
                return callback(err, null);
            }
            // Otel adını almak için JOIN yapılmış versiyon
            if (results && results.length > 0) {
                const otelId = results[0].otel_id;
                const sql2 = `
                    SELECT o.otel_adi
                    FROM oteller o
                    WHERE o.otel_id = ?
                `;
                db.query(sql2, [otelId], (err2, results2) => {
                    if (err2) {
                        return callback(err2, null);
                    }
                    callback(null, results2);
                });
            } else {
                callback(null, []);
            }
        });
    }

    // En az karlı otel (belirli yıl için) - Promise versiyonu
    static async getEnAzKarliOtelAsync(yil) {
        const sql = `
            SELECT a.otel_id, SUM(a.kar) AS toplamKar, o.otel_adi
            FROM aylik_istatistik a
            INNER JOIN oteller o ON a.otel_id = o.otel_id
            WHERE a.yil = ?
            GROUP BY a.otel_id, o.otel_adi
            ORDER BY toplamKar ASC
            LIMIT 1
        `;
        const [rows] = await promisePool.query(sql, [yil]);
        return rows.length > 0 ? rows[0].otel_adi : "-";
    }

    // Oda Analizi: Toplam oda sayısı
    static getToplamOdaSayisi(callback) {
        const sql = `
            SELECT SUM(toplam_oda_sayisi) AS toplamOdaSayisi
            FROM oteller
        `;
        db.query(sql, callback);
    }

    // Oda Analizi: En fazla odaya sahip otel
    static getEnFazlaOdayaSahipOtel(callback) {
        const sql = `
            SELECT otel_adi, toplam_oda_sayisi AS oda_sayisi
            FROM oteller
            ORDER BY toplam_oda_sayisi DESC
            LIMIT 1
        `;
        db.query(sql, callback);
    }

    // Oda Analizi: En az odaya sahip otel
    static getEnAzOdayaSahipOtel(callback) {
        const sql = `
            SELECT otel_adi, toplam_oda_sayisi AS oda_sayisi
            FROM oteller
            ORDER BY toplam_oda_sayisi ASC
            LIMIT 1
        `;
        db.query(sql, callback);
    }

    // Oda Analizi: Ortalama oda sayısı
    static getOrtalamaOdaSayisi(callback) {
        const sql = `
            SELECT AVG(toplam_oda_sayisi) AS ortalamaOdaSayisi
            FROM oteller
        `;
        db.query(sql, callback);
    }

    // Oda Analizi: Tüm otellerin oda sayıları
    static getOtellerOdaSayilari(callback) {
        const sql = `
            SELECT otel_adi, toplam_oda_sayisi AS oda_sayisi
            FROM oteller
            ORDER BY otel_id
        `;
        db.query(sql, callback);
    }

    // Personel Verimlilik Analizi: Aylık personel sayısı
    static getAylikPersonelSayisi(yil, otelId, callback) {
        let sql = `
            SELECT 
                ay,
                COALESCE(SUM(personel_sayisi), 0) as personel_sayisi
            FROM aylik_istatistik
            WHERE yil = ?
        `;

        const params = [yil];

        if (otelId && otelId !== 'all') {
            sql += ` AND otel_id = ?`;
            params.push(otelId);
        }

        sql += ` GROUP BY ay ORDER BY ay ASC`;

        db.query(sql, params, callback);
    }
}

module.exports = OtelModel;

