const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");
const odaAnaliziController = require("../controllers/odaAnaliziController");

// Sidebar sayfaları için route'lar
router.get("/oda-analizi", odaAnaliziController.odaAnaliziSayfasi);

// Oda Analizi API Routes
router.get("/api/oda/treemap/:yil/:otel", odaAnaliziController.getTreemapOdaTipi);
router.get("/api/oda/aylik/:yil/:otel", odaAnaliziController.getAylikOdaTipiDagilimi);
router.get("/api/oda/kapasite-karari", odaAnaliziController.getOdaKapasiteKarari);

router.get("/kampanya-raporu", pageController.kampanyaRaporu);

// Kampanya Analizi API Routes
const KampanyaModel = require("../models/KampanyaModel");
router.get("/api/kampanya/analiz", (req, res) => {
    const filters = {
        kampanyaAdi: req.query.kampanya_adi || '',
        etkiSeviyesi: req.query.etki_seviyesi || '',
        otelId: req.query.otel_id || '',
        page: req.query.page || 1,
        limit: req.query.limit || 8
    };

    console.log('Kampanya Analiz API - Filtreler:', JSON.stringify(filters));

    KampanyaModel.getKampanyaAnalizTablosu(filters, (err, results) => {
        if (err) {
            console.error("Kampanya analiz API hatası:", err);
            return res.status(500).json({
                error: "Veritabanı hatası",
                message: err.message
            });
        }
        console.log('Kampanya Analiz API - Sonuç:', results.total, 'kayıt bulundu');
        res.json(results || { data: [], total: 0, page: 1, limit: 8, totalPages: 0 });
    });
});

router.get("/memnuniyet-raporu", pageController.memnuniyetRaporu);

// Memnuniyet Analizi API Routes
const MemnuniyetModel = require("../models/MemnuniyetModel");
router.get("/api/memnuniyet/korelasyon", (req, res) => {
    const { otel_id, yil } = req.query;

    if (!otel_id || !yil) {
        return res.status(400).json({
            error: "Eksik parametre",
            message: "otel_id ve yil parametreleri gerekli"
        });
    }

    MemnuniyetModel.getYorumSayisiMemnuniyetKorelasyonu(otel_id, yil, (err, results) => {
        if (err) {
            console.error("Memnuniyet korelasyon API hatası:", err);
            return res.status(500).json({
                error: "Veritabanı hatası",
                message: err.message
            });
        }
        res.json(results || []);
    });
});

router.get("/api/memnuniyet/trend", (req, res) => {
    const { otel_id, yil } = req.query;

    console.log("Memnuniyet trend API isteği:", { otel_id, yil });

    if (!otel_id || !yil) {
        return res.status(400).json({
            error: "Eksik parametre",
            message: "otel_id ve yil parametreleri gerekli"
        });
    }

    MemnuniyetModel.getYorumTrendData(otel_id, yil, (err, results) => {
        if (err) {
            console.error("Memnuniyet trend API hatası:", err);
            return res.status(500).json({
                error: "Veritabanı hatası",
                message: err.message
            });
        }

        console.log("Memnuniyet trend API sonuç:", results ? results.length : 0, "kayıt");
        res.json(results || []);
    });
});

// YENİ: Taktiksel Karar Destek API
router.get("/api/memnuniyet/detayli-analiz", (req, res) => {
    const { otel_id, yil } = req.query;

    if (!otel_id || !yil) {
        return res.status(400).json({ error: "Eksik parametre" });
    }

    MemnuniyetModel.getMemnuniyetDetayliAnaliz(otel_id, yil, (err, results) => {
        if (err) {
            console.error("Detaylı analiz API hatası:", err);
            return res.status(500).json({ error: "Veritabanı hatası" });
        }
        res.json(results);
    });
});

// Debug için: Tüm route'ları logla
console.log("✓ Page Routes yüklendi:");
console.log("  - GET /oda-analizi");
console.log("  - GET /kampanya-raporu");
console.log("  - GET /memnuniyet-raporu");
console.log("  - GET /api/memnuniyet/detayli-analiz");

module.exports = router;
