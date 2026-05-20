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
