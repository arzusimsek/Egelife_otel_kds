const express = require("express");
const router = express.Router();
const controller = require("../controllers/otelController");

router.get("/", controller.anaSayfa);
router.get("/dashboard", controller.anaSayfa);
router.get("/oteller", controller.otelleriGetir);
router.get("/istatistik", controller.istatistikGetir);
router.get("/musteri-analizi", controller.musteriAnalizi);
router.get("/otel-analizi", controller.otelAnalizi);
router.get("/kampanya-analizi", controller.kampanyaAnalizi);
// Bu route'lar pageRoutes.js'de tanımlı
// router.get("/oda-analizi", controller.odaAnalizi);
// router.get("/kampanya-raporu", controller.kampanyaRaporu);
// router.get("/memnuniyet-raporu", controller.memnuniyetRaporu);

// API Routes
router.get("/api/yillara-gore-gelir-gider-kar", controller.yillaraGoreGelirGiderKar);
router.get("/api/otellerin-yillara-gore-kar", controller.otellerinYillaraGoreKar);
router.get("/api/musteri-tipi-dagilimi", controller.musteriTipiDagilimi);
router.get("/api/aylik-musteri-tipleri", controller.aylikMusteriTipleri);
router.get("/api/oteller", controller.apiOtelleriGetir);
console.log("Registering /api/personel-verimlilik route. Handler type:", typeof controller.getPersonelVerimlilik);
router.get("/api/personel-verimlilik", controller.getPersonelVerimlilik);

module.exports = router;

