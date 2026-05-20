# JJK Cursed Technique — El Hareketi Efekt Uygulaması

**Tarih:** 2026-04-09
**Faz:** 1 (Red → Blue → Purple → Launch)
**Faz 2 (sonra):** Domain Expansion (領域展開)

---

## 1. Genel Bakış

Kullanıcı kamera karşısına geçer, ekranda kendi görüntüsünü görür. El hareketleriyle Jujutsu Kaisen'deki Gojo Satoru'nun lanetli tekniklerini (Cursed Techniques) tetikler. Sağ eliyle Red (赫) tekniğini, sol eliyle Blue (蒼) tekniğini aktifleştirir. İki eli birleştirdiğinde Hollow Purple (虚式・茈 / Murasaki) oluşur ve elini öne iterek fırlatır.

## 2. Teknoloji Stack'i

| Katman | Teknoloji | Neden |
|---|---|---|
| **El algılama** | MediaPipe Hand Landmarker (CDN) | Tarayıcıda çalışır, çoklu el, handedness desteği |
| **Gesture tanıma** | Kural bazlı sınıflandırma | Pose'lar yeterince belirgin, ML modele gerek yok |
| **3D Render** | Three.js (WebGL) | Parçacıklar, shader'lar, post-processing |
| **Post-processing** | Three.js EffectComposer | Bloom, chromatic aberration, vignette |
| **Ses** | Web Audio API | Sentezlenmiş efektler, dosya bağımlılığı yok |
| **Proje** | Vite (vanilla JS) | Hızlı dev server, ES module desteği, hot reload |

## 3. Mimari

```
Webcam (video element)
    │
    ▼
MediaPipe Hand Landmarker
    │ landmarks (21 nokta × 2 el)
    ▼
Gesture Recognizer (kural bazlı)
    │ state: IDLE / RED / BLUE / BOTH / MERGING / PURPLE / LAUNCHING
    ▼
Three.js Scene
    ├── Video Plane (webcam arka planı, aynalı)
    ├── Effects Layer (parçacıklar, enerji küreleri, halkalar)
    └── Post-Processing (bloom, chromatic aberration, vignette)
    │
    ▼
HTML/CSS UI Overlay
    ├── Üst: 呪術廻戦 başlık + durum satırı
    ├── Orta: Teknik adı (赫 / 蒼 / 茈)
    └── Alt: Sol/sağ el durum göstergesi
```

## 4. Proje Dosya Yapısı

```
jjk-efekt/
├── index.html
├── style.css
├── src/
│   ├── main.js            # Giriş noktası, game loop, her şeyi bağlar
│   ├── handTracker.js      # MediaPipe Hand Landmarker wrapper
│   ├── gestures.js         # Landmark → pose algılama, durum makinesi
│   ├── scene.js            # Three.js sahne kurulumu, webcam plane, post-processing
│   ├── effects.js          # Red, Blue, Purple, Launch görsel efektleri
│   ├── particles.js        # Object-pooled parçacık sistemi
│   ├── audio.js            # Web Audio API sentezlenmiş ses efektleri
│   └── ui.js               # HTML/CSS overlay yönetimi
├── package.json
└── vite.config.js
```

## 5. Gesture Algılama

### 5.1 MediaPipe Landmark'ları

Her el için 21 landmark noktası alınır. Önemli noktalar:
- `0`: Bilek (wrist)
- `4`: Baş parmak ucu
- `8`: İşaret parmağı ucu
- `12`: Orta parmak ucu
- `16`: Yüzük parmağı ucu
- `20`: Serçe parmağı ucu
- `5, 6, 7`: İşaret parmağı MCP, PIP, DIP eklemleri

### 5.2 Poz Tanımlama

**Red Pozu (sağ el):** İşaret parmağı yukarı uzatılmış, diğer parmaklar kıvrık
- Kural: `index_tip.y < index_pip.y` VE `middle_tip.y > middle_pip.y` VE `ring_tip.y > ring_pip.y` VE `pinky_tip.y > pinky_pip.y`

**Blue Pozu (sol el):** Aynı kural, sol el
- Kural: Aynı — işaret parmağı yukarı, diğerleri kıvrık

**Merge:** İki elin bilek noktaları arasındaki mesafe eşik değerinin altında
- Kural: `distance(left_wrist, right_wrist) < MERGE_THRESHOLD`

**Launch:** Elin kameraya doğru hızla yaklaşması (el ölçeği büyümesi)
- Kural: `hand_scale_change / dt > LAUNCH_VELOCITY_THRESHOLD`

### 5.3 Durum Makinesi

```
IDLE ──(sağ el pozu)──▶ RED_ACTIVE
IDLE ──(sol el pozu)──▶ BLUE_ACTIVE (kendi başına da aktif olabilir)

RED_ACTIVE ──(sol el de algılandı)──▶ BOTH_ACTIVE
BLUE_ACTIVE ──(sağ el de algılandı)──▶ BOTH_ACTIVE

BOTH_ACTIVE ──(eller yaklaştı)──▶ MERGING
MERGING ──(1sn bekledikten sonra)──▶ PURPLE_READY
PURPLE_READY ──(el öne itildi)──▶ LAUNCHING
LAUNCHING ──(animasyon bitti, ~2sn)──▶ IDLE

Herhangi durum ──(el kayboldu)──▶ IDLE (kademeli fade-out ile)
```

## 6. Görsel Efektler

### 6.1 El Landmark Görselleştirme (Her Zaman Aktif)

- 21 nokta arası bağlantı çizgileri
- Noktalar küçük parlayan daireler
- Renk duruma göre değişir:
  - IDLE → beyaz/cyan
  - RED → kırmızı
  - BLUE → mavi
  - MERGING/PURPLE → mor
- Landmark'lar efektlerin estetik parçası (referanstaki gibi)

### 6.2 Red Efekti (赫)

- **Enerji küresi:** Sağ elin palm merkezi etrafında (landmark 9 civarı)
- **Görünüm:** Radial gradient — beyaz merkez → parlak kırmızı → koyu kırmızı → saydam
- **Parçacıklar:** Merkezden dışarı yayılan kırmızı/turuncu parçacıklar (repulsion efekti)
- **Bloom:** Yoğun glow
- **Screen shake:** Hafif (±2px), sürekli titreme

### 6.3 Blue Efekti (蒼)

- **Enerji vortex:** Sol elin palm merkezi etrafında
- **Görünüm:** Konsantrik halkalar — mavi/cyan, içe doğru spiral çizer
- **Parçacıklar:** Dışarıdan merkeze çekilen mavi parçacıklar (attraction efekti)
- **Bloom:** Yoğun glow
- **Lens distortion:** Merkeze doğru hafif çekme efekti

### 6.4 Merge Efekti

**Eller yaklaşırken:**
- Kırmızı ve mavi küreler birbirinin etrafında yörüngede dönmeye başlar
- Aralarında enerji arkları (ince parlak çizgiler)
- Renklerin karışmaya başlaması — geçiş parçacıkları

**Birleşme anı:**
- İki küre tek noktada buluşur → parlak flash
- Kırmızı+mavi → mor enerjiye geçiş

### 6.5 Purple Efekti (茈 — Murasaki)

- **Enerji küresi:** İki el arasının ortasında büyük mor küre
- **Parçacık halkası:** Kürenin etrafında dönen mor parçacık yörüngesi
- **Bloom:** Çok yoğun, ekranın büyük kısmını etkiler
- **Chromatic aberration:** Aktif — RGB kanalları kayar
- **"MURASAKI" yazısı:** Ekranın alt ortasında, büyük bold mor tekst, fade-in + scale animasyonu

### 6.6 Launch Efekti (Fırlatma)

Referans: Gojo'nun eli öne uzatarak mor enerjiyi fırlatması

1. **Elin arkasında büyük mor halka (ring):** Büyük, parlak, dönen enerji halkası
2. **Avuçta yoğunlaşma:** Parlak beyaz/mor noktasal enerji
3. **Fırlatma anı:**
   - Ekran flash (beyaz → mor → normal, ~300ms)
   - Enerji küresi elden ayrılıp ekranın derinliğine doğru ilerler
   - Trail efekti — arkasında mor/beyaz iz bırakır
   - Shockwave — ekran kenarlarında dairesel distortion
   - Screen shake — güçlü (±8px)
   - Parçacık patlaması — her yöne
4. **Söndürme:** Tüm efektler 2sn içinde söner, IDLE'a dönüş

### 6.7 Post-Processing Pipeline

```
Three.js Sahne
    │
    ▼
UnrealBloomPass (bloom/glow)
    │
    ▼
ShaderPass: Chromatic Aberration (teknik aktifken)
    │
    ▼
ShaderPass: Vignette (sürekli, sinematik)
    │
    ▼
Final Output
```

## 7. Ses Efektleri (Web Audio API)

Tüm sesler Web Audio API oscillator + noise + filter ile sentezlenir.

| Teknik | Ses Karakteri |
|---|---|
| **Red aktif** | Düşük frekanslı güçlü uğultu (bass hum, ~80Hz sawtooth + LPF) |
| **Blue aktif** | Yüksek perdeli rüzgar sesi (white noise + BPF, frekans sweep) |
| **Merge** | Derin bas + çıtırdama (düşük sawtooth + distortion + crackle noise) |
| **Purple oluşumu** | Yoğun enerji titreşimi (layered oscillators, pulsating volume) |
| **Launch** | Patlama + shockwave boom (noise burst → hızlı decay + sub bass hit) |

Ses ilkeleri:
- Teknik aktif olduğu sürece sürekli çalar (loop)
- Durum geçişlerinde crossfade (ani kesme yok)
- Volume, kullanıcının el pozisyonuna/duruma göre dinamik

## 8. UI Overlay

### 8.1 Üst Başlık

```
呪術廻戦
CURSED TECHNIQUE SYSTEM
─────────────────────────
Durum: IDLE / CHARGING CURSED ENERGY / CURSED SYSTEM ACTIVE
```

- Konum: Ekranın üst ortası
- Stil: Yarı saydam koyu arka plan, backdrop-blur
- Font: Noto Serif JP (Japonca) + Orbitron (İngilizce)
- Her zaman görünür

### 8.2 Teknik Adı Gösterimi

Aktifleşen tekniğe göre ekranın ortasında belirir:

| Durum | Gösterim |
|---|---|
| RED_ACTIVE | `赫` kırmızı, altında `RED` |
| BLUE_ACTIVE | `蒼` mavi, altında `BLUE` |
| PURPLE_READY | `茈` mor, altında `MURASAKI` — daha büyük ve dramatik |
| LAUNCHING | `茈` ekranı doldurur, flash ile kaybolur |

Animasyon: `opacity: 0 → 1` + `scale(0.5) → scale(1)`, 300ms ease-out. 2sn görünür, sonra fade-out.

### 8.3 El Durum Göstergesi

```
LEFT: ● ACTIVE          RIGHT: ● ACTIVE
```

- Konum: Ekranın altı
- Algılanan her el için durum gösterir
- Renk, aktif tekniğe göre değişir

## 9. Performans Hedefleri

- **60 FPS** render (efektlerle birlikte)
- **MediaPipe:** ~15-20 FPS hand tracking (GPU delegate)
- **Parçacık limiti:** Maksimum 2000 aktif parçacık (object pooling)
- **Gecikme:** El hareketi → efekt arası < 100ms algılanabilir gecikme

## 10. Faz 2 — Domain Expansion (Sonraki Aşama)

Bu spece dahil değil. Ayrı bir spec yazılacak:
- Özel el mührü algılama (her iki el yumruk, yakın)
- Ekran kararma, yıldızlı boşluk
- Büyük enerji halkası
- Yoğun parçacık fırtınası
- "無量空処 — Unlimited Void" tekst
- Ortam değişimi
