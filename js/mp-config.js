'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE AYARI (Ghost Multiplayer)
// ───────────────────────────────────────────────────────────────────────────
// Buraya kendi Firebase projenin config'ini yapıştır → gerçek oyuncuların
// hayaletlerine karşı yarışırsın. BOŞ bırakırsan (null) oyun YEREL modda çalışır.
//
// KURULUM (tek seferlik, ücretsiz):
//   1) https://console.firebase.google.com → "Add project" (herhangi bir isim)
//   2) Sol menü: Build → Firestore Database → "Create database" → "Start in
//      production mode" → bir bölge seç.
//   3) Firestore → "Rules" sekmesi → aşağıdaki kuralları yapıştır → Publish:
//
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /ghosts/{doc} {
//              allow read: if true;
//              allow create: if request.resource.data.keys().hasOnly(
//                ['mapId','name','vehicleId','dist','time','points','ts']);
//              allow update, delete: if false;
//            }
//          }
//        }
//
//   4) Proje ayarları (⚙ Project settings) → "Your apps" → Web (</>) simgesi →
//      uygulamayı kaydet → sana verilen "firebaseConfig" nesnesini kopyala.
//   5) Aşağıdaki null yerine o nesneyi yapıştır. Kaydet, oyunu Ctrl+Shift+R ile yenile.
//
// NOT: Buradaki apiKey GİZLİ DEĞİLDİR (projeyi tanımlar); güvenlik yukarıdaki
// Firestore kurallarıyla sağlanır. Gizli anahtar değildir, paylaşılması sorun olmaz.
// ═══════════════════════════════════════════════════════════════════════════

window.MP_FIREBASE_CONFIG = null;

/* ÖRNEK (kendi değerlerinle doldur):
window.MP_FIREBASE_CONFIG = {
  apiKey:            "AIza...",
  authDomain:        "senin-projen.firebaseapp.com",
  projectId:         "senin-projen",
  storageBucket:     "senin-projen.appspot.com",
  messagingSenderId: "1234567890",
  appId:             "1:1234567890:web:abc123"
};
*/
