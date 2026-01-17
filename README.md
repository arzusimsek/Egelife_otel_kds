# EgeLife Otel Karar Destek Sistemi

MVC yapısına uygun Node.js ve Express tabanlı karar destek sistemi.

## Proje Tanıtımı
Bu proje, EgeLife otel zincirine ait gelir, gider, doluluk, müşteri sayısı, oda tipi ve müşteri tipi verilerini analiz ederek yöneticilerin 12 aylık taktiksel kararlarını desteklemek amacıyla geliştirilmiş bir karar destek sistemidir. Sistem; aylara ve yıllara göre performans grafikleri, oteller arası karşılaştırmalar, kampanya etkisi analizleri, müşteri memnuniyeti değerlendirmeleri ve geleceğe yönelik gelir–doluluk tahminleri üretmektedir. Yönetici, seçtiği otel ve dönemlere göre filtreleme yaparak veri odaklı değerlendirmeler yapabilir ve işletme yönetimi için gerekli kararları planlayabilir.

## Senaryo Tanımı

Bu projede, Türkiye’nin farklı turizm bölgelerinde faaliyet gösteren EgeLife Otelleri adlı bir otel zincirinin performansı analiz edilmiştir. Projenin amacı; otellerin müşteri davranışlarını, oda kullanım durumlarını, kampanya etkilerini ve genel finansal performanslarını veri tabanı destekli analizler ve görsel dashboardlar üzerinden incelemektir.
Proje kapsamında her otel için müşteri sayıları, oda kapasiteleri, kampanya bilgileri ve müşteri memnuniyetine ilişkin veriler tutulmuştur. Bu veriler kullanılarak otellerin aylık ve yıllık bazda gelirleri, kampanya öncesi ve sonrası müşteri değişimleri ve kâr–zarar durumları analiz edilmiştir.
Kampanya analizlerinde, kampanya uygulanmadan önceki ve sonraki müşteri sayıları ile gelirler karşılaştırılmış, kampanyaların satışlara ve kârlılığa olan etkisi ölçülmüştür. Gelir ve kâr analizleri, daha tutarlı ve karşılaştırılabilir sonuçlar elde edebilmek amacıyla gerçekleştirilmiştir.
Müşteri memnuniyeti analizinde, yalnızca 2025 yılına ait gerçekçi tarih bazlı memnuniyet puanları kullanılmıştır. Bu puanlar üzerinden otel bazında ortalama memnuniyet seviyeleri hesaplanmış ve müşteri memnuniyetinin gelir ve müşteri sayısı üzerindeki etkisi incelenmiştir.
Veri tabanında yer alan bazı hesaplamalar (kâr, kampanya etkisi, aylık istatistikler vb.) trigger mekanizmaları ile otomatik hale getirilmiştir. Böylece veri güncellendiğinde analiz sonuçlarının da otomatik olarak güncellenmesi sağlanmıştır.
Sonuç olarak bu proje, bir otel zincirinin operasyonel ve finansal performansını analiz edebilen, veri tabanı ile entegre çalışan ve görselleştirilmiş raporlar sunan karar destek sistemi niteliğindedir.

## Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Veritabanı Ayarlarını Yapın

`db/config.js` dosyasını açın ve MySQL ayarlarınızı güncelleyin:

```javascript
module.exports = {
    host: "localhost",
    user: "root",
    password: "şifreniz",  // MySQL şifrenizi buraya yazın
    database: "egelife_otel",  // Veritabanı adınızı buraya yazın
    // ...
};
```

### 3. Veritabanını Hazırlayın

MySQL'de `egelife_otel` veritabanını oluşturun ve gerekli tabloları ekleyin:
- `oteller`
- `kullanicilar`
- `aylik_istatistik`

## Çalıştırma

### Normal Mod (Production)

```bash
npm start
```

### Geliştirme Modu (Development - Otomatik yeniden başlatma)

```bash
npm run dev
```

Sunucu başladıktan sonra tarayıcınızda şu adresi açın:

**http://localhost:3000**

## Sayfalar

- `/` veya `/login` - Giriş sayfası
- `/dashboard` - Ana sayfa (Dashboard)
- `/musteri-analizi` - Müşteri Analizi
- `/otel-analizi` - Otel Analizi
- `/kampanya-analizi` - Kampanya Analizi

## Proje Yapısı

```
karardestek_proje/
├── controllers/          # Controller katmanı (iş mantığı)
│   ├── loginController.js
│   └── otelController.js
├── views/                # View katmanı (HTML dosyaları)
│   ├── login.html
│   ├── dashboard.html
│   ├── musteri-analizi.html
│   ├── otel-analizi.html
│   └── kampanya-analizi.html
├── db/                   # Model katmanı (veritabanı)
│   ├── config.js
│   ├── db.js
│   └── router/
├── utils/                # Yardımcı fonksiyonlar
│   └── templateHelper.js
├── public/               # Statik dosyalar (CSS, JS, resimler)
└── server.js             # Ana uygulama dosyası
```
## API Endpoint Listesi

/api/oda/treemap/:yil/:otel, /api/oda/aylik/:yil/:otel, /api/oda/kapasite-karari, /api/kampanya/analiz, /api/memnuniyet/korelasyon, /api/memnuniyet/trend, /api/memnuniyet/detayli-analiz, /api/yillara-gore-gelir-gider-kar, /api/otellerin-yillara-gore-kar, /api/musteri-tipi-dagilimi, /api/aylik-musteri-tipleri, /api/oteller, /api/personel-verimlilik, /api/musteri/yerli-yabanci, /api/musteri/tur-dagilimi, /api/musteri/aylik-musteri-turleri, /api/musteri/aylik-trend, /api/musteri/otel-karsilastirma, /api/musteri/kampanya-etkisi, /api/musteri/oda-tercihleri, /api/musteri/taktiksel-kararlar, /api/musteri/karlilik-analizi, /api/yerli-yabanci-dagilimi, /api/genel-musteri-dagilimi, /api/musteri-analizi, /api/musteri-tur, /api/musteri-tur-yil, /api/musteri-tur-otel, /api/oda-doluluk-orani, /api/oda-tipi-dagilimi, /api/otellere-gore-doluluk, /api/kampanya-performansi, /api/aylik-kampanya-gelirleri, /api/kampanya-turu-dagilimi, /api/memnuniyet-skorlari, /api/otellere-gore-memnuniyet, /api/memnuniyet-kategori-dagilimi, /api/otellerin-detayli-finansal-verisi, /api/otellerin-aylik-finansal-verisi ve /api/kpi-2025.

## ER Diyagramı

<img width="1840" height="811" alt="ER" src="https://github.com/user-attachments/assets/956d2856-d7d6-419a-8a03-421f47f76b97" />

## Notlar

- Proje MVC (Model-View-Controller) yapısına uygundur
- View dosyaları HTML formatındadır
- Template engine olarak özel bir helper fonksiyonu kullanılmaktadır
- Veritabanı bağlantısı başarısız olursa, `db/config.js` dosyasını kontrol edin

