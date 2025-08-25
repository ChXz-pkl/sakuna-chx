// firebase-config.js

// Import fungsi yang dibutuhkan
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Konfigurasi Firebase-mu
const firebaseConfig = {
    apiKey: "AIzaSyCy136Ggt5xjDsg-HnfipO_NTYEitoLl50",
    authDomain: "sakuna-chx.firebaseapp.com",
    projectId: "sakuna-chx",
    storageBucket: "sakuna-chx.appspot.com",
    messagingSenderId: "774133638714",
    appId: "1:774133638714:web:ca83a1f55c5127811a7703",
    measurementId: "G-L952N51FWC"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor service yang akan kita gunakan di file lain
export const auth = getAuth(app);
export const db = getFirestore(app);