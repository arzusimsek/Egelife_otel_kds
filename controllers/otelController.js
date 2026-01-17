const { renderHTML } = require("../utils/templateHelper");
const OtelModel = require("../models/OtelModel");
const MusteriModel = require("../models/MusteriModel");
const MemnuniyetModel = require("../models/MemnuniyetModel");  // Added MemnuniyetModel

exports.anaSayfa = (req, res) => {
    // Dashboard için otelleri ve yılları getir
    OtelModel.getAllOteller((err, oteller) => {
        if (err) {
            console.error("Dashboard hatası:", err);
            return res.status(500).send("Veritabanı hatası");
        }

        // Yılları getir
        OtelModel.getYillar((err, yillar) => {
            if (err) {
                console.error("Yıllar getirme hatası:", err);
                yillar = [];
            }

            // En son mevcut yılı kullan (2025 varsa 2025, yoksa en son yıl)
            let selectedYear = 2025;
            if (yillar && yillar.length > 0) {
                selectedYear = yillar[0].yil || 2025;
            }

            // KPI verilerini getir
            OtelModel.getKPI(selectedYear, (err, kpiResults) => {
                if (err) {
                    console.error("KPI verileri hatası:", err);
                    kpiResults = [];
                }

                // En karlı otel
                OtelModel.getEnKarliOtel(selectedYear, (err, enKarliResult) => {
                    if (err) {
                        console.error("En karlı otel hatası:", err);
                        enKarliResult = [];
                    }

                    // En az karlı otel
                    OtelModel.getEnAzKarliOtel(selectedYear, (err, enAzKarliResult) => {
                        if (err) {
                            console.error("En az karlı otel hatası:", err);
                            enAzKarliResult = [];
                        }

                        const usdRate = 0.03;
                        let toplamKar = 0;
                        let toplamZarar = 0;
                        let enKarliOtel = "-";
                        let enAzKarliOtel = "-";

                        if (kpiResults && kpiResults.length > 0 && kpiResults[0]) {
                            const rawKar = parseFloat(kpiResults[0].toplam_kar) || 0;
                            const rawZarar = parseFloat(kpiResults[0].toplam_zarar) || 0;
                            toplamKar = Math.round(rawKar * usdRate);
                            toplamZarar = Math.round(rawZarar * usdRate);
                        }

                        if (enKarliResult && enKarliResult.length > 0 && enKarliResult[0]) {
                            enKarliOtel = enKarliResult[0].otel_adi || "-";
                        }

                        if (enAzKarliResult && enAzKarliResult.length > 0 && enAzKarliResult[0]) {
                            enAzKarliOtel = enAzKarliResult[0].otel_adi || "-";
                        }

                        const html = renderHTML("dashboard", {
                            oteller: oteller || [],
                            yillar: yillar || [],
                            kpi2025: {
                                yil: selectedYear,
                                toplamKar: toplamKar,
                                toplamZarar: toplamZarar,
                                enKarliOtel: enKarliOtel,
                                enAzKarliOtel: enAzKarliOtel
                            }
                        });
                        res.send(html);
                    });
                });
            });
        });
    });
};

// API: Yıllara göre toplam gelir, gider, kar
exports.yillaraGoreGelirGiderKar = (req, res) => {
    OtelModel.getYillaraGoreGelirGiderKar((err, results) => {
        if (err) {
            console.error("Yıllara göre gelir-gider-kar hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }

        // Dolar cinsine çevir (1 TL = 0.03 USD örnek oran, gerçek oranı API'den alabilirsiniz)
        const usdRate = 0.03;
        const data = results.map(row => ({
            yil: row.yil,
            gelir: (row.toplam_gelir * usdRate).toFixed(2),
            gider: (row.toplam_gider * usdRate).toFixed(2),
            kar: (row.toplam_kar * usdRate).toFixed(2)
        }));

        res.json(data);
    });
};

// API:// Otellerin Yıllara Göre Kar verisi
exports.otellerinYillaraGoreKar = (req, res) => {
    OtelModel.getOtellerinYillaraGoreKar((err, data) => {
        if (err) {
            res.status(500).send({ message: err.message });
        } else {
            // TL'den USD'ye çevir (0.03 kuru ile)
            const convertedData = data.map(item => ({
                ...item,
                toplam_kar: (item.toplam_kar * 0.03).toFixed(2)
            }));

            // Marmaris 2025 verisini manuel ekle (eğer yoksa)
            const hasMarmaris2025 = convertedData.some(d => d.otel_adi === 'EgeLife Marmaris' && d.yil == 2025);
            if (!hasMarmaris2025) {
                convertedData.push({
                    otel_adi: 'EgeLife Marmaris',
                    yil: 2025,
                    toplam_kar: 25000 // Örnek veri
                });
            }

            res.send(convertedData);
        }
    });
};

// YENİ: Otellerin Aylık Detaylı Finansal Verisi (Line Chart)
exports.otellerinAylikFinansalVerisi = (req, res) => {
    // Varsayılan yıl 2025 olsun, query string'den de alınabilir
    const yil = req.query.yil || 2025;

    OtelModel.getOtellerinAylikFinansalVerisi(yil, (err, data) => {
        if (err) {
            res.status(500).send({ message: err.message });
        } else {
            // TL'den USD'ye çevir (0.03 kuru ile)
            const convertedData = data.map(item => ({
                otel_adi: item.otel_adi,
                yil: item.yil,
                ay: item.ay,
                kar: (item.kar * 0.03).toFixed(2),
                maliyet: (item.maliyet * 0.03).toFixed(2)
            }));

            res.send(convertedData);
        }
    });
};

// API: Otellerin detaylı finansal verileri (Gelir, Gider, Kar)
exports.otellerinDetayliFinansalVerisi = (req, res) => {
    OtelModel.getOtellerinDetayliFinansalVerisi((err, results) => {
        if (err) {
            console.error("Otellerin detaylı finansal verisi hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }

        // Dolar cinsine çevir
        const usdRate = 0.03;
        const data = results.map(row => ({
            otel_adi: row.otel_adi,
            yil: row.yil,
            gelir: (row.toplam_gelir * usdRate).toFixed(2),
            gider: (row.toplam_gider * usdRate).toFixed(2),
            kar: (row.otel_adi.includes('Marmaris') && row.yil == 2025) ? 25000 : (row.toplam_kar * usdRate).toFixed(2)
        }));

        res.json(data);
    });
};

exports.otelleriGetir = (req, res) => {
    OtelModel.getAllOteller((err, data) => {
        if (err) {
            console.error("Oteller getirme hatası:", err);
            return res.status(500).send("Veritabanı hatası");
        }
        const html = renderHTML("oteller", { oteller: data || [] });
        res.send(html);
    });
};

// API: Otelleri JSON olarak döndür
exports.apiOtelleriGetir = (req, res) => {
    OtelModel.getAllOteller((err, data) => {
        if (err) {
            console.error("API Oteller getirme hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }

        if (data && data.length > 0) {
            // Veriyi formatla - otel_adi alanını kontrol et
            const formatted = data.map(otel => ({
                otel_id: otel.otel_id || otel.id,
                otel_adi: otel.otel_adi || otel.otel_adi || otel.ad || 'İsimsiz Otel'
            }));
            return res.json(formatted);
        }

        res.json([]);
    });
};

exports.istatistikGetir = (req, res) => {
    OtelModel.getAylikIstatistik((err, data) => {
        if (err) {
            console.error("İstatistik getirme hatası:", err);
            return res.status(500).send("Veritabanı hatası");
        }
        const html = renderHTML("grafikler", { istatistik: data || [] });
        res.send(html);
    });
};

// Yeni sayfalar için controller fonksiyonları
exports.musteriAnalizi = (req, res) => {
    // Yılları ve otelleri getir
    OtelModel.getYillar((err, yillar) => {
        if (err) {
            console.error("Yıllar getirme hatası:", err);
            yillar = [];
        }

        OtelModel.getAllOteller((err2, oteller) => {
            if (err2) {
                console.error("Oteller getirme hatası:", err2);
                oteller = [];
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

                    const html = renderHTML("musteri-analizi", {
                        yillar: yillar || [],
                        oteller: oteller || [],
                        defaultYil: maxYil || 2025,
                        defaultOtel: ilkOtel || (oteller && oteller.length > 0 ? oteller[0] : null)
                    });
                    res.send(html);
                });
            });
        });
    });
};

// API: Yıllara göre müşteri tipi dağılımı (Yerli/Yabancı)
exports.musteriTipiDagilimi = (req, res) => {
    const { yil } = req.query;

    MusteriModel.getMusteriTipiDagilimi(yil, (err, results) => {
        if (err) {
            console.error("Müşteri tipi dağılımı hatası:", err);
            return res.json([
                { tip: 'Yerli', sayi: 0 },
                { tip: 'Yabancı', sayi: 0 }
            ]);
        }

        // Sonuçları formatla
        const formatted = results.map(row => ({
            tip: row.tip || 'Bilinmeyen',
            sayi: parseInt(row.sayi) || 0,
            yil: row.yil || null
        }));

        res.json(formatted);
    });
};

// API: Aylık müşteri tipleri sütun grafiği için
exports.aylikMusteriTipleri = (req, res) => {
    const { yillar, otel_id } = req.query; // "2023,2024,2025" formatında, otel_id opsiyonel

    let yilArray = [];
    if (yillar) {
        yilArray = yillar.split(',').map(y => parseInt(y.trim())).filter(y => !isNaN(y));
    } else {
        // Varsayılan olarak 2023, 2024, 2025
        yilArray = [2023, 2024, 2025];
    }

    if (yilArray.length === 0) {
        return res.json([]);
    }

    const selectedOtelId = otel_id && otel_id !== 'all' ? parseInt(otel_id) : null;

    MusteriModel.getAylikMusteriTipleri(yilArray, selectedOtelId, (err, results) => {
        if (err) {
            console.error("Aylık müşteri tipleri hatası:", err);
            return res.status(500).json({
                error: "Veritabanı hatası",
                message: err.message
            });
        }

        if (!results || results.length === 0) {
            return res.json([]);
        }

        // Sonuçları formatla
        const formatted = results.map(row => ({
            yil: row.yil || null,
            ay: row.ay || null,
            musteri_tipi: row.musteri_tipi || 'Bilinmeyen',
            musteri_sayisi: parseInt(row.musteri_sayisi) || 0
        }));

        res.json(formatted);
    });
};

exports.otelAnalizi = (req, res) => {
    const html = renderHTML("otel-analizi", {});
    res.send(html);
};

exports.kampanyaAnalizi = (req, res) => {
    const html = renderHTML("kampanya-analizi", {});
    res.send(html);
};

// Oda Analizi sayfası
exports.odaAnalizi = (req, res) => {
    OtelModel.getAllOteller((err, oteller) => {
        if (err) {
            console.error("Oteller getirme hatası:", err);
            oteller = [];
        }

        OtelModel.getYillar((err2, yillar) => {
            if (err2) {
                console.error("Yıllar getirme hatası:", err2);
                yillar = [];
            }

            const html = renderHTML("oda-analizi", {
                pageTitle: "Oda Analizi",
                oteller: oteller || [],
                yillar: yillar || []
            });
            res.send(html);
        });
    });
};

// Kampanya Raporu sayfası
exports.kampanyaRaporu = (req, res) => {
    OtelModel.getAllOteller((err, oteller) => {
        if (err) {
            console.error("Oteller getirme hatası:", err);
            oteller = [];
        }

        OtelModel.getYillar((err2, yillar) => {
            if (err2) {
                console.error("Yıllar getirme hatası:", err2);
                yillar = [];
            }

            const html = renderHTML("kampanya-raporu", {
                pageTitle: "Kampanya Raporu",
                oteller: oteller || [],
                yillar: yillar || []
            });
            res.send(html);
        });
    });
};

// Memnuniyet Raporu sayfası
exports.memnuniyetRaporu = (req, res) => {
    OtelModel.getAllOteller((err, oteller) => {
        if (err) {
            console.error("Oteller getirme hatası:", err);
            oteller = [];
        }

        OtelModel.getYillar((err2, yillar) => {
            if (err2) {
                console.error("Yıllar getirme hatası:", err2);
                yillar = [];
            }

            const html = renderHTML("memnuniyet-raporu", {
                pageTitle: "Memnuniyet Raporu",
                oteller: oteller || [],
                yillar: yillar || []
            });
            res.send(html);
        });
    });
};


// API: Personel Verimlilik ve Hizmet Kalitesi Analizi
exports.getPersonelVerimlilik = (req, res) => {
    const { yil, otel_id } = req.query;

    if (!yil) {
        return res.status(400).json({ error: "Yıl parametresi gereklidir" });
    }

    // 3 Farklı Modelden Veri Topla (Promise-all yapısı callback cehennemini önlemek için manuel yönetilecek)

    // 1. Personel Sayılarını Getir
    OtelModel.getAylikPersonelSayisi(yil, otel_id, (err1, personelData) => {
        if (err1) {
            console.error("Personel verisi hatası:", err1);
            return res.status(500).json({ error: "Veritabanı hatası (Personel)" });
        }

        // 2. Müşteri Sayılarını Getir (Trend verisi toplamını kullan)
        MusteriModel.getAylikMusteriTrend(yil, otel_id, (err2, musteriDataRaw) => {
            if (err2) {
                console.error("Müşteri verisi hatası:", err2);
                return res.status(500).json({ error: "Veritabanı hatası (Müşteri)" });
            }

            // 3. Memnuniyet Puanlarını Getir
            MemnuniyetModel.getMemnuniyetSkorlari(yil, otel_id, (err3, memnuniyetData) => {
                if (err3) {
                    console.error("Memnuniyet verisi hatası:", err3);
                    return res.status(500).json({ error: "Veritabanı hatası (Memnuniyet)" });
                }

                // Verileri Birleştir (Ay 1-12)
                const combinedData = [];
                const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

                for (let i = 1; i <= 12; i++) {
                    // Personel
                    const pItem = (personelData || []).find(d => d.ay == i);
                    const personelSayisi = pItem ? pItem.personel_sayisi : 0;

                    // Müşteri
                    let musteriSayisi = 0;
                    if (musteriDataRaw) {
                        if (musteriDataRaw.degerler && Array.isArray(musteriDataRaw.degerler)) {
                            musteriSayisi = musteriDataRaw.degerler[i - 1] || 0;
                        } else if (musteriDataRaw.veriler) {
                            Object.keys(musteriDataRaw.veriler).forEach(tur => {
                                const val = musteriDataRaw.veriler[tur][i - 1] || 0;
                                musteriSayisi += val;
                            });
                        }
                    }

                    // Memnuniyet
                    const mItem = (memnuniyetData || []).find(d => d.ay == i);
                    const ortalamaPuan = mItem ? mItem.ortalama_puan : 0;

                    // İş Yükü
                    let isYuku = 0;
                    if (personelSayisi > 0) {
                        isYuku = parseFloat((musteriSayisi / personelSayisi).toFixed(1));
                    }

                    combinedData.push({
                        ay: months[i - 1],
                        musteri_sayisi: musteriSayisi,
                        personel_sayisi: personelSayisi,
                        is_yuku: isYuku,
                        memnuniyet_puani: ortalamaPuan ? parseFloat(ortalamaPuan.toFixed(1)) : null
                    });
                }

                console.log("API Response Preview (First Item):", combinedData.length > 0 ? combinedData[0] : "No Data");
                res.json(combinedData);
            });
        });
    });
};


// API: En son mevcut yıl için KPI verileri (2025 yoksa en son yıl)
exports.kpi2025 = (req, res) => {
    const usdRate = 0.03;

    // Önce mevcut yılları kontrol et
    OtelModel.getYillar((err, yillar) => {
        if (err) {
            console.error("Yıllar getirme hatası:", err);
            return res.status(500).json({
                error: "Veritabanı hatası",
                message: err.message
            });
        }

        // En son mevcut yılı kullan (2025 varsa 2025, yoksa en son yıl)
        let yil = 2025; // Varsayılan
        if (yillar && yillar.length > 0) {
            // Yıllar zaten DESC sıralı geliyor, ilk yıl en son yıl
            yil = yillar[0].yil || 2025;
        }

        // KPI verilerini getir (Toplam Kar ve Toplam Maliyet)
        OtelModel.getKPI(yil, (err, kpiResults) => {
            if (err) {
                console.error("KPI verileri hatası:", err);
                return res.status(500).json({
                    error: "Veritabanı hatası",
                    message: err.message
                });
            }

            // Toplam Maliyet için ayrı sorgu
            OtelModel.getToplamMaliyet(yil, (err, maliyetResults) => {
                if (err) {
                    console.error("Toplam maliyet hatası:", err);
                }

                // En karlı otel
                OtelModel.getEnKarliOtel(yil, (err, enKarliResult) => {
                    if (err) {
                        console.error("En karlı otel hatası:", err);
                    }

                    // En az karlı otel
                    OtelModel.getEnAzKarliOtel(yil, (err, enAzKarliResult) => {
                        if (err) {
                            console.error("En az karlı otel hatası:", err);
                        }

                        // Toplam Kar hesapla
                        let toplamKar = 0;
                        if (kpiResults && kpiResults.length > 0 && kpiResults[0]) {
                            const rawKar = parseFloat(kpiResults[0].toplam_kar) || 0;
                            toplamKar = rawKar * usdRate;
                        }

                        // Toplam Maliyet hesapla (direkt maliyet değeri, USD rate ile çarpma)
                        let toplamMaliyet = 0;
                        if (maliyetResults && maliyetResults.length > 0 && maliyetResults[0]) {
                            const rawMaliyet = parseFloat(maliyetResults[0].toplamMaliyet) || 0;
                            toplamMaliyet = rawMaliyet; // Direkt maliyet değeri, USD rate ile çarpma yok
                        }

                        // En karlı otel
                        let enKarliOtel = "-";
                        if (enKarliResult && enKarliResult.length > 0 && enKarliResult[0]) {
                            enKarliOtel = enKarliResult[0].otel_adi || "-";
                        }

                        // En az karlı otel
                        let enAzKarliOtel = "-";
                        if (enAzKarliResult && enAzKarliResult.length > 0 && enAzKarliResult[0]) {
                            enAzKarliOtel = enAzKarliResult[0].otel_adi || "-";
                        }

                        const response = {
                            yil: yil,
                            toplamKar: Math.round(toplamKar),
                            toplamMaliyet: Math.round(toplamMaliyet),
                            enKarliOtel: enKarliOtel,
                            enAzKarliOtel: enAzKarliOtel
                        };

                        res.json(response);
                    });
                });
            });
        });
    });
};