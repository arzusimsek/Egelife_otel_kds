const OdaModel = require("../models/OdaModel");
const OtelModel = require("../models/OtelModel");

/**
 * Oda Analizi sayfası
 */
exports.odaAnaliziSayfasi = async (req, res) => {
    try {
        // Otelleri, oda tiplerini, en büyük yılı ve ilk oteli getir
        OtelModel.getAllOteller((err1, oteller) => {
            if (err1) {
                console.error("Oteller getirme hatası:", err1);
                oteller = [];
            }

            OdaModel.getOdaTipleri((err2, odaTipleri) => {
                if (err2) {
                    console.error("Oda tipleri getirme hatası:", err2);
                    odaTipleri = [];
                }

                OtelModel.getEnBuyukYil((err3, maxYil) => {
                    if (err3) {
                        console.error("En büyük yıl getirme hatası:", err3);
                        maxYil = 2025;
                    }

                    OtelModel.getIlkOtel((err4, ilkOtel) => {
                        if (err4) {
                            console.error("İlk otel getirme hatası:", err4);
                            ilkOtel = null;
                        }

                        res.render('oda-analizi', {
                            pageTitle: 'Oda Analizleri',
                            oteller: oteller || [],
                            odaTipleri: odaTipleri || [],
                            defaultYil: maxYil || 2025,
                            defaultOtel: ilkOtel || (oteller && oteller.length > 0 ? oteller[0] : null),
                            yillar: [2023, 2024, 2025] // Yılları da gönder
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error("Oda Analizi sayfası render hatası:", error);
        res.status(500).send("Sayfa yüklenirken bir hata oluştu: " + error.message);
    }
};

/**
 * API: Bar Chart - Yıllık Oda Tipi Popülerliği
 * GET /api/oda/treemap/:yil/:otel
 */
exports.getTreemapOdaTipi = (req, res) => {
    try {
        const yil = parseInt(req.params.yil);
        const otelId = parseInt(req.params.otel);

        if (!yil || !otelId) {
            return res.status(400).json({ error: true, message: "Yıl ve otel ID parametreleri gerekli" });
        }

        // NOT: Otel ID parametresi kâr marjı için kullanılmıyor (şimdilik)
        // Çünkü oda_karlilik_verileri tablosunda otel_id yok.
        // Ancak yine de hata vermemesi için otel kontrolünü esnek tutabiliriz.

        OdaModel.getYillikOdaKarMarji(yil, otelId, (err, results) => {
            if (err) {
                console.error("Yıllık oda tipi kâr marjı veri hatası:", err);
                return res.status(500).json({ error: true, message: err.message });
            }

            // Bar chart için format
            const data = (results || []).map(row => ({
                oda_tipi_adi: row.oda_tipi_adi || "-",
                toplam: parseFloat(row.toplam) || 0 // Kar Marjı (%)
            }));

            res.json({ data: data });
        });
    } catch (err) {
        console.error("Yıllık oda tipi popülerliği endpoint hatası:", err);
        res.status(500).json({ error: true, message: err.message });
    }
};

/**
 * API: Aylık Oda Tipi Dağılımı (Stacked Bar)
 * GET /api/oda/aylik/:yil/:otel
 */
exports.getAylikOdaTipiDagilimi = (req, res) => {
    try {
        const yil = parseInt(req.params.yil);
        const otelId = parseInt(req.params.otel);

        if (!yil || !otelId) {
            return res.status(400).json({ error: true, message: "Yıl ve otel ID parametreleri gerekli" });
        }

        OdaModel.getAylikOdaTipiDagilimi(yil, otelId, (err, results) => {
            if (err) {
                console.error("Aylık dağılım veri hatası:", err);
                return res.status(500).json({ error: true, message: err.message });
            }

            // Stacked bar için format: { aylar: [...], datasets: [{ oda_tipi_id: X, oda_tipi_adi: "...", data: [...] }] }
            const aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
            const odaTipiMap = {};

            (results || []).forEach(row => {
                const odaTipiId = row.oda_tipi_id;
                const odaTipiAdi = row.oda_tipi_adi || `Oda Tipi ${odaTipiId}`;
                if (!odaTipiMap[odaTipiId]) {
                    odaTipiMap[odaTipiId] = {
                        oda_tipi_id: odaTipiId,
                        oda_tipi_adi: odaTipiAdi,
                        data: new Array(12).fill(0)
                    };
                }
                const ayIndex = parseInt(row.ay) - 1;
                if (ayIndex >= 0 && ayIndex < 12) {
                    odaTipiMap[odaTipiId].data[ayIndex] = parseInt(row.toplam) || 0;
                }
            });

            const datasets = Object.values(odaTipiMap);

            res.json({ aylar: aylar, datasets: datasets });
        });
    } catch (err) {
        console.error("Aylık dağılım endpoint hatası:", err);
        res.status(500).json({ error: true, message: err.message });
    }
};


exports.getOdaKapasiteKarari = (req, res) => {
    const { yil, otel_id } = req.query;
    if (!yil || !otel_id) return res.status(400).json({ error: "Eksik parametre" });

    OdaModel.getOdaKarlilikAnalizi(yil, otel_id, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results || []);
    });
};
