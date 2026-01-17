const db = require("../db/db");

class OdaModel {
    // Oda doluluk oranları (aylık) - oda_analizi tablosundan
    static getOdaDolulukOrani(yil, otelId, callback) {
        let sql;
        let params = [];

        // oda_analizi tablosundan oda tiplerine göre müşteri sayısını al
        // Doluluk oranı için toplam müşteri sayısını kullan
        if (otelId && otelId !== 'all' && otelId !== '') {
            if (yil) {
                sql = `
                    SELECT 
                        oa.ay,
                        SUM(oa.musteri_sayisi) as toplam_musteri,
                        COUNT(DISTINCT oa.oda_tipi_id) as oda_tipi_sayisi
                    FROM oda_analizi oa
                    WHERE oa.yil = ? AND oa.otel_id = ?
                    GROUP BY oa.ay
                    ORDER BY oa.ay ASC
                `;
                params = [yil, otelId];
            } else {
                sql = `
                    SELECT 
                        oa.yil,
                        oa.ay,
                        SUM(oa.musteri_sayisi) as toplam_musteri,
                        COUNT(DISTINCT oa.oda_tipi_id) as oda_tipi_sayisi
                    FROM oda_analizi oa
                    WHERE oa.otel_id = ?
                    GROUP BY oa.yil, oa.ay
                    ORDER BY oa.yil ASC, oa.ay ASC
                `;
                params = [otelId];
            }
        } else {
            if (yil) {
                sql = `
                    SELECT 
                        oa.ay,
                        SUM(oa.musteri_sayisi) as toplam_musteri,
                        COUNT(DISTINCT oa.oda_tipi_id) as oda_tipi_sayisi
                    FROM oda_analizi oa
                    WHERE oa.yil = ?
                    GROUP BY oa.ay
                    ORDER BY oa.ay ASC
                `;
                params = [yil];
            } else {
                sql = `
                    SELECT 
                        oa.yil,
                        oa.ay,
                        SUM(oa.musteri_sayisi) as toplam_musteri,
                        COUNT(DISTINCT oa.oda_tipi_id) as oda_tipi_sayisi
                    FROM oda_analizi oa
                    GROUP BY oa.yil, oa.ay
                    ORDER BY oa.yil ASC, oa.ay ASC
                `;
            }
        }

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Oda doluluk oranı hatası:", err.message);
                return callback(err, null);
            }
            // Müşteri sayısını doluluk oranı olarak döndür (normalize edilmiş)
            const formatted = results.map(row => ({
                ay: row.ay,
                yil: row.yil || null,
                toplam_musteri: parseInt(row.toplam_musteri || 0),
                doluluk_orani: Math.min(100, (parseInt(row.toplam_musteri || 0) / Math.max(1, parseInt(row.oda_tipi_sayisi || 1))) * 10) // Basit bir hesaplama
            }));
            callback(null, formatted);
        });
    }

    // Oda tiplerine göre dağılım - oda_analizi ve oda_tipleri tablolarından
    static getOdaTipiDagilimi(yil, otelId, callback) {
        let sql;
        let params = [];

        sql = `
            SELECT 
                ot.oda_tipi_adi,
                SUM(oa.musteri_sayisi) as rezervasyon_sayisi,
                COUNT(DISTINCT oa.otel_id) as otel_sayisi
            FROM oda_analizi oa
            INNER JOIN oda_tipleri ot ON oa.oda_tipi_id = ot.oda_tipi_id
            WHERE 1=1
        `;

        if (yil) {
            sql += ` AND oa.yil = ?`;
            params.push(yil);
        }

        if (otelId && otelId !== 'all' && otelId !== '') {
            sql += ` AND oa.otel_id = ?`;
            params.push(otelId);
        }

        sql += ` GROUP BY ot.oda_tipi_id, ot.oda_tipi_adi ORDER BY rezervasyon_sayisi DESC`;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Oda tipi dağılımı hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // Otellere göre ortalama doluluk oranı - oda_analizi tablosundan
    static getOtellereGoreDoluluk(yil, callback) {
        let sql;
        let params = [];

        if (yil) {
            sql = `
                SELECT 
                    o.otel_adi,
                    SUM(oa.musteri_sayisi) as toplam_musteri,
                    COUNT(DISTINCT oa.oda_tipi_id) as oda_tipi_sayisi,
                    ROUND((SUM(oa.musteri_sayisi) / GREATEST(COUNT(DISTINCT oa.oda_tipi_id), 1)) * 10, 2) as doluluk_orani
                FROM oda_analizi oa
                INNER JOIN oteller o ON oa.otel_id = o.otel_id
                WHERE oa.yil = ?
                GROUP BY o.otel_id, o.otel_adi
                ORDER BY doluluk_orani DESC
            `;
            params = [yil];
        } else {
            sql = `
                SELECT 
                    o.otel_adi,
                    SUM(oa.musteri_sayisi) as toplam_musteri,
                    COUNT(DISTINCT oa.oda_tipi_id) as oda_tipi_sayisi,
                    ROUND((SUM(oa.musteri_sayisi) / GREATEST(COUNT(DISTINCT oa.oda_tipi_id), 1)) * 10, 2) as doluluk_orani
                FROM oda_analizi oa
                INNER JOIN oteller o ON oa.otel_id = o.otel_id
                GROUP BY o.otel_id, o.otel_adi
                ORDER BY doluluk_orani DESC
            `;
        }

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Otellere göre doluluk hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // 1. Bar Chart: Yıllık Oda Tipi Kâr Marjı (Popülerlik yerine)
    static getYillikOdaKarMarji(yil, otelId, callback) {
        const sql = `
            SELECT DISTINCT
                ot.oda_tipi_adi,
                kv.kar_marji as toplam
            FROM oda_karlilik_verileri kv
            JOIN oda_tipleri ot ON ot.oda_tipi_id = kv.oda_tipi_id
            WHERE kv.yil = ? AND kv.otel_id = ?
            ORDER BY RAND()
        `;
        db.query(sql, [yil, otelId], callback);
    }

    // 2. Aylık Oda Tipi Dağılımı (Stacked Bar)
    static getAylikOdaTipiDagilimi(yil, otelId, callback) {
        const sql = `
            SELECT 
                ay,
                o.oda_tipi_adi,
                o.oda_tipi_id,
                SUM(a.musteri_sayisi) AS toplam
            FROM oda_analizi a
            JOIN oda_tipleri o ON o.oda_tipi_id = a.oda_tipi_id
            WHERE a.yil = ? AND a.otel_id = ?
            GROUP BY ay, o.oda_tipi_adi, o.oda_tipi_id
            ORDER BY ay
        `;
        db.query(sql, [yil, otelId], callback);
    }

    // 3. Oda Tipi Trend Analizi (Line Chart)
    static getOdaTipiTrend(odaTipiId, callback) {
        const sql = `
            SELECT 
                yil,
                SUM(musteri_sayisi) AS toplam
            FROM oda_analizi
            WHERE oda_tipi_id = ?
            GROUP BY yil
            ORDER BY yil
        `;
        db.query(sql, [odaTipiId], callback);
    }

    // Oda tiplerini getir (dropdown için)
    static getOdaTipleri(callback) {
        const sql = `SELECT oda_tipi_id, oda_tipi_adi FROM oda_tipleri ORDER BY oda_tipi_adi`;
        db.query(sql, callback);
    }

    // YENİ: Oda Kapasite ve Karlılık Karar Analizi
    static getOdaKarlilikAnalizi(yil, otelId, callback) {
        // 1. Oda tiplerine göre toplam müşteri sayısını (Tercih) hesapla
        // 2. Bunu toplam müşteri sayısına bölerek % Tercih Oranı bul
        // 3. oda_karlilik_verileri tablosundan Kar Marjını çek

        // Not: Tercih Oranı hesabı için o otelin o yıldaki toplam müşteri sayısına ihtiyacımız var.
        // Bu yüzden Window Function veya Subquery kullanacağız.

        const sql = `
            WITH ToplamMusteri AS (
                SELECT SUM(musteri_sayisi) as genel_toplam 
                FROM oda_analizi 
                WHERE yil = ? AND otel_id = ?
            )
            SELECT 
                ot.oda_tipi_adi,
                SUM(oa.musteri_sayisi) as toplam_talep,
                (SUM(oa.musteri_sayisi) / (SELECT genel_toplam FROM ToplamMusteri) * 100) as tercih_orani,
                COALESCE(dav.kar_marji, 0) as kar_orani
            FROM oda_analizi oa
            JOIN oda_tipleri ot ON oa.oda_tipi_id = ot.oda_tipi_id
            LEFT JOIN oda_karlilik_verileri dav ON ot.oda_tipi_id = dav.oda_tipi_id AND dav.yil = ?
            WHERE oa.yil = ? AND oa.otel_id = ?
            GROUP BY ot.oda_tipi_id, ot.oda_tipi_adi, dav.kar_marji
            ORDER BY tercih_orani DESC
        `;

        db.query(sql, [yil, otelId, yil, yil, otelId], (err, results) => {
            if (err) {
                console.error("Oda Karlılık Analizi Hatası:", err);
                return callback(err, null);
            }
            // Sayısal değerleri float'a çevir
            const formatted = results.map(row => ({
                oda_tipi: row.oda_tipi_adi,
                tercih_orani: parseFloat(row.tercih_orani || 0).toFixed(1),
                kar_orani: parseFloat(row.kar_orani || 0).toFixed(1)
            }));
            callback(null, formatted);
        });
    }
}

module.exports = OdaModel;
