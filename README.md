# EgeLife Otel Karar Destek Sistemi

MVC yapısına uygun Node.js ve Express tabanlı karar destek sistemi.

## Proje Tanıtımı
Bu proje, EgeLife otel zincirine ait gelir, gider, doluluk, müşteri sayısı, oda tipi ve müşteri tipi verilerini analiz ederek yöneticilerin 12 aylık taktiksel kararlarını desteklemek amacıyla geliştirilmiş bir karar destek sistemidir. Sistem; aylara ve yıllara göre performans grafikleri, oteller arası karşılaştırmalar, kampanya etkisi analizleri, müşteri memnuniyeti değerlendirmeleri ve geleceğe yönelik gelir–doluluk tahminleri üretmektedir. Yönetici, seçtiği otel ve dönemlere göre filtreleme yaparak veri odaklı değerlendirmeler yapabilir ve işletme yönetimi için gerekli kararları planlayabilir.

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

## Notlar

- Proje MVC (Model-View-Controller) yapısına uygundur
- View dosyaları HTML formatındadır
- Template engine olarak özel bir helper fonksiyonu kullanılmaktadır
- Veritabanı bağlantısı başarısız olursa, `db/config.js` dosyasını kontrol edin

