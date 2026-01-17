/**
 * Page Controller - Sidebar sayfaları için
 * EJS template engine kullanarak sayfaları render eder
 */

/**
 * Müşteri Analizi sayfası
 */
exports.musteriAnalizi = (req, res) => {
    try {
        console.log("Müşteri Analizi sayfası isteği alındı");
        const OtelModel = require("../models/OtelModel");
        
        // Yılları ve otelleri getir
        OtelModel.getYillar((err1, yillar) => {
            if (err1) {
                console.error("Yıllar getirme hatası:", err1);
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
                        
                        res.render('musteri-analizi', {
                            pageTitle: 'Müşteri Analizi',
                            yillar: yillar || [],
                            oteller: oteller || [],
                            defaultYil: maxYil || 2025,
                            defaultOtel: ilkOtel || (oteller && oteller.length > 0 ? oteller[0] : null)
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error("Müşteri Analizi sayfası render hatası:", error);
        res.status(500).send("Sayfa yüklenirken bir hata oluştu: " + error.message);
    }
};

/**
 * Oda Analizi sayfası
 */
exports.odaAnalizi = (req, res) => {
    try {
        console.log("Oda Analizi sayfası isteği alındı");
        const OtelModel = require("../models/OtelModel");
        
        // KPI verilerini çek
        OtelModel.getToplamOdaSayisi((err1, toplamResult) => {
            if (err1) {
                console.error("Toplam oda sayısı hatası:", err1);
            }
            
            OtelModel.getEnFazlaOdayaSahipOtel((err2, enFazlaResult) => {
                if (err2) {
                    console.error("En fazla odaya sahip otel hatası:", err2);
                }
                
                OtelModel.getEnAzOdayaSahipOtel((err3, enAzResult) => {
                    if (err3) {
                        console.error("En az odaya sahip otel hatası:", err3);
                    }
                    
                    OtelModel.getOrtalamaOdaSayisi((err4, ortalamaResult) => {
                        if (err4) {
                            console.error("Ortalama oda sayısı hatası:", err4);
                        }
                        
                        // KPI verilerini formatla
                        const toplamOda = toplamResult && toplamResult.length > 0 ? (toplamResult[0].toplamOdaSayisi || 0) : 0;
                        const enFazlaOtel = enFazlaResult && enFazlaResult.length > 0 ? (enFazlaResult[0].otel_adi || "-") : "-";
                        const enAzOtel = enAzResult && enAzResult.length > 0 ? (enAzResult[0].otel_adi || "-") : "-";
                        const ortalamaOda = ortalamaResult && ortalamaResult.length > 0 ? (parseFloat(ortalamaResult[0].ortalamaOdaSayisi) || 0) : 0;
                        
                        res.render('oda-analizi', {
                            pageTitle: 'Oda Analizi',
                            kpiData: {
                                toplamOdaSayisi: Math.round(toplamOda),
                                enFazlaOdayaSahipOtel: enFazlaOtel,
                                enAzOdayaSahipOtel: enAzOtel,
                                ortalamaOdaSayisi: Math.round(ortalamaOda)
                            }
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
 * Oda Analizi API: Otellerin oda sayıları (Bar chart için)
 */
exports.getOtellerOdaSayilari = (req, res) => {
    try {
        const OtelModel = require("../models/OtelModel");
        
        OtelModel.getOtellerOdaSayilari((err, results) => {
            if (err) {
                console.error("Oteller oda sayıları hatası:", err);
                return res.status(500).json({ 
                    error: true,
                    message: err.message || "Veritabanı hatası"
                });
            }
            
            const formatted = {
                oteller: (results || []).map(row => row.otel_adi || "-"),
                odaSayilari: (results || []).map(row => parseInt(row.oda_sayisi) || 0)
            };
            
            res.json(formatted);
        });
    } catch (err) {
        console.error("Oteller oda sayıları beklenmeyen hatası:", err);
        res.status(500).json({ 
            error: true,
            message: err.message || "Beklenmeyen hata oluştu"
        });
    }
};

/**
 * Kampanya Raporu sayfası
 */
exports.kampanyaRaporu = (req, res) => {
    try {
        const OtelModel = require("../models/OtelModel");
        
        // Otelleri getir (filtreleme için)
        OtelModel.getAllOteller((err, oteller) => {
            if (err) {
                console.error("Oteller getirme hatası:", err);
                oteller = [];
            }
            
            res.render('kampanya-raporu', {
                pageTitle: 'Kampanya Analizi',
                oteller: oteller || []
            });
        });
    } catch (error) {
        console.error("Kampanya Raporu sayfası render hatası:", error);
        res.status(500).send("Sayfa yüklenirken bir hata oluştu: " + error.message);
    }
};

/**
 * Memnuniyet Raporu sayfası
 */
exports.memnuniyetRaporu = (req, res) => {
    try {
        const MemnuniyetModel = require("../models/MemnuniyetModel");
        const OtelModel = require("../models/OtelModel");
        
        // Otellere göre ortalama memnuniyet puanlarını getir
        MemnuniyetModel.getOtellereGoreOrtalamaMemnuniyet((err, results) => {
            if (err) {
                console.error("Memnuniyet puanları getirme hatası:", err);
                results = [];
            }
            
            // Oteller ve yılları getir (scatter plot filtreleri için)
            OtelModel.getAllOteller((errOteller, oteller) => {
                if (errOteller) {
                    console.error("Oteller getirme hatası:", errOteller);
                    oteller = [];
                }
                
                OtelModel.getYillar((errYillar, yillar) => {
                    if (errYillar) {
                        console.error("Yıllar getirme hatası:", errYillar);
                        yillar = [];
                    }
                    
                    res.render('memnuniyet-raporu', {
                        pageTitle: 'Müşteri Memnuniyeti',
                        otelMemnuniyetleri: results || [],
                        oteller: oteller || [],
                        yillar: yillar || []
                    });
                });
            });
        });
    } catch (error) {
        console.error("Memnuniyet Raporu sayfası render hatası:", error);
        res.status(500).render('memnuniyet-raporu', {
            pageTitle: 'Müşteri Memnuniyeti',
            otelMemnuniyetleri: [],
            oteller: [],
            yillar: []
        });
    }
};


