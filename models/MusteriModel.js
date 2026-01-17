const db = require("../db/db");

class MusteriModel {
    // Yıllara göre müşteri tipi dağılımı (Yerli/Yabancı)
    static getMusteriTipiDagilimi(yil, callback) {
        let sql;
        let params = [];

        if (yil) {
            // Belirli bir yıl için sorgu
            sql = `
                SELECT 
                    CASE 
                        WHEN r.musteri_tipi = 'Yerli' OR r.musteri_tipi = 'yerli' 
                             OR r.ulke = 'Türkiye' OR r.ulke = 'Turkey' 
                             OR r.ulke = 'TR' OR m.ulke = 'Türkiye' OR m.ulke = 'Turkey'
                        THEN 'Yerli'
                        ELSE 'Yabancı'
                    END as tip,
                    COUNT(*) as sayi
                FROM rezervasyonlar r
                LEFT JOIN musteriler m ON r.musteri_id = m.musteri_id
                WHERE YEAR(r.rezervasyon_tarihi) = ? OR YEAR(r.giris_tarihi) = ?
                GROUP BY tip
            `;
            params = [yil, yil];
        } else {
            // Tüm yıllar için
            sql = `
                SELECT 
                    COALESCE(YEAR(r.rezervasyon_tarihi), YEAR(r.giris_tarihi)) as yil,
                    CASE 
                        WHEN r.musteri_tipi = 'Yerli' OR r.musteri_tipi = 'yerli' 
                             OR r.ulke = 'Türkiye' OR r.ulke = 'Turkey' 
                             OR r.ulke = 'TR' OR m.ulke = 'Türkiye' OR m.ulke = 'Turkey'
                        THEN 'Yerli'
                        ELSE 'Yabancı'
                    END as tip,
                    COUNT(*) as sayi
                FROM rezervasyonlar r
                LEFT JOIN musteriler m ON r.musteri_id = m.musteri_id
                WHERE YEAR(r.rezervasyon_tarihi) IS NOT NULL OR YEAR(r.giris_tarihi) IS NOT NULL
                GROUP BY yil, tip
                ORDER BY yil DESC
            `;
        }

        // İlk sorguyu dene
        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Müşteri tipi dağılımı hatası (rezervasyonlar tablosu):", err.message);

                // Alternatif sorgu: aylik_istatistik tablosundan
                const altSql1 = yil ? `
                    SELECT 
                        CASE 
                            WHEN musteri_tipi = 'Yerli' OR musteri_tipi = 'yerli' THEN 'Yerli'
                            WHEN musteri_tipi IS NOT NULL THEN 'Yabancı'
                            ELSE 'Yabancı'
                        END as tip,
                        COUNT(*) as sayi
                    FROM aylik_istatistik
                    WHERE yil = ? AND musteri_tipi IS NOT NULL
                    GROUP BY tip
                ` : `
                    SELECT 
                        yil,
                        CASE 
                            WHEN musteri_tipi = 'Yerli' OR musteri_tipi = 'yerli' THEN 'Yerli'
                            WHEN musteri_tipi IS NOT NULL THEN 'Yabancı'
                            ELSE 'Yabancı'
                        END as tip,
                        COUNT(*) as sayi
                    FROM aylik_istatistik
                    WHERE yil IS NOT NULL AND musteri_tipi IS NOT NULL
                    GROUP BY yil, tip
                    ORDER BY yil DESC
                `;

                const altParams1 = yil ? [yil] : [];

                db.query(altSql1, altParams1, (altErr1, altResults1) => {
                    if (altErr1 || !altResults1 || altResults1.length === 0) {
                        // Alternatif 2: yerli_musteri_sayisi ve yabanci_musteri_sayisi alanları
                        const altSql2 = yil ? `
                            SELECT 
                                'Yerli' as tip,
                                COALESCE(SUM(CASE WHEN yerli_musteri_sayisi > 0 THEN yerli_musteri_sayisi ELSE 0 END), 0) as sayi
                            FROM aylik_istatistik
                            WHERE yil = ?
                            UNION ALL
                            SELECT 
                                'Yabancı' as tip,
                                COALESCE(SUM(CASE WHEN yabanci_musteri_sayisi > 0 THEN yabanci_musteri_sayisi ELSE 0 END), 0) as sayi
                            FROM aylik_istatistik
                            WHERE yil = ?
                        ` : `
                            SELECT 
                                yil,
                                'Yerli' as tip,
                                COALESCE(SUM(CASE WHEN yerli_musteri_sayisi > 0 THEN yerli_musteri_sayisi ELSE 0 END), 0) as sayi
                            FROM aylik_istatistik
                            WHERE yil IS NOT NULL
                            GROUP BY yil
                            UNION ALL
                            SELECT 
                                yil,
                                'Yabancı' as tip,
                                COALESCE(SUM(CASE WHEN yabanci_musteri_sayisi > 0 THEN yabanci_musteri_sayisi ELSE 0 END), 0) as sayi
                            FROM aylik_istatistik
                            WHERE yil IS NOT NULL
                            GROUP BY yil
                            ORDER BY yil DESC
                        `;

                        const altParams2 = yil ? [yil, yil] : [];

                        db.query(altSql2, altParams2, (altErr2, altResults2) => {
                            if (altErr2 || !altResults2 || altResults2.length === 0) {
                                // Varsayılan veri döndür
                                return callback(null, [
                                    { tip: 'Yerli', sayi: 0 },
                                    { tip: 'Yabancı', sayi: 0 }
                                ]);
                            }
                            callback(null, altResults2);
                        });
                        return;
                    }
                    callback(null, altResults1);
                });
                return;
            }
            callback(null, results);
        });
    }

    // Aylık müşteri tipleri tablosundan veri çek (sütun grafiği için)
    static getAylikMusteriTipleri(yillar, otelId, callback) {
        // yillar: [2023, 2024, 2025] gibi bir array
        // otelId: seçilen otel ID'si (null ise tüm oteller)
        if (!yillar || !Array.isArray(yillar) || yillar.length === 0) {
            return callback(null, []);
        }

        const placeholders = yillar.map(() => '?').join(',');
        let params = [...yillar];
        let whereClause = `mta.yil IN (${placeholders})`;

        // Eğer otel seçildiyse, otel_id filtresi ekle
        if (otelId && otelId !== 'all' && otelId !== '') {
            whereClause += ' AND mta.otel_id = ?';
            params.push(otelId);
        }

        // musteri_turleri_analizi tablosunda musteri_tipi_id var, musteri_turleri tablosuyla JOIN yap
        const sql = `
            SELECT 
                mta.yil,
                mta.ay,
                mt.musteri_tipi,
                mta.musteri_sayisi
            FROM musteri_turleri_analizi mta
            INNER JOIN musteri_turleri mt ON mta.musteri_tipi_id = mt.musteri_tipi_id
            WHERE ${whereClause}
            ORDER BY mta.yil ASC, mta.ay ASC, mt.musteri_tipi ASC
        `;

        console.log("SQL sorgusu:", sql);
        console.log("Parametreler:", params);

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Aylık müşteri tipleri hatası:", err.message);
                console.error("Hata kodu:", err.code);
                return callback(err, null);
            }

            console.log("Sorgu başarılı, sonuç sayısı:", results ? results.length : 0);
            if (results && results.length > 0) {
                console.log("İlk 3 kayıt örneği:", results.slice(0, 3));
            }
            callback(null, results);
        });
    }

    // Yerli/Yabancı dağılımı - Sadece ID 1 ve 2 için (Pie Chart)
    static getYerliYabanciDagilimi(yil, callback) {
        let whereClause = '';
        let params = [];

        // Yıl filtresi
        if (yil && yil !== '' && yil !== 'all') {
            whereClause = 'WHERE a.yil = ?';
            params = [yil];
        } else {
            whereClause = '';
            params = [];
        }

        // SQL sorgusu - Sadece musteri_tipi_id = 1 (Yerli) ve 2 (Yabancı)
        const sql = `
            SELECT 
                t.musteri_tipi,
                t.musteri_tipi_id,
                SUM(a.musteri_sayisi) as toplam
            FROM musteri_turleri_analizi a
            INNER JOIN musteri_turleri t ON a.musteri_tipi_id = t.musteri_tipi_id
            ${whereClause ? whereClause + ' AND a.musteri_tipi_id IN (1, 2)' : 'WHERE a.musteri_tipi_id IN (1, 2)'}
            GROUP BY t.musteri_tipi_id, t.musteri_tipi
        `;

        console.log("Yerli/Yabancı dağılımı SQL:", sql);
        console.log("Parametreler:", params);

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Yerli/Yabancı dağılımı hatası:", err);
                return callback(err, null);
            }

            console.log("Yerli/Yabancı dağılımı sonuç sayısı:", results ? results.length : 0);
            callback(null, results || []);
        });
    }

    // Genel müşteri dağılımı - Tüm müşteri tipleri için (Bar Chart)
    static getGenelMusteriDagilimi(yil, callback) {
        let whereClause = '';
        let params = [];

        // Yıl filtresi
        if (yil && yil !== '' && yil !== 'all') {
            whereClause = 'WHERE a.yil = ?';
            params = [yil];
        } else {
            whereClause = '';
            params = [];
        }

        // SQL sorgusu - Tüm müşteri tipleri
        const sql = `
            SELECT 
                t.musteri_tipi,
                t.musteri_tipi_id,
                SUM(a.musteri_sayisi) as toplam
            FROM musteri_turleri_analizi a
            INNER JOIN musteri_turleri t ON a.musteri_tipi_id = t.musteri_tipi_id
            ${whereClause}
            GROUP BY t.musteri_tipi_id, t.musteri_tipi
            ORDER BY toplam DESC
        `;

        console.log("Genel müşteri dağılımı SQL:", sql);
        console.log("Parametreler:", params);

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Genel müşteri dağılımı hatası:", err);
                return callback(err, null);
            }

            console.log("Genel müşteri dağılımı sonuç sayısı:", results ? results.length : 0);
            callback(null, results || []);
        });
    }

    // Müşteri türü dağılımı - otel_id ve yil parametreleri ile (Pie Chart için)
    static getMusteriTurDagilimi(otel_id, yil, callback) {
        let whereConditions = [];
        let params = [];

        // Otel filtresi
        if (otel_id && otel_id !== '' && otel_id !== 'all') {
            whereConditions.push('mta.otel_id = ?');
            params.push(otel_id);
        }

        // Yıl filtresi
        if (yil && yil !== '' && yil !== 'all') {
            whereConditions.push('mta.yil = ?');
            params.push(yil);
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        const sql = `
            SELECT 
                mt.musteri_tipi,
                SUM(mta.musteri_sayisi) as toplam
            FROM musteri_turleri_analizi mta
            INNER JOIN musteri_turleri mt ON mta.musteri_tipi_id = mt.musteri_tipi_id
            ${whereClause}
            GROUP BY mt.musteri_tipi_id, mt.musteri_tipi
            ORDER BY toplam DESC
        `;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Müşteri türü dağılımı hatası:", err);
                return callback(err, null);
            }

            callback(null, results || []);
        });
    }

    // Müşteri türü dağılımı - Sadece yıl bazlı, tüm oteller (Alt Pie Chart için)
    static getMusteriTurDagilimiYilBazli(yil, callback) {
        let whereClause = '';
        let params = [];

        // Yıl filtresi (zorunlu)
        if (yil && yil !== '' && yil !== 'all') {
            whereClause = 'WHERE mta.yil = ?';
            params.push(yil);
        } else {
            // Yıl verilmezse hata döndür
            return callback(new Error('Yıl parametresi gereklidir'), null);
        }

        const sql = `
            SELECT 
                mt.musteri_tipi,
                mt.musteri_tipi_id,
                SUM(mta.musteri_sayisi) as toplam
            FROM musteri_turleri_analizi mta
            INNER JOIN musteri_turleri mt ON mta.musteri_tipi_id = mt.musteri_tipi_id
            ${whereClause}
            GROUP BY mt.musteri_tipi_id, mt.musteri_tipi
            ORDER BY toplam DESC
        `;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Müşteri türü dağılımı (yıl bazlı) hatası:", err);
                // Hata durumunda fallback dene
                return MusteriModel.getMusteriTurDagilimiYilBazliFallback(yil, callback);
            }

            // Eğer sonuçlar boşsa veya çok azsa fallback dene (Veri eksik olabilir)
            if (!results || results.length < 3) {
                console.log("Müşteri türleri (yıl bazlı) eksik, fallback tablo deneniyor...");
                return MusteriModel.getMusteriTurDagilimiYilBazliFallback(yil, callback);
            }

            callback(null, results || []);
        });
    }

    // Fallback: musteri_tur_analizi tablosundan çek
    static getMusteriTurDagilimiYilBazliFallback(yil, callback) {
        const sql = `
            SELECT 
                tur_id AS musteri_tipi_id,
                COALESCE(SUM(sayi), 0) AS toplam
            FROM musteri_tur_analizi
            WHERE yil = ?
            GROUP BY tur_id
            ORDER BY toplam DESC
        `;

        db.query(sql, [yil], (err, results) => {
            if (err) {
                console.error("Müşteri türü dağılımı fallback hatası:", err);
                return callback(err, null);
            }

            // Formatla
            const formatted = (results || []).map(row => {
                const turId = parseInt(row.musteri_tipi_id) || 0;
                const turAdlari = {
                    1: 'Yerli Turist',
                    2: 'Yabancı Turist',
                    3: 'Aile (Çocuklu)',
                    4: 'Çift',
                    5: 'Kurumsal / İş',
                    6: 'Tur Grubu',
                    7: 'Bireysel'
                };

                return {
                    musteri_tipi: turAdlari[turId] || `Tip ${turId}`,
                    musteri_tipi_id: turId,
                    toplam: parseInt(row.toplam) || 0
                };
            });

            callback(null, formatted);
        });
    }

    // Grafik 1: Yıl bazında Yerli/Yabancı müşteri toplamı
    // musteri_turleri_analizi tablosundan musteri_tipi_id = 1 (Yerli) ve 2 (Yabancı) toplamları
    static getYerliYabanciToplamYilBazli(yil, callback) {
        if (!yil || yil === '' || yil === 'all') {
            return callback(new Error('Yıl parametresi gereklidir'), null);
        }

        // musteri_turleri_analizi tablosunu kullan (musteri_tipi_id ve musteri_sayisi kullanarak)
        const sql = `
            SELECT
                COALESCE(SUM(CASE WHEN musteri_tipi_id = 1 THEN musteri_sayisi ELSE 0 END), 0) AS yerli,
                COALESCE(SUM(CASE WHEN musteri_tipi_id = 2 THEN musteri_sayisi ELSE 0 END), 0) AS yabanci
            FROM musteri_turleri_analizi
            WHERE yil = ?
        `;

        db.query(sql, [yil], (err, results) => {
            if (err) {
                // Eğer musteri_turleri_analizi yoksa, musteri_tur_analizi'ni dene (fallback)
                console.log("musteri_turleri_analizi bulunamadı, musteri_tur_analizi deneniyor...");
                const sql2 = `
                    SELECT
                        COALESCE(SUM(CASE WHEN tur_id = 1 THEN sayi ELSE 0 END), 0) AS yerli,
                        COALESCE(SUM(CASE WHEN tur_id = 2 THEN sayi ELSE 0 END), 0) AS yabanci
                    FROM musteri_tur_analizi
                    WHERE yil = ?
                `;

                db.query(sql2, [yil], (err2, results2) => {
                    if (err2) {
                        console.error("Yerli/Yabancı toplam (yıl bazlı) hatası:", err2);
                        return callback(err2, null);
                    }

                    const result = results2 && results2.length > 0 ? results2[0] : { yerli: 0, yabanci: 0 };
                    callback(null, {
                        yerli: parseInt(result.yerli) || 0,
                        yabanci: parseInt(result.yabanci) || 0
                    });
                });
                return;
            }

            const result = results && results.length > 0 ? results[0] : { yerli: 0, yabanci: 0 };
            callback(null, {
                yerli: parseInt(result.yerli) || 0,
                yabanci: parseInt(result.yabanci) || 0
            });
        });
    }

    // Grafik 2: Yıl + Otel bazında 7 müşteri türü dağılımı
    // musteri_turu_id = 1...7 aralığı toplanacak
    static getMusteriTurDagilimiYilOtelBazli(yil, otel_id, callback) {
        if (!yil || yil === '' || yil === 'all') {
            return callback(new Error('Yıl parametresi gereklidir'), null);
        }

        if (!otel_id || otel_id === '' || otel_id === 'all') {
            return callback(new Error('Otel ID parametresi gereklidir'), null);
        }

        // musteri_turleri_analizi tablosunu kullan (musteri_tipi_id ve musteri_sayisi kullanarak)
        const sql = `
            SELECT 
                musteri_tipi_id,
                COALESCE(SUM(musteri_sayisi), 0) AS toplam
            FROM musteri_turleri_analizi
            WHERE yil = ? AND otel_id = ? AND musteri_tipi_id BETWEEN 1 AND 7
            GROUP BY musteri_tipi_id
            ORDER BY musteri_tipi_id
        `;

        db.query(sql, [yil, otel_id], (err, results) => {
            if (err) {
                // Eğer musteri_turleri_analizi yoksa, musteri_tur_analizi'ni dene (fallback)
                console.log("musteri_turleri_analizi bulunamadı, musteri_tur_analizi deneniyor...");
                const sql2 = `
                    SELECT 
                        tur_id AS musteri_turu_id,
                        COALESCE(SUM(sayi), 0) AS toplam
                    FROM musteri_tur_analizi
                    WHERE yil = ? AND otel_id = ? AND tur_id BETWEEN 1 AND 7
                    GROUP BY tur_id
                    ORDER BY tur_id
                `;

                db.query(sql2, [yil, otel_id], (err2, results2) => {
                    if (err2) {
                        console.error("Müşteri türü dağılımı (yıl+otel bazlı) hatası:", err2);
                        return callback(err2, null);
                    }

                    // Format: [{ tur_id: 1, ad: "...", sayi: X }, ...]
                    const formatted = (results2 || []).map(row => {
                        const turId = parseInt(row.musteri_turu_id) || 0;
                        const turAdlari = {
                            1: 'Yerli Turist',
                            2: 'Yabancı Turist',
                            3: 'Aile (Çocuklu)',
                            4: 'Çift',
                            5: 'Kurumsal / İş',
                            6: 'Tur Grubu',
                            7: 'Bireysel'
                        };

                        return {
                            tur_id: turId,
                            ad: turAdlari[turId] || `Tip ${turId}`,
                            sayi: parseInt(row.toplam) || 0
                        };
                    });

                    callback(null, formatted);
                });
                return;
            }

            // musteri_turleri_analizi sonuçlarını formatla
            const formatted = (results || []).map(row => {
                const turId = parseInt(row.musteri_tipi_id) || 0;
                const turAdlari = {
                    1: 'Yerli Turist',
                    2: 'Yabancı Turist',
                    3: 'Aile (Çocuklu)',
                    4: 'Çift',
                    5: 'Kurumsal / İş',
                    6: 'Tur Grubu',
                    7: 'Bireysel'
                };

                return {
                    tur_id: turId,
                    ad: turAdlari[turId] || `Tip ${turId}`,
                    sayi: parseInt(row.toplam) || 0
                };
            });

            callback(null, formatted);
        });
    }

    // Müşteri analizi verileri - musteri_turleri_analizi ve musteri_turleri JOIN
    static getMusteriAnaliziData(yil, otelId, callback) {
        let whereConditions = [];
        let params = [];

        // Yıl filtresi
        if (yil && yil !== '' && yil !== 'all') {
            whereConditions.push('mta.yil = ?');
            params.push(yil);
        }

        // Otel filtresi
        if (otelId && otelId !== '' && otelId !== 'all') {
            whereConditions.push('mta.otel_id = ?');
            params.push(otelId);
        }

        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // SQL sorgusu - JOIN ile müşteri tipi isimlerini al
        const sql = `
            SELECT 
                mta.yil,
                mta.ay,
                mta.otel_id,
                mt.musteri_tipi_id,
                mt.musteri_tipi,
                mta.musteri_sayisi
            FROM musteri_turleri_analizi mta
            INNER JOIN musteri_turleri mt ON mta.musteri_tipi_id = mt.musteri_tipi_id
            ${whereClause}
            ORDER BY mta.yil ASC, mta.ay ASC, mt.musteri_tipi ASC
        `;

        console.log("Müşteri analizi SQL:", sql);
        console.log("Parametreler:", params);

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Müşteri analizi verisi hatası:", err);
                return callback(err, null);
            }

            console.log("Müşteri analizi sonuç sayısı:", results ? results.length : 0);
            callback(null, results || []);
        });
    }

    // Aylık müşteri türleri dağılımı (Stacked Bar Chart için)
    // musteri_tur_analizi tablosundan 12 ay, 7 müşteri türü verileri
    // Aylık müşteri türleri dağılımı (Stacked Bar Chart için)
    // Veritabanındaki tüm müşteri türlerini dinamik olarak getirir
    static getAylikMusteriTurleri(yil, otel_id, callback) {
        if (!yil || yil === '' || yil === 'all') {
            return callback(new Error('Yıl parametresi gereklidir'), null);
        }

        let whereClause = 'WHERE mta.yil = ?';
        let params = [yil];

        if (otel_id && otel_id !== '' && otel_id !== 'all') {
            whereClause += ' AND mta.otel_id = ?';
            params.push(otel_id);
        }

        // Dinamik olarak müşteri türü isimlerini de çekiyoruz
        const sql = `
            SELECT 
                mta.ay,
                mt.musteri_tipi,
                COALESCE(SUM(mta.musteri_sayisi), 0) AS toplam
            FROM musteri_turleri_analizi mta
            INNER JOIN musteri_turleri mt ON mta.musteri_tipi_id = mt.musteri_tipi_id
            ${whereClause}
            GROUP BY mta.ay, mt.musteri_tipi
            ORDER BY mta.ay, mt.musteri_tipi
        `;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Aylık müşteri türleri hatası:", err);

                // Fallback: Eğer musteri_turleri_analizi tablosunda sorun varsa musteri_tur_analizi'ni dene
                // Ancak musteri_tur_analizi'nde join yapacak tablomuzun garantisi yok, bu yüzden basit fallback
                console.log("Fallback: musteri_tur_analizi tablosuna geçiliyor...");

                let fallbackSql = `
                     SELECT 
                        ay,
                        tur_id,
                        COALESCE(SUM(sayi), 0) AS toplam
                    FROM musteri_tur_analizi
                    WHERE yil = ?
                `;
                let fallbackParams = [yil];

                if (otel_id && otel_id !== '' && otel_id !== 'all') {
                    fallbackSql += ' AND otel_id = ?';
                    fallbackParams.push(otel_id);
                }

                fallbackSql += ' GROUP BY ay, tur_id ORDER BY ay, tur_id';

                db.query(fallbackSql, fallbackParams, (err2, results2) => {
                    if (err2) {
                        console.error("Fallback hatası:", err2);
                        return callback(err2, null);
                    }
                    // Fallback verisini formatla (sabit isimlerle)
                    const formatted = formatAylikMusteriTurleri(results2 || [], true); // true = use fallback mapping
                    callback(null, formatted);
                });
                return;
            }

            // Normal veriyi formatla (dinamik isimlerle)
            const formatted = formatAylikMusteriTurleri(results || [], false);
            callback(null, formatted);
        });
    }



    // Aylık müşteri trend (Line Chart için)
    // musteri_turleri_analizi tablosundan seçilen otel ve yıl için 12 aylık toplam müşteri sayısı
    static getAylikMusteriTrend(yil, otel_id, callback) {
        if (!yil || yil === '' || yil === 'all') {
            return callback(new Error('Yıl parametresi gereklidir'), null);
        }

        if (!otel_id || otel_id === '' || otel_id === 'all') {
            return callback(new Error('Otel ID parametresi gereklidir'), null);
        }

        // Doğrudan musteri_turleri_analizi tablosunu kullan
        const sql = `
            SELECT 
                ay,
                COALESCE(SUM(musteri_sayisi), 0) AS toplam
            FROM musteri_turleri_analizi
            WHERE yil = ? AND otel_id = ?
            GROUP BY ay
            ORDER BY ay
        `;

        db.query(sql, [yil, otel_id], (err, results) => {
            if (err) {
                console.error("Aylık müşteri trend hatası:", err);
                return callback(err, null);
            }

            // Personel sayısını aylik_istatistik tablosundan çek
            const personelSql = `
                SELECT 
                    ay,
                    COALESCE(SUM(personel_sayisi), 0) AS personel_sayisi
                FROM aylik_istatistik
                WHERE yil = ? AND otel_id = ?
                GROUP BY ay
                ORDER BY ay
            `;

            db.query(personelSql, [yil, otel_id], (err3, personelResults) => {
                if (err3) {
                    console.error("Personel sayısı çekme hatası:", err3);
                    // Personel verisi yoksa sadece müşteri verisiyle devam et
                    const formatted = formatAylikTrend(results || [], []);
                    callback(null, formatted);
                    return;
                }

                const formatted = formatAylikTrend(results || [], personelResults || []);
                callback(null, formatted);
            });
        });
    }

    // Yıllık otel karşılaştırması (Bar Chart için)
    // Her otelin seçilen yıldaki toplam müşteri sayısı
    // Yıllık otel karşılaştırması (Bar Chart için)
    // Her otelin seçilen yıldaki toplam müşteri sayısı
    static getOtelKarsilastirma(yil, callback) {
        if (!yil || yil === '' || yil === 'all') {
            return callback(new Error('Yıl parametresi gereklidir'), null);
        }

        // Doğrudan musteri_turleri_analizi tablosunu kullan
        const sql = `
            SELECT 
                o.otel_id,
                o.otel_adi,
                COALESCE(SUM(mta.musteri_sayisi), 0) AS toplam
            FROM oteller o
            LEFT JOIN musteri_turleri_analizi mta ON o.otel_id = mta.otel_id AND mta.yil = ?
            GROUP BY o.otel_id, o.otel_adi
            ORDER BY o.otel_adi
        `;

        db.query(sql, [yil], (err, results) => {
            if (err) {
                console.error("Otel karşılaştırma hatası:", err);
                return callback(err, null);
            }

            const formatted = formatOtelKarsilastirma(results || []);
            callback(null, formatted);
        });
    }

    // YENİ: Kampanyaların müşteri türlerine göre etkisi (Radar Chart için)
    // YENİ: Kampanyaların otel bazlı etkisi (Radar Chart için - Otel Karşılaştırmalı)
    static getKampanyaOtelBazliEtki(yil, kampanyaId, callback) {
        let whereConditions = [];
        let params = [];

        if (yil && yil !== 'all') {
            whereConditions.push('mea.yil = ?');
            params.push(yil);
        }

        if (kampanyaId && kampanyaId !== 'all') {
            whereConditions.push('mea.kampanya_id = ?');
            params.push(kampanyaId);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const sql = `
            SELECT 
                o.otel_adi,
                mt.musteri_tipi,
                mea.etki_puani as etki_skoru
            FROM kampanya_musteri_etki_analizi mea
            JOIN oteller o ON o.otel_id = mea.otel_id
            JOIN musteri_turleri mt ON mt.musteri_tipi_id = mea.musteri_tipi_id
            ${whereClause}
            ORDER BY o.otel_adi, mt.musteri_tipi
        `;

        db.query(sql, params, callback);
    }

    // YENİ: Müşteri Türü Kârlılık Analizi
    static getMusteriKarlilikAnalizi(yil, callback) {
        if (!yil || yil === '' || yil === 'all') {
            return callback(new Error('Yıl parametresi gereklidir'), null);
        }

        const sql = `
            SELECT 
                mt.musteri_tipi,
                mk.kar_marji,
                SUM(mta.musteri_sayisi) as toplam_musteri
            FROM musteri_karlilik_verileri mk
            JOIN musteri_turleri mt ON mk.musteri_tipi_id = mt.musteri_tipi_id
            LEFT JOIN musteri_turleri_analizi mta ON mt.musteri_tipi_id = mta.musteri_tipi_id AND mta.yil = mk.yil
            WHERE mk.yil = ?
            GROUP BY mt.musteri_tipi_id, mt.musteri_tipi, mk.kar_marji
            ORDER BY mk.kar_marji DESC
        `;

        db.query(sql, [yil], (err, results) => {
            if (err) {
                console.error("Müşteri kârlılık analizi hatası:", err);
                return callback(err, null);
            }
            callback(null, results || []);
        });
    }

    // YENİ: Müşteri Tipi - Oda Tercihi İlişkisi Analizi
    static getMusteriOdaTercihleri(yil, otel_id, callback) {
        if (!yil || yil === '' || yil === 'all') {
            return callback(new Error('Yıl parametresi gereklidir'), null);
        }

        let whereClause = 'mota.yil = ?';
        let params = [yil];

        if (otel_id && otel_id !== '' && otel_id !== 'all') {
            whereClause += ' AND mota.otel_id = ?';
            params.push(otel_id);
        }

        const sql = `
            SELECT 
                mt.musteri_tipi,
                ot.oda_tipi_adi,
                SUM(mota.tercih_skoru) as toplam_skor
            FROM musteri_oda_tercih_analizi mota
            JOIN musteri_turleri mt ON mt.musteri_tipi_id = mota.musteri_tipi_id
            JOIN oda_tipleri ot ON ot.oda_tipi_id = mota.oda_tipi_id
            WHERE ${whereClause}
            GROUP BY mt.musteri_tipi_id, ot.oda_tipi_id
            ORDER BY mt.musteri_tipi, toplam_skor DESC
        `;

        db.query(sql, params, (err, results) => {
            if (err) {
                console.error("Müşteri-Oda tercih analizi hatası:", err);
                return callback(err, null);
            }
            callback(null, results || []);
        });
    }
}

// Yardımcı fonksiyon: Aylık müşteri türleri verilerini formatla (Dinamik)
function formatAylikMusteriTurleri(results, isFallback = false) {
    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

    // Veriler objesi: { "Müşteri Tipi 1": [12 aylık veri], "Müşteri Tipi 2": [12 aylık veri] }
    const veriler = {};

    // Fallback için sabit isimler (Eğer JOIN yapılamadıysa)
    const fallbackNames = {
        1: 'Yerli Turist',
        2: 'Yabancı Turist',
        3: 'Aile (Çocuklu)',
        4: 'Çift',
        5: 'Kurumsal / İş',
        6: 'Tur Grubu',
        7: 'Bireysel'
    };

    results.forEach(row => {
        const ay = parseInt(row.ay) || 0;
        const toplam = parseInt(row.toplam) || 0;

        let turAdi = '';
        if (isFallback) {
            const turId = parseInt(row.tur_id) || 0;
            turAdi = fallbackNames[turId] || `Tip ${turId}`;
        } else {
            turAdi = row.musteri_tipi || `Bilinmeyen`;
        }

        if (ay >= 1 && ay <= 12) {
            // Bu tür için array henüz yoksa oluştur
            if (!veriler[turAdi]) {
                veriler[turAdi] = new Array(12).fill(0);
            }
            veriler[turAdi][ay - 1] = toplam; // ay 1-12, array index 0-11
        }
    });

    // Eğer hiç veri yoksa boş dönmek yerine boş obje dön (Controller handle eder)
    return {
        aylar: aylar,
        veriler: veriler
    };
}

// Yardımcı fonksiyon: Aylık trend formatla
function formatAylikTrend(results, personelResults) {
    const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const degerler = new Array(12).fill(0);
    const personel_degerler = new Array(12).fill(0);

    results.forEach(row => {
        const ay = parseInt(row.ay) || 0;
        const toplam = parseInt(row.toplam) || 0;
        if (ay >= 1 && ay <= 12) {
            degerler[ay - 1] = toplam; // ay 1-12, array index 0-11
        }
    });

    // Personel verilerini işle
    if (personelResults && personelResults.length > 0) {
        personelResults.forEach(row => {
            const ay = parseInt(row.ay) || 0;
            const personel = parseInt(row.personel_sayisi) || 0;
            if (ay >= 1 && ay <= 12) {
                personel_degerler[ay - 1] = personel; // ay 1-12, array index 0-11
            }
        });
    }

    return {
        aylar: aylar,
        degerler: degerler,
        personel_degerler: personel_degerler
    };
}

// Yardımcı fonksiyon: Otel karşılaştırması formatla
function formatOtelKarsilastirma(results) {
    const oteller = [];
    const toplamlar = [];

    results.forEach(row => {
        oteller.push(row.otel_adi || `Otel ${row.otel_id} `);
        toplamlar.push(parseInt(row.toplam) || 0);
    });

    return {
        oteller: oteller,
        toplamlar: toplamlar
    };
}

module.exports = MusteriModel;

