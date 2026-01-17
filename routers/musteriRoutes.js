const express = require("express");
const router = express.Router();
const musteriController = require("../controllers/musteriController");

// API Routes
// ÖNEMLİ: Daha spesifik route'lar (alt route'lar) önce tanımlanmalı!
// Grafik 1: Yıl bazında Yerli/Yabancı müşteri toplamı
router.get("/api/musteri/yerli-yabanci", musteriController.getYerliYabanciAnalizi);

// Grafik 2: Yıl + Otel bazında 7 müşteri türü dağılımı
router.get("/api/musteri/tur-dagilimi", musteriController.getTurDagilimiAnalizi);

// Stacked Bar Chart: Aylık müşteri türleri dağılımı
router.get("/api/musteri/aylik-musteri-turleri", musteriController.getAylikMusteriTurleri);

// Line Chart: Aylık müşteri trend
router.get("/api/musteri/aylik-trend", musteriController.getAylikMusteriTrend);

// Bar Chart: Yıllık otel karşılaştırması (MVC yapısına uygun)
router.get("/api/musteri/otel-karsilastirma", musteriController.getOtelKarsilastirma);

// Radar Chart: Kampanya etki analizi (ARTIK KULLANILMIYOR AMA DURABİLİR)
router.get("/api/musteri/kampanya-etkisi", musteriController.getKampanyaEtkiAnalizi);

// YENİ: Oda Tercih Analizi (Grouped Bar)
router.get("/api/musteri/oda-tercihleri", musteriController.getOdaTercihAnalizi);

// Taktiksel Karar Destek API
router.get("/api/musteri/taktiksel-kararlar", musteriController.getTaktikselKararlar);

// Müşteri Kârlılık Analizi API
router.get("/api/musteri/karlilik-analizi", musteriController.getMusteriKarlilikAnalizi);

// Diğer API Routes (genel route'lar sonra gelmeli)
router.get("/api/yerli-yabanci-dagilimi", musteriController.getYerliYabanciDagilimi);
router.get("/api/genel-musteri-dagilimi", musteriController.getGenelMusteriDagilimi);
router.get("/api/musteri-analizi", musteriController.getMusteriAnaliziData);
router.get("/api/musteri-tur", musteriController.getMusteriTur);

// Eski endpoint'ler (geriye uyumluluk için)
router.get("/api/musteri-tur-yil", musteriController.getMusteriTurYil);
router.get("/api/musteri-tur-otel", musteriController.getMusteriTurOtel);

module.exports = router;

