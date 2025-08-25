// auth.js

// Import service dari file konfigurasi
import { auth, db } from './firebase-config.js';
// Import fungsi yang dibutuhkan dari Firebase SDK
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    doc, 
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Seleksi Elemen DOM
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authError = document.getElementById('auth-error');

// Cek status login pengguna
onAuthStateChanged(auth, user => {
    if (user) {
        // Jika pengguna sudah login, langsung arahkan ke halaman aplikasi
        window.location.href = 'app.html';
    }
});

// Tampilkan form registrasi
showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.style.display = 'none';
    registerContainer.style.display = 'block';
    authError.textContent = '';
});

// Tampilkan form login
showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerContainer.style.display = 'none';
    loginContainer.style.display = 'block';
    authError.textContent = '';
});

// Proses registrasi
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nama = registerForm.registerName.value;
    const email = registerForm.registerEmail.value;
    const password = registerForm.registerPassword.value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Buat dokumen pengguna baru di Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, {
            nama: nama,
            mataUang: 'IDR',
            tanggalMulai: serverTimestamp(),
            // Anggaran default untuk pengguna baru
            anggaran: {
                makanan: 1500000,
                transportasi: 500000,
                hiburan: 400000,
                tagihan: 800000
            }
        });
        // Redirect ke halaman utama setelah berhasil daftar
        // onAuthStateChanged akan menangani ini
    } catch (error) {
        authError.textContent = `Error: ${error.message}`;
    }
});

// Proses login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginForm.loginEmail.value;
    const password = loginForm.loginPassword.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Redirect ke halaman utama setelah berhasil login
        // onAuthStateChanged akan menangani ini
    } catch (error) {
        authError.textContent = `Error: ${error.message}`;
    }
});