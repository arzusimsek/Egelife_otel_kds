const express = require("express");
const router = express.Router();
const controller = require("../controllers/dashboardController");

// Dashboard sayfaları
router.get("/dashboard", controller.anaSayfa);
router.get("/", controller.anaSayfa);
router.get("/musteri-analizi", controller.musteriAnalizi);
// Bu route'lar pageRoutes.js'de tanımlı
// router.get("/oda-analizi", controller.odaAnalizi);
// router.get("/kampanya-raporu", controller.kampanyaRaporu);
// router.get("/memnuniyet-raporu", controller.memnuniyetRaporu);

// API Routes - Müşteri Analizi (mevcut)
router.get("/api/musteri-tipi-dagilimi", require("../controllers/otelController").musteriTipiDagilimi);
router.get("/api/aylik-musteri-tipleri", require("../controllers/otelController").aylikMusteriTipleri);

// API Routes - Oda Analizi
router.get("/api/oda-doluluk-orani", controller.apiOdaDolulukOrani);
router.get("/api/oda-tipi-dagilimi", controller.apiOdaTipiDagilimi);
router.get("/api/otellere-gore-doluluk", controller.apiOtellereGoreDoluluk);

// API Routes - Kampanya Raporu
router.get("/api/kampanya-performansi", controller.apiKampanyaPerformansi);
router.get("/api/aylik-kampanya-gelirleri", controller.apiAylikKampanyaGelirleri);
router.get("/api/kampanya-turu-dagilimi", controller.apiKampanyaTuruDagilimi);

// API Routes - Memnuniyet Raporu
router.get("/api/memnuniyet-skorlari", controller.apiMemnuniyetSkorlari);
router.get("/api/otellere-gore-memnuniyet", controller.apiOtellereGoreMemnuniyet);
router.get("/api/memnuniyet-kategori-dagilimi", controller.apiMemnuniyetKategoriDagilimi);

// API Routes - Diğer (mevcut)
router.get("/api/yillara-gore-gelir-gider-kar", require("../controllers/otelController").yillaraGoreGelirGiderKar);
router.get("/api/otellerin-yillara-gore-kar", require("../controllers/otelController").otellerinYillaraGoreKar);
router.get("/api/otellerin-detayli-finansal-verisi", require("../controllers/otelController").otellerinDetayliFinansalVerisi);
router.get("/api/otellerin-aylik-finansal-verisi", require("../controllers/otelController").otellerinAylikFinansalVerisi);
router.get("/api/oteller", require("../controllers/otelController").apiOtelleriGetir);

// KPI API endpoint'i
router.get("/api/kpi-2025", controller.apiKPI2025);

module.exports = router;

