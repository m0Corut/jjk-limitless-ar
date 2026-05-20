# Gojo Satoru Limitless Techniques AR

<div align="center">
  <p>
    <a href="#türkçe">🇹🇷 Türkçe Okuyun</a> | 
    <a href="#english">🇺🇸 Read in English</a>
  </p>
</div>

---

<div id="türkçe"></div>

# 🇹🇷 Türkçe

## Proje Hakkında
Bu proje, Jujutsu Kaisen anime serisindeki efsanevi karakter **Gojo Satoru**'nun lanetli tekniklerini (Sınırsızlık - Limitless) gerçek zamanlı el hareketleri ile tarayıcı ortamında deneyimlemenizi sağlayan bir web tabanlı artırılmış gerçeklik (AR) uygulamasıdır. 

**MediaPipe Hand Landmarker** ve **Three.js (WebGL)** teknolojileri kullanılarak geliştirilmiştir. Kamera görüntünüzdeki ellerinizi yapay zeka ile takip eder, el hareketlerinize göre 3 boyutlu parçacık efektleri ve ses efektleri üretir.

---

### Özellikler
*   **Gerçek Zamanlı El Takibi:** MediaPipe sayesinde yüksek hassasiyetli, düşük gecikmeli el takibi.
*   **3D Parçacık Motoru:** Özelleştirilmiş 3 boyutlu parçacık sistemleri ile gerçekçi enerji efektleri.
*   **Ön/Arka Kamera Desteği:** Mobil cihazlar için ayna modu uyumlu kamera yönü değiştirme desteği.
*   **Etkileşimli Sesler:** Her lanetli tekniğe özel, durum değişikliklerine duyarlı 8D ses efektleri.
*   **İnteraktif Kontrol Paneli:** Kullanıcı dostu, Gojo Satoru temalı Türkçe görsel rehber paneli.
*   **Gelişmiş Shading & Post-Processing:** Unreal Bloom, Chromatic Aberration ve Vignette efektleri ile sinematik görsel kalite.

---

### Lanetli Teknikler ve Kontroller

| Teknik | Görsel | El | Açıklama |
| :--- | :--- | :--- | :--- |
| **RED (Aka - 赫)** | 🔴 | Sağ El | İşaret parmağınızı yukarı uzatın. Kırmızı patlayıcı enerji oluşturur. |
| **BLUE (Ao - 蒼)** | 🔵 | Sol El | İşaret parmağınızı yukarı uzatın. Mavi çekim alanı oluşturur. |
| **SENTEZ (Birleşme)** | 🟣 | İki El | İki elinizin işaret parmağını birbirine yaklaştırın ve 1 saniye bekletin. |
| **HOLLOW PURPLE (Kyoshiki Murasaki - 茈)** | 💥 | Fırlatma | Mor küre oluştuktan sonra, işaret ve serçe parmağınızı açıp (Rock-on işareti) elinizi hedefe doğrultarak fırlatın! |

---

### Teknolojiler
*   **Core:** HTML5, CSS3, JavaScript (ES6+)
*   **Graphics:** Three.js (WebGL, Post-processing, Shaders)
*   **AI/Tracking:** Google MediaPipe (Tasks Vision - Hand Landmarker)
*   **Bundler:** Vite
*   **Audio:** Web Audio API

---

### Teknik Detaylar ve Mimari

#### 1. El Takip & Jest Tanımlama Hattı (Pipeline)
*   **Yapay Zeka Modeli:** Google MediaPipe `HandLandmarker` kütüphanesi kullanılmıştır. Düşük gecikme ve yüksek mobil performans için `float16` GPU delegate modeli tercih edilmiştir.
*   **Jest Durum Makinesi:** Kararsız el hareketlerini engellemek için gecikme eşikli (debounce) ve kare bazlı durum makinesi (`GestureDetector`) geliştirilmiştir. Durumlar: `IDLE`, `RED_ACTIVE`, `BLUE_ACTIVE`, `BOTH_ACTIVE`, `MERGING`, `PURPLE_READY` ve `LAUNCHING`.
*   **Aynalama ve Koordinat Dönüşümü:** MediaPipe'ın normalize edilmiş koordinat uzayı (0..1), Three.js'in Orthographic kamera uzayına dönüştürülür. Kamera modu `user` (ön) iken görüntüyü ayna şeklinde yansıtır; `environment` (arka) moduna geçildiğinde ayna yansıtması otomatik olarak kapatılarak doğru konumlandırma sağlanır.

#### 2. WebGL Parçacık Motoru (`particles.js`)
*   Enerji dalgalanmalarını simüle etmek için yüksek performanslı özel 3B parçacık motoru yazılmıştır. Parçacıkların çekim merkezleri, hızları, renkleri ve boyutları el koordinatlarına ve aktif tekniğe göre gerçek zamanlı güncellenir.
    *   **Red:** Dışa doğru patlayan parçacıklar.
    *   **Blue:** İçe doğru çekilen girdap parçacıkları.
    *   **Purple:** Merkezde sarmal şekilde dönen yoğun mor küre parçacıkları.

#### 3. Post-Processing & Görsel Efektler (`scene.js`)
*   **UnrealBloomPass:** Lanetli enerjilere parıltı (glow) kazandırmak için Three.js post-processing katmanında Unreal Bloom geçişi kullanılır.
*   **Chromatic Aberration (Renk Sapması Shader):** Hollow Purple fırlatıldığı anda ekranda yüksek kütle çekim bükülmesini simüle etmek için özel renk sapması shader'ı devreye girer.
*   **Vignette Shader:** Köşeleri karartarak odağı lanetli enerjiye ve ele odaklar.
*   **Screen Shake (Ekran Sarsıntısı):** Fırlatma anında kameraya rastgele sarsıntı (decay bazlı) uygulanır.

---

### Kurulum ve Çalıştırma

1.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    ```

2.  **Yerel Sunucuyu Başlatın:**
    ```bash
    npm run dev
    ```

3.  **Üretim İçin Derleyin (Build):**
    ```bash
    npm run build
    ```

---

<br>
<br>

<div id="english"></div>

# 🇺🇸 English

## About the Project
This project is a web-based augmented reality (AR) application that allows you to experience the legendary cursed techniques (Limitless) of **Gojo Satoru** from the Jujutsu Kaisen anime series, in real-time using hand gestures directly in your browser.

Developed using **MediaPipe Hand Landmarker** and **Three.js (WebGL)**, the application tracks your hands via your webcam stream using AI, spawning dynamic 3D particle effects and spatialized sound effects synced to your movements.

---

### Features
*   **Real-time Hand Tracking:** High-precision, low-latency tracking powered by Google MediaPipe.
*   **Custom 3D Particle System:** Rich, high-fidelity energy effects tailored for each technique.
*   **Front/Rear Camera Toggle:** Mobile-friendly camera rotation with automatic mirroring and coordinate adaptation.
*   **Immersive Soundscape:** Spatialized sound effects that trigger dynamically on gesture states.
*   **Interactive Control Panel:** User-friendly, Gojo-themed guides with visual gesture indicators.
*   **Advanced Shading & Post-Processing:** Unreal Bloom, Chromatic Aberration, and Vignette effects for a cinematic look.

---

### Cursed Techniques & Controls

| Technique | Visual | Hand | Gesture Description |
| :--- | :--- | :--- | :--- |
| **RED (Aka - 赫)** | 🔴 | Right Hand | Extend only your index finger upwards. Spawns explosive red energy. |
| **BLUE (Ao - 蒼)** | 🔵 | Left Hand | Extend only your index finger upwards. Spawns attractive blue energy. |
| **SYNTHESIS (Merge)** | 🟣 | Both Hands | Bring your left and right index finger tips close together and hold for 1 second. |
| **HOLLOW PURPLE (茈)** | 💥 | Launch | Once the purple orb is formed, make a rock-on sign (extend index & pinky) and point towards the target to fire! |

---

### Tech Stack
*   **Core:** HTML5, CSS3, JavaScript (ES6+)
*   **Graphics:** Three.js (WebGL, Post-processing, Shaders)
*   **AI/Tracking:** Google MediaPipe (Tasks Vision - Hand Landmarker)
*   **Bundler:** Vite
*   **Audio:** Web Audio API

---

### Technical Details & Architecture

#### 1. Hand Tracking & Gesture Recognition Pipeline
*   **AI Model:** Google MediaPipe `HandLandmarker` is used, configured with the `float16` GPU delegate model for efficient desktop and mobile execution.
*   **State Machine:** Gestures are processed via a robust, debounced state machine (`GestureDetector`). Supported states are: `IDLE`, `RED_ACTIVE`, `BLUE_ACTIVE`, `BOTH_ACTIVE`, `MERGING`, `PURPLE_READY`, and `LAUNCHING`.
*   **Mirroring & Projection:** 2D normalized landmark coordinates `(0..1)` are projected into a scaled 3D Three.js Orthographic space. The coordinate mapping dynamically adapts to the selected camera: mirroring the front camera feed, and projecting directly for the rear camera.

#### 2. WebGL Particle Engine (`particles.js`)
*   A custom high-performance particle system controls thousands of individual particles. Attractors, velocities, colors, and lifespans adapt instantly to the hand's current position and activated technique:
    *   **Red:** Outwardly repelling explosion particles.
    *   **Blue:** Inwardly pulling vortex particles.
    *   **Purple:** Highly dense, swirling spiral particles centered on the merge point.

#### 3. Post-Processing & Rendering Shader Pipeline (`scene.js`)
*   **UnrealBloomPass:** Generates a high-fidelity volumetric glow around active cursed energy nodes.
*   **Chromatic Aberration Shader:** A custom GLSL shader that simulates intense gravitational distortion by shifting red/blue channels outwards from the center on Hollow Purple release.
*   **Vignette Shader:** Applies screen-space edge darkening to direct visual focus towards the hand and techniques.
*   **Camera Shake:** Implements dynamic screen-space decay-based camera shaking upon hollow purple launch.

---

### Installation & Development

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Development Server:**
    ```bash
    npm run dev
    ```

3.  **Build for Production:**
    ```bash
    npm run build
    ```
