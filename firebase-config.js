// firebase-config.js

// Import fungsi yang dibutuhkan
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Konfigurasi Firebase-mu
const firebaseConfig = {
  apiKey: "AIzaSyAzx4v-4I9NYrdOLeraZ8u1HgLwa7rFlBA",
  authDomain: "life-quest-system-chx.firebaseapp.com",
  projectId: "life-quest-system-chx",
  storageBucket: "life-quest-system-chx.firebasestorage.app",
  messagingSenderId: "986951587369",
  appId: "1:986951587369:web:e5340c92964e4ca3986e38",
  measurementId: "G-JTWKTRD007"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor service yang akan kita gunakan di file lain
export const auth = getAuth(app);

export const db = getFirestore(app);
