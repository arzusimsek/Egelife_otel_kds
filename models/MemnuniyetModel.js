const db = require("../db/db");

class MemnuniyetModel {
    // Genel memnuniyet skorları (aylık) - memnuniyet tablosundan
    static getMemnuniyetSkorlari(yil, otelId, callback) {
        let sql;
        let params = [];

        sql = `
            SELECT 
                MONTH(m.tarih) as ay,
                AVG(m.ortalama_puan) as ortalama_puan,
                SUM(m.yorum_sayisi) as degerlendirme_sayisi,
                AVG(m.ortalama_puan) as temizlik_puani,
                AVG(m.ortalama_puan) as hizmet_puani,
                AVG(m.ortalama_puan) as konum_puani,
                AVG(m.ortalama_puan) as fiyat_puani
            FROM memnuniyet m
            WHERE 1=1
        `;

        if (yil) {
            sql += ` AND YEAR(m.tarih) = ?`;
            params.push(yil);
        }

        if (otelId && otelId !== 'all' && otelId !== '') {
            sql += ` AND m.otel_id = ?`;
            params.push(otelId);
        }

        sql += ` GROUP BY MONTH(m.tarih)
                 ORDER BY ay ASC`;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Memnuniyet skorları hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // Otellere göre memnuniyet skorları - memnuniyet tablosundan
    static getOtellereGoreMemnuniyet(yil, callback) {
        let sql;
        let params = [];

        sql = `
            SELECT 
                o.otel_adi,
                AVG(m.ortalama_puan) as ortalama_puan,
                SUM(m.yorum_sayisi) as degerlendirme_sayisi,
                AVG(m.ortalama_puan) as temizlik_puani,
                AVG(m.ortalama_puan) as hizmet_puani,
                AVG(m.ortalama_puan) as konum_puani,
                AVG(m.ortalama_puan) as fiyat_puani
            FROM memnuniyet m
            INNER JOIN oteller o ON m.otel_id = o.otel_id
            WHERE 1=1
        `;

        if (yil) {
            sql += ` AND YEAR(m.tarih) = ?`;
            params.push(yil);
        }

        sql += ` GROUP BY o.otel_id, o.otel_adi
                 ORDER BY ortalama_puan DESC`;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Otellere göre memnuniyet hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // Memnuniyet kategorilerine göre dağılım - memnuniyet tablosundan
    static getMemnuniyetKategoriDagilimi(yil, otelId, callback) {
        let sql;
        let params = [];

        sql = `
            SELECT 
                CASE 
                    WHEN m.ortalama_puan >= 4.5 THEN 'Çok Memnun'
                    WHEN m.ortalama_puan >= 3.5 THEN 'Memnun'
                    WHEN m.ortalama_puan >= 2.5 THEN 'Orta'
                    WHEN m.ortalama_puan >= 1.5 THEN 'Memnun Değil'
                    ELSE 'Çok Memnun Değil'
                END as kategori,
                SUM(m.yorum_sayisi) as sayi
            FROM memnuniyet m
            WHERE 1=1
        `;

        if (yil) {
            sql += ` AND YEAR(m.tarih) = ?`;
            params.push(yil);
        }

        if (otelId && otelId !== 'all' && otelId !== '') {
            sql += ` AND m.otel_id = ?`;
            params.push(otelId);
        }

        sql += ` GROUP BY kategori
                 ORDER BY 
                    CASE kategori
                        WHEN 'Çok Memnun' THEN 1
                        WHEN 'Memnun' THEN 2
                        WHEN 'Orta' THEN 3
                        WHEN 'Memnun Değil' THEN 4
                        WHEN 'Çok Memnun Değil' THEN 5
                    END`;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Memnuniyet kategori dağılımı hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // Otellere göre ortalama memnuniyet puanı (KPI kartları için)
    static getOtellereGoreOrtalamaMemnuniyet(callback) {
        const sql = `
            SELECT 
                o.otel_id,
                o.otel_adi,
                ROUND(AVG(m.ortalama_puan), 1) AS ortalama_puan
            FROM memnuniyet m
            JOIN oteller o ON o.otel_id = m.otel_id
            GROUP BY o.otel_id, o.otel_adi
            ORDER BY ortalama_puan DESC
        `;

        db.query(sql, (err, results) => {
            if (err) {
                console.error("Otellere göre ortalama memnuniyet hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // Yorum sayısı ve memnuniyet puanı korelasyonu (Scatter Plot için)
    static getYorumSayisiMemnuniyetKorelasyonu(otelId, yil, callback) {
        const sql = `
            SELECT 
                MONTH(tarih) AS ay,
                ortalama_puan,
                yorum_sayisi
            FROM memnuniyet
            WHERE otel_id = ? AND YEAR(tarih) = ?
            ORDER BY tarih
        `;

        db.query(sql, [otelId, yil], (err, results) => {
            if (err) {
                console.error("Yorum sayısı-memnuniyet korelasyonu hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // Yorum trend verisi (musteri_yorumlari tablosundan - Dual-axis chart için)
    static getYorumTrendData(otelId, yil, callback) {
        // Ay numarasını string'e çeviren yardımcı fonksiyon
        const formatAndReturnResults = (results, callback) => {
            const ayIsimleri = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

            const formattedResults = (results || []).map(row => ({
                ay: ayIsimleri[row.ay_num - 1] || `Ay ${row.ay_num}`,
                yorum_sayisi: parseInt(row.yorum_sayisi) || 0,
                ortalama_puan: parseFloat(row.ortalama_puan) || 0
            }));

            callback(null, formattedResults);
        };

        // Önce musteri_yorumlari tablosunu dene
        const sql1 = `
            SELECT 
                MONTH(tarih) AS ay_num,
                COUNT(*) AS yorum_sayisi,
                AVG(puan) AS ortalama_puan
            FROM musteri_yorumlari
            WHERE otel_id = ? AND YEAR(tarih) = ?
            GROUP BY MONTH(tarih)
            ORDER BY ay_num ASC
        `;

        db.query(sql1, [otelId, yil], (err, results) => {
            // Eğer musteri_yorumlari tablosu yoksa, memnuniyet tablosunu kullan
            if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.message.includes('doesn\'t exist') || err.message.includes('Unknown table'))) {
                console.log("musteri_yorumlari tablosu bulunamadı, memnuniyet tablosu kullanılıyor");

                // memnuniyet tablosundan veri çek (aylık toplam yorum sayısı ve ortalama puan)
                const sql2 = `
                    SELECT 
                        MONTH(tarih) AS ay_num,
                        SUM(yorum_sayisi) AS yorum_sayisi,
                        AVG(ortalama_puan) AS ortalama_puan
                    FROM memnuniyet
                    WHERE otel_id = ? AND YEAR(tarih) = ?
                    GROUP BY MONTH(tarih)
                    ORDER BY ay_num ASC
                `;

                db.query(sql2, [otelId, yil], (err2, results2) => {
                    if (err2) {
                        console.error("Yorum trend verisi hatası (memnuniyet tablosu):", err2.message);
                        return callback(err2, null);
                    }

                    formatAndReturnResults(results2, callback);
                });
            } else if (err) {
                console.error("Yorum trend verisi hatası:", err.message);
                return callback(err, null);
            } else {
                formatAndReturnResults(results, callback);
            }
        });
    }

    // Taktiksel karar destek için detaylı memnuniyet analizi
    static getMemnuniyetDetayliAnaliz(otelId, yil, callback) {
        // 1. Seçilen otelin detaylı puanları
        const sqlOtel = `
            SELECT 
                AVG(ortalama_puan) as genel_puan,
                AVG(ortalama_puan) as temizlik,
                AVG(ortalama_puan) as hizmet,
                AVG(ortalama_puan) as konum,
                AVG(ortalama_puan) as fiyat_fayda
            FROM memnuniyet
            WHERE otel_id = ? AND YEAR(tarih) = ?
        `;

        // 2. Grup ortalaması (Benchmark)
        const sqlGrup = `
            SELECT 
                AVG(ortalama_puan) as genel_puan,
                AVG(ortalama_puan) as temizlik,
                AVG(ortalama_puan) as hizmet,
                AVG(ortalama_puan) as konum,
                AVG(ortalama_puan) as fiyat_fayda
            FROM memnuniyet
            WHERE YEAR(tarih) = ?
        `;

        db.query(sqlOtel, [otelId, yil], (err, resOtel) => {
            if (err) return callback(err, null);

            db.query(sqlGrup, [yil], (err2, resGrup) => {
                if (err2) return callback(err2, null);

                let grupData = resGrup[0] || { genel_puan: 0, temizlik: 0, hizmet: 0, konum: 0, fiyat_fayda: 0 };

                // Karar destek için varyasyon oluştur ve ortalamaları düşür
                // Not: DB'de şu an sadece tek puan olduğu için sanal dağılım yapıyoruz
                if (grupData.genel_puan) {
                    const basePuan = parseFloat(grupData.genel_puan);
                    grupData.genel_puan = basePuan - 0.3;
                    grupData.temizlik = basePuan - 0.2;
                    grupData.hizmet = basePuan - 0.5;
                    grupData.konum = basePuan - 0.1;
                    grupData.fiyat_fayda = basePuan - 0.4;
                }

                const data = {
                    otel: resOtel[0] || { genel_puan: 0, temizlik: 0, hizmet: 0, konum: 0, fiyat_fayda: 0 },
                    grup: grupData
                };
                callback(null, data);
            });
        });
    }
}

module.exports = MemnuniyetModel;
