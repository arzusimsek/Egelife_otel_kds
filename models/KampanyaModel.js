const db = require("../db/db");

class KampanyaModel {
    // Kampanya performansları - kampanyalar ve kampanya_analiz tablolarından
    static getKampanyaPerformansi(yil, otelId, callback) {
        let sql;
        let params = [];
        
        sql = `
            SELECT 
                k.kampanya_adi,
                k.baslangic_tarihi,
                k.bitis_tarihi,
                k.indirim_orani,
                COALESCE(ka.sonraki_musteri_sayisi, 0) as rezervasyon_sayisi,
                COALESCE(ka.sonraki_gelir, 0) as toplam_gelir,
                COALESCE(ka.onceki_gelir, 0) as onceki_gelir,
                COALESCE(ka.sonraki_gelir, 0) - COALESCE(ka.onceki_gelir, 0) as gelir_artisi
            FROM kampanyalar k
            LEFT JOIN kampanya_analiz ka ON k.kampanya_id = ka.kampanya_id
            WHERE 1=1
        `;
        
        if (yil) {
            sql += ` AND YEAR(k.baslangic_tarihi) = ?`;
            params.push(yil);
        }
        
        if (otelId && otelId !== 'all' && otelId !== '') {
            sql += ` AND k.otel_id = ?`;
            params.push(otelId);
        }
        
        sql += ` GROUP BY k.kampanya_id, k.kampanya_adi, k.baslangic_tarihi, k.bitis_tarihi, k.indirim_orani
                 ORDER BY toplam_gelir DESC`;
        
        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Kampanya performansı hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // Aylık kampanya gelirleri - kampanya_analiz tablosundan
    static getAylikKampanyaGelirleri(yil, otelId, callback) {
        let sql;
        let params = [];
        
        sql = `
            SELECT 
                MONTH(k.baslangic_tarihi) as ay,
                COUNT(DISTINCT k.kampanya_id) as kampanya_sayisi,
                SUM(COALESCE(ka.sonraki_musteri_sayisi, 0)) as rezervasyon_sayisi,
                SUM(COALESCE(ka.sonraki_gelir, 0)) as toplam_gelir
            FROM kampanyalar k
            LEFT JOIN kampanya_analiz ka ON k.kampanya_id = ka.kampanya_id
            WHERE 1=1
        `;
        
        if (yil) {
            sql += ` AND YEAR(k.baslangic_tarihi) = ?`;
            params.push(yil);
        }
        
        if (otelId && otelId !== 'all' && otelId !== '') {
            sql += ` AND k.otel_id = ?`;
            params.push(otelId);
        }
        
        sql += ` GROUP BY MONTH(k.baslangic_tarihi)
                 ORDER BY ay ASC`;
        
        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Aylık kampanya gelirleri hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // Kampanya türlerine göre dağılım - kampanyalar tablosundan
    static getKampanyaTuruDagilimi(yil, callback) {
        let sql;
        let params = [];
        
        // Kampanya türü kolonu yoksa, indirim oranına göre kategorize et
        sql = `
            SELECT 
                CASE 
                    WHEN k.indirim_orani >= 50 THEN 'Yüksek İndirim (50%+)'
                    WHEN k.indirim_orani >= 30 THEN 'Orta İndirim (30-49%)'
                    WHEN k.indirim_orani >= 10 THEN 'Düşük İndirim (10-29%)'
                    ELSE 'Minimal İndirim (<10%)'
                END as kampanya_turu,
                COUNT(DISTINCT k.kampanya_id) as kampanya_sayisi,
                SUM(COALESCE(ka.sonraki_musteri_sayisi, 0)) as rezervasyon_sayisi,
                SUM(COALESCE(ka.sonraki_gelir, 0)) as toplam_gelir
            FROM kampanyalar k
            LEFT JOIN kampanya_analiz ka ON k.kampanya_id = ka.kampanya_id
            WHERE 1=1
        `;
        
        if (yil) {
            sql += ` AND YEAR(k.baslangic_tarihi) = ?`;
            params.push(yil);
        }
        
        sql += ` GROUP BY kampanya_turu
                 ORDER BY toplam_gelir DESC`;
        
        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Kampanya türü dağılımı hatası:", err.message);
                return callback(err, null);
            }
            callback(null, results);
        });
    }

    // Kampanya Analizi Tablosu - Pagination ve Filtreleme ile
    static getKampanyaAnalizTablosu(filters, callback) {
        const {
            kampanyaAdi = '',
            etkiSeviyesi = '',
            otelId = '',
            page = 1,
            limit = 8
        } = filters;

        // WHERE koşulları
        let whereConditions = [];
        const params = [];

        if (kampanyaAdi && kampanyaAdi.trim() !== '') {
            whereConditions.push(`k.kampanya_adi LIKE ?`);
            params.push(`%${kampanyaAdi.trim()}%`);
        }

        if (etkiSeviyesi && etkiSeviyesi !== '' && etkiSeviyesi !== 'all' && etkiSeviyesi !== 'Tümü') {
            // LIKE ile kısmi eşleşme, LOWER ve TRIM ile büyük/küçük harf ve boşluk sorunlarını çöz
            // Parametreyi önce formatla, sonra LIKE'a ver
            const trimmedValue = etkiSeviyesi.trim();
            const searchTerm = `%${trimmedValue}%`;
            whereConditions.push(`LOWER(TRIM(ka.etki_seviyesi)) LIKE LOWER(?)`);
            params.push(searchTerm);
            console.log('Etki Seviyesi Filtresi Uygulandı:', trimmedValue, '-> SQL parametresi:', searchTerm);
        }

        if (otelId && otelId !== '' && otelId !== 'all') {
            whereConditions.push(`k.otel_id = ?`);
            params.push(parseInt(otelId));
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // COUNT sorgusu (toplam kayıt sayısı)
        const countSql = `
            SELECT COUNT(*) as total
            FROM kampanyalar k
            JOIN kampanya_analiz ka ON ka.kampanya_id = k.kampanya_id
            JOIN oteller o ON o.otel_id = k.otel_id
            ${whereClause}
        `;

        // SELECT sorgusu (veriler)
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const dataSql = `
            SELECT 
                k.kampanya_adi,
                o.otel_adi,
                CONCAT(DATE_FORMAT(k.baslangic_tarihi, '%d.%m.%Y'), ' - ', DATE_FORMAT(k.bitis_tarihi, '%d.%m.%Y')) AS donem,
                k.indirim_orani,
                ka.onceki_musteri_sayisi,
                ka.sonraki_musteri_sayisi,
                ROUND(((ka.sonraki_musteri_sayisi - ka.onceki_musteri_sayisi) 
                       / NULLIF(ka.onceki_musteri_sayisi, 0)) * 100, 2) AS artis_yuzde,
                ka.etki_seviyesi
            FROM kampanyalar k
            JOIN kampanya_analiz ka ON ka.kampanya_id = k.kampanya_id
            JOIN oteller o ON o.otel_id = k.otel_id
            ${whereClause}
            ORDER BY k.baslangic_tarihi DESC
            LIMIT ? OFFSET ?
        `;

        const dataParams = [...params, parseInt(limit), offset];

        // Önce toplam sayıyı al
        db.query(countSql, params, (err, countResults) => {
            if (err) {
                console.error("Kampanya analiz tablosu COUNT hatası:", err);
                return callback(err, null);
            }

            const total = countResults[0]?.total || 0;

            // Sonra verileri al
            db.query(dataSql, dataParams, (err, results) => {
                if (err) {
                    console.error("Kampanya analiz tablosu hatası:", err);
                    return callback(err, null);
                }

                // Yorum üretimi (artış yüzdesine göre)
                const dataWithComments = (results || []).map(row => {
                    const artisYuzde = parseFloat(row.artis_yuzde) || 0;
                    let yorum = '';

                    if (artisYuzde > 20) {
                        yorum = 'Başarılı kampanya';
                    } else if (artisYuzde >= 5 && artisYuzde <= 20) {
                        yorum = 'Orta düzey etki';
                    } else if (artisYuzde > 0 && artisYuzde < 5) {
                        yorum = 'Sınırlı etki';
                    } else {
                        yorum = 'Negatif etki';
                    }

                    return {
                        ...row,
                        yorum: yorum
                    };
                });

                callback(null, {
                    data: dataWithComments,
                    total: total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit))
                });
            });
        });
    }
}

module.exports = KampanyaModel;
