// app.js

// Import service dari file konfigurasi
import { auth, db } from './firebase-config.js';
// Import fungsi yang dibutuhkan dari Firebase SDK
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    collection,
    query,
    orderBy,
    addDoc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================
// SELEKSI ELEMEN DOM
// =================================================================
const logoutBtn = document.getElementById('logoutBtn');
const userNameDisplay = document.getElementById('userNameDisplay');
const userPhoto = document.getElementById('userPhoto');
const infoSaldo = document.getElementById('infoSaldo');
const pohonUtamaImg = document.getElementById('pohon-utama');
const containerBunga = document.getElementById('petak-bunga-container');

// Elemen Modal & Tombol Utama
const tambahTransaksiBtn = document.getElementById('tambahTransaksiBtn');
const bukaRiwayatBtn = document.getElementById('bukaRiwayatBtn');
const bukaLaporanBtn = document.getElementById('bukaLaporanBtn');
const bukaPengaturanBtn = document.getElementById('bukaPengaturanBtn');
const transaksiModal = document.getElementById('transaksiModal');
const riwayatModal = document.getElementById('riwayatModal');
const laporanModal = document.getElementById('laporanModal');
const pengaturanModal = document.getElementById('pengaturanModal');

// Form & Kontainer
const transaksiForm = document.getElementById('transaksiForm');
const pengaturanForm = document.getElementById('pengaturanForm');
const riwayatListContainer = document.getElementById('riwayat-list-container');
const categoryEditorContainer = document.getElementById('category-editor-container');
const tambahKategoriBtn = document.getElementById('tambahKategoriBtn');

// Filter Riwayat
const searchInput = document.getElementById('searchInput');
const filterKategori = document.getElementById('filterKategori');
const filterTipeContainer = document.getElementById('filterTipe');

// Sasaran Finansial
const sasaranListContainer = document.getElementById('sasaran-list');
const daftarSasaranPengaturan = document.getElementById('daftar-sasaran-pengaturan');
const tambahSasaranBtn = document.getElementById('tambahSasaranBtn');
const sasaranModal = document.getElementById('sasaranModal');
const sasaranForm = document.getElementById('sasaranForm');
const alokasiModal = document.getElementById('alokasiModal');
const alokasiForm = document.getElementById('alokasiForm');

// Transaksi Berulang
const daftarTransaksiBerulang = document.getElementById('daftar-transaksi-berulang');
const tambahTransaksiBerulangBtn = document.getElementById('tambahTransaksiBerulangBtn');
const berulangModal = document.getElementById('berulangModal');
const berulangForm = document.getElementById('berulangForm');

// UI Lain-lain
const themeToggleBtn = document.getElementById('themeToggleBtn');
const resetDataBtn = document.getElementById('resetDataBtn');
const tipeTransaksiContainer = document.querySelector('#transaksiModal .tipe-transaksi');
const customModal = document.getElementById('custom-modal');
const customModalTitle = document.getElementById('custom-modal-title');
const customModalText = document.getElementById('custom-modal-text');
const customModalActions = document.getElementById('custom-modal-actions');
const toast = document.getElementById('toast-notification');

// Variabel Global
let currentUser = null;
let userDataCache = null;
let transaksiCache = [];
let unsubUser = null;
let unsubTransaksi = null;
let unsubSasaran = null;
let unsubBerulang = null;
let expenseChartInstance = null;
let toastTimeout;

// =================================================================
// GUARD & AUTENTIKASI
// =================================================================
onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        if (user.photoURL) {
            userPhoto.src = user.photoURL;
        } else {
            userPhoto.src = 'default-avatar.png';
        }
        initAppForUser();
    } else {
        window.location.href = 'index.html';
    }
});

logoutBtn.addEventListener('click', () => {
    if (unsubUser) unsubUser();
    if (unsubTransaksi) unsubTransaksi();
    if (unsubSasaran) unsubSasaran();
    if (unsubBerulang) unsubBerulang();
    signOut(auth);
});

// =================================================================
// INISIALISASI APLIKASI
// =================================================================
function initAppForUser() {
    // Hentikan listener lama jika ada untuk mencegah duplikasi
    if (unsubUser) unsubUser();
    if (unsubTransaksi) unsubTransaksi();
    if (unsubSasaran) unsubSasaran();
    if (unsubBerulang) unsubBerulang();

    cekDanJalankanTransaksiBerulang();

    const userRef = doc(db, 'users', currentUser.uid);
    unsubUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            userDataCache = docSnap.data();
            userNameDisplay.textContent = userDataCache.nama;
            applyTheme(userDataCache.theme);
            populateCategoryOptions(userDataCache);
        }
    });

    const transaksiRef = collection(db, 'users', currentUser.uid, 'transaksi');
    const qTransaksi = query(transaksiRef, orderBy('timestamp', 'desc'));
    unsubTransaksi = onSnapshot(qTransaksi, (snapshot) => {
        transaksiCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (userDataCache) {
            renderTaman(userDataCache, transaksiCache);
            if (riwayatModal.open) renderHistory(userDataCache, transaksiCache);
            if (laporanModal.open) renderLaporanBulanan(userDataCache, transaksiCache);
        }
    });

    const sasaranRef = collection(db, 'users', currentUser.uid, 'sasaran');
    const qSasaran = query(sasaranRef, orderBy('tanggalDibuat', 'asc'));
    unsubSasaran = onSnapshot(qSasaran, (snapshot) => {
        const sasaranList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSasaran(sasaranList);
        renderSasaranDiPengaturan(sasaranList);
    });

    const berulangRef = collection(db, 'users', currentUser.uid, 'transaksiBerulang');
    unsubBerulang = onSnapshot(berulangRef, (snapshot) => {
        const berulangList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTransaksiBerulangDiPengaturan(berulangList);
    });
}

// =================================================================
// FUNGSI RENDER Tampilan
// =================================================================
function renderTaman(userData, transaksi) {
    if (!userData || !transaksi) return;

    let totalPemasukan = transaksi.filter(tx => tx.tipe === 'pemasukan').reduce((sum, tx) => sum + tx.jumlah, 0);
    let totalPengeluaran = transaksi.filter(tx => tx.tipe === 'pengeluaran').reduce((sum, tx) => sum + tx.jumlah, 0);
    const saldo = totalPemasukan - totalPengeluaran;

    infoSaldo.textContent = `Saldo: ${userData.mataUang} ${saldo.toLocaleString('id-ID')}`;

    let gambarPohonBaru = 'pohon-1.png';
    if (saldo >= 5000000) gambarPohonBaru = 'pohon-3.png';
    else if (saldo >= 1000000) gambarPohonBaru = 'pohon-2.png';
    if (!pohonUtamaImg.src.endsWith(gambarPohonBaru)) pohonUtamaImg.src = gambarPohonBaru;

    containerBunga.innerHTML = '';
    const anggaran = userData.anggaran;
    Object.keys(anggaran).forEach(kategori => {
        const batasAnggaran = anggaran[kategori];
        const pengeluaranKategori = transaksi
            .filter(tx => tx.tipe === 'pengeluaran' && tx.kategori === kategori)
            .reduce((total, tx) => total + tx.jumlah, 0);
        const persentaseTerpakai = batasAnggaran > 0 ? (pengeluaranKategori / batasAnggaran) * 100 : 0;

        let statusBunga = 'sehat';
        if (persentaseTerpakai >= 100) statusBunga = 'layu';
        else if (persentaseTerpakai >= 75) statusBunga = 'waspada';

        containerBunga.innerHTML += `
            <div class="petak-bunga ${statusBunga}" data-kategori="${kategori}">
                <img src="flower.png" alt="Bunga ${kategori}"><hr>
                <span class="nama-kategori">${kategori.charAt(0).toUpperCase() + kategori.slice(1)}</span><br>
                <span class="info-anggaran">${userData.mataUang} ${pengeluaranKategori.toLocaleString('id-ID')} / ${batasAnggaran.toLocaleString('id-ID')}</span>
            </div>
        `;
    });
}

function renderHistory(userData, transaksi) {
    const filters = {
        searchTerm: searchInput.value,
        tipe: filterTipeContainer.querySelector('input[name="filterTipe"]:checked').value,
        kategori: filterKategori.value
    };

    let filteredTransaksi = transaksi;
    if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        filteredTransaksi = filteredTransaksi.filter(tx => (tx.deskripsi || '').toLowerCase().includes(searchTerm));
    }
    if (filters.tipe !== 'semua') {
        filteredTransaksi = filteredTransaksi.filter(tx => tx.tipe === filters.tipe);
    }
    if (filters.kategori !== 'semua') {
        filteredTransaksi = filteredTransaksi.filter(tx => tx.kategori === filters.kategori);
    }

    riwayatListContainer.innerHTML = '';
    if (filteredTransaksi.length === 0) {
        riwayatListContainer.innerHTML = '<p>Tidak ada transaksi yang cocok.</p>';
        return;
    }

    filteredTransaksi.forEach(tx => {
        const jumlahClass = tx.tipe === 'pemasukan' ? 'pemasukan' : 'pengeluaran';
        const tanda = tx.tipe === 'pemasukan' ? '+' : '-';
        const tanggal = tx.timestamp ? tx.timestamp.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : 'Baru saja';
        
        riwayatListContainer.innerHTML += `
            <div class="riwayat-item">
                <div class="riwayat-item-info">
                    <span class="riwayat-item-deskripsi">${tx.deskripsi || tx.kategori}</span>
                    <span class="riwayat-item-kategori">${tanggal} - ${tx.kategori}</span>
                </div>
                <div class="riwayat-item-kanan">
                    <div class="riwayat-item-jumlah ${jumlahClass}">${tanda} ${userData.mataUang} ${tx.jumlah.toLocaleString('id-ID')}</div>
                    <button class="tombol-edit-tx" data-id="${tx.id}">✏️</button>
                    <button class="tombol-hapus-tx" data-id="${tx.id}">🗑️</button>
                </div>
            </div>
        `;
    });
}

function renderLaporanBulanan(userData, transaksi) {
    const summaryContainer = document.getElementById('laporan-summary');
    const now = new Date();
    const pengeluaranBulanIni = transaksi.filter(tx => {
        if (!tx.timestamp) return false;
        const txDate = tx.timestamp.toDate();
        return tx.tipe === 'pengeluaran' && txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
    });

    if (expenseChartInstance) expenseChartInstance.destroy();
    if (pengeluaranBulanIni.length === 0) {
        summaryContainer.innerHTML = '<p>Belum ada data pengeluaran untuk bulan ini.</p>';
        return;
    }

    const pengeluaranPerKategori = pengeluaranBulanIni.reduce((acc, tx) => {
        acc[tx.kategori] = (acc[tx.kategori] || 0) + tx.jumlah;
        return acc;
    }, {});
    
    const totalPengeluaran = Object.values(pengeluaranPerKategori).reduce((sum, val) => sum + val, 0);
    summaryContainer.innerHTML = `<p>Total Pengeluaran Bulan Ini: <strong>${userData.mataUang} ${totalPengeluaran.toLocaleString('id-ID')}</strong></p>`;

    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(pengeluaranPerKategori).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
            datasets: [{
                data: Object.values(pengeluaranPerKategori),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
                borderColor: 'var(--modal-bg)',
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: 'var(--text-color)' } } }
        }
    });
}

// =================================================================
// FUNGSI UNTUK SASARAN FINANSIAL
// =================================================================

function renderSasaran(sasaranList) {
    sasaranListContainer.innerHTML = '';
    if (sasaranList.length === 0) {
        sasaranListContainer.innerHTML = '<p>Kamu belum punya sasaran. Ayo buat satu di menu Pengaturan!</p>';
        return;
    }

    sasaranList.forEach(sasaran => {
        const persentase = (sasaran.terkumpulJumlah / sasaran.targetJumlah) * 100;
        sasaranListContainer.innerHTML += `
            <div class="kartu-sasaran">
                <h3>${sasaran.namaSasaran}</h3>
                <div class="progress-bar-container">
                    <div class="progress-bar-fill" style="width: ${persentase > 100 ? 100 : persentase}%"></div>
                </div>
                <div class="info-sasaran">
                    Terkumpul: ${formatRupiah(sasaran.terkumpulJumlah)} / ${formatRupiah(sasaran.targetJumlah)}
                </div>
                <button class="tombol-aksi btn-alokasi" data-id="${sasaran.id}" data-nama="${sasaran.namaSasaran}">＋ Alokasikan Dana</button>
            </div>
        `;
    });
}

function renderSasaranDiPengaturan(sasaranList) {
    daftarSasaranPengaturan.innerHTML = '';
    sasaranList.forEach(sasaran => {
        daftarSasaranPengaturan.innerHTML += `
            <div class="riwayat-item">
                <span>${sasaran.namaSasaran}</span>
                <div class="riwayat-item-kanan">
                    <button class="tombol-edit-tx" data-id="${sasaran.id}">✏️</button>
                    <button class="tombol-hapus-tx" data-id="${sasaran.id}">🗑️</button>
                </div>
            </div>
        `;
    });
}

// =================================================================
// FUNGSI UNTUK TRANSAKSI BERULANG
// =================================================================

async function cekDanJalankanTransaksiBerulang() {
    const now = new Date();
    const hariIni = now.getDate();
    const bulanIni = now.getMonth();
    const tahunIni = now.getFullYear();

    const berulangRef = collection(db, 'users', currentUser.uid, 'transaksiBerulang');
    const snapshot = await getDocs(query(berulangRef));

    const batch = writeBatch(db);
    let adaTransaksiBaru = false;

    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const terakhirDijalankan = data.terakhirDijalankan ? data.terakhirDijalankan.toDate() : null;
        
        if (data.hariEksekusi == hariIni) {
            let perluDijalankan = true;
            if (terakhirDijalankan) {
                if (terakhirDijalankan.getMonth() === bulanIni && terakhirDijalankan.getFullYear() === tahunIni) {
                    perluDijalankan = false;
                }
            }
            
            if (perluDijalankan) {
                const transaksiBaruRef = doc(collection(db, 'users', currentUser.uid, 'transaksi'));
                batch.set(transaksiBaruRef, {
                    tipe: data.tipe,
                    jumlah: data.jumlah,
                    kategori: data.kategori,
                    deskripsi: data.deskripsi,
                    timestamp: serverTimestamp()
                });
                batch.update(docSnap.ref, { terakhirDijalankan: serverTimestamp() });
                adaTransaksiBaru = true;
            }
        }
    });

    if (adaTransaksiBaru) {
        await batch.commit();
        showToast('Transaksi berulang berhasil dijalankan!');
    }
}

function renderTransaksiBerulangDiPengaturan(berulangList) {
    daftarTransaksiBerulang.innerHTML = '';
    berulangList.forEach(item => {
        daftarTransaksiBerulang.innerHTML += `
            <div class="riwayat-item">
                <span>${item.deskripsi} (Setiap tgl ${item.hariEksekusi})</span>
                <div class="riwayat-item-kanan">
                    <button class="tombol-edit-tx" data-id="${item.id}">✏️</button>
                    <button class="tombol-hapus-tx" data-id="${item.id}">🗑️</button>
                </div>
            </div>
        `;
    });
}

// =================================================================
// OPERASI DATA (CRUD) & LOGIKA FORM
// =================================================================
async function handleTransaksiSubmit(e) {
    e.preventDefault();
    const editId = transaksiForm.editTransaksiId.value;
    const data = {
        tipe: transaksiForm.tipe.value,
        jumlah: getRawNumber(transaksiForm.jumlah.value),
        kategori: transaksiForm.kategori.value,
        deskripsi: transaksiForm.deskripsi.value,
        timestamp: serverTimestamp()
    };

    try {
        if (editId) {
            const docRef = doc(db, 'users', currentUser.uid, 'transaksi', editId);
            await updateDoc(docRef, data);
            showToast('Transaksi berhasil diperbarui!');
        } else {
            const transaksiRef = collection(db, 'users', currentUser.uid, 'transaksi');
            await addDoc(transaksiRef, data);
            showToast('Transaksi berhasil ditambahkan!');
        }
        transaksiModal.close();
    } catch (error) {
        console.error("Error menyimpan transaksi:", error);
        showToast('Gagal menyimpan transaksi.', 'error');
    }
}

async function hapusTransaksi(id) {
    const confirmed = await showCustomConfirm('Anda yakin ingin menghapus transaksi ini?');
    if (confirmed) {
        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'transaksi', id));
            showToast('Transaksi berhasil dihapus.');
        } catch (error) {
            console.error("Error menghapus transaksi:", error);
            showToast('Gagal menghapus transaksi.', 'error');
        }
    }
}

async function bukaModalEdit(id) {
    try {
        const docRef = doc(db, 'users', currentUser.uid, 'transaksi', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const tx = docSnap.data();
            transaksiForm.reset();
            transaksiForm.querySelector('h2').textContent = 'Edit Transaksi';
            transaksiForm.editTransaksiId.value = id;
            transaksiForm.tipe.value = tx.tipe;
            transaksiForm.jumlah.value = formatRupiah(tx.jumlah);
            updateCategoryOptions(userDataCache, tx.tipe);
            transaksiForm.kategori.value = tx.kategori;
            transaksiForm.deskripsi.value = tx.deskripsi;
            transaksiModal.showModal();
        }
    } catch (error) {
        console.error("Error mengambil data transaksi:", error);
    }
}

async function handlePengaturanSubmit(e) {
    e.preventDefault();
    const userRef = doc(db, 'users', currentUser.uid);
    const anggaranBaru = {};
    document.querySelectorAll('.category-editor-row').forEach(row => {
        const nama = row.querySelector('.category-name-input').value.toLowerCase().trim();
        const jumlah = getRawNumber(row.querySelector('.category-amount-input').value);
        if (nama) anggaranBaru[nama] = jumlah;
    });

    try {
        await updateDoc(userRef, {
            nama: pengaturanForm.settingUserName.value,
            anggaran: anggaranBaru
        });
        pengaturanModal.close();
        showToast('Pengaturan berhasil diperbarui.');
    } catch (error) {
        console.error("Error menyimpan pengaturan:", error);
        showToast('Gagal menyimpan pengaturan.', 'error');
    }
}

async function resetSemuaData() {
    const confirmed = await showCustomConfirm('PERINGATAN! Ini akan menghapus SEMUA transaksi Anda secara permanen. Lanjutkan?', 'Reset Data');
    if (confirmed) {
        const transaksiRef = collection(db, 'users', currentUser.uid, 'transaksi');
        const snapshot = await getDocs(query(transaksiRef));
        
        if (snapshot.empty) {
            showCustomAlert('Tidak ada data transaksi untuk dihapus.');
            return;
        }

        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        
        try {
            await batch.commit();
            showCustomAlert('Semua data transaksi telah berhasil dihapus.');
        } catch (error) {
            console.error("Error saat reset data:", error);
            showCustomAlert('Gagal mereset data.', 'Error');
        }
    }
}

async function handleSasaranSubmit(e) {
    e.preventDefault();
    const id = sasaranForm.editSasaranId.value;
    const data = {
        namaSasaran: sasaranForm.namaSasaran.value,
        targetJumlah: getRawNumber(sasaranForm.targetJumlah.value),
    };

    if (!id) { // Tambah baru
        data.terkumpulJumlah = 0;
        data.tanggalDibuat = serverTimestamp();
        data.status = 'aktif';
        await addDoc(collection(db, 'users', currentUser.uid, 'sasaran'), data);
        showToast('Sasaran baru berhasil dibuat!');
    } else { // Edit
        await updateDoc(doc(db, 'users', currentUser.uid, 'sasaran', id), data);
        showToast('Sasaran berhasil diperbarui!');
    }
    sasaranModal.close();
}

async function bukaModalEditSasaran(id) {
    const docRef = doc(db, 'users', currentUser.uid, 'sasaran', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const sasaran = docSnap.data();
        sasaranForm.reset();
        sasaranForm.querySelector('h2').textContent = 'Edit Sasaran';
        sasaranForm.editSasaranId.value = id;
        sasaranForm.namaSasaran.value = sasaran.namaSasaran;
        sasaranForm.targetJumlah.value = formatRupiah(sasaran.targetJumlah);
        sasaranModal.showModal();
    }
}

async function hapusSasaran(id) {
    if (await showCustomConfirm('Yakin ingin menghapus sasaran ini? Dana yang sudah dialokasikan tidak akan kembali ke saldo.')) {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'sasaran', id));
        showToast('Sasaran berhasil dihapus.');
    }
}

async function handleAlokasiSubmit(e) {
    e.preventDefault();
    const sasaranId = alokasiForm.alokasiSasaranId.value;
    const jumlah = getRawNumber(alokasiForm.jumlahAlokasi.value);

    if (jumlah <= 0) return;

    const totalPemasukan = transaksiCache.filter(tx => tx.tipe === 'pemasukan').reduce((sum, tx) => sum + tx.jumlah, 0);
    const totalPengeluaran = transaksiCache.filter(tx => tx.tipe === 'pengeluaran').reduce((sum, tx) => sum + tx.jumlah, 0);
    const saldo = totalPemasukan - totalPengeluaran;
    if (jumlah > saldo) {
        showCustomAlert('Oops! Saldo kamu tidak mencukupi untuk alokasi ini.', 'Saldo Kurang');
        return;
    }

    const sasaranRef = doc(db, 'users', currentUser.uid, 'sasaran', sasaranId);
    const sasaranSnap = await getDoc(sasaranRef);

    if (sasaranSnap.exists()) {
        const sasaran = sasaranSnap.data();
        const terkumpulBaru = sasaran.terkumpulJumlah + jumlah;
        
        const transaksiData = {
            tipe: 'pengeluaran',
            kategori: 'investasi',
            deskripsi: `Alokasi untuk: ${sasaran.namaSasaran}`,
            jumlah: jumlah,
            timestamp: serverTimestamp()
        };
        
        const batch = writeBatch(db);
        batch.update(sasaranRef, { terkumpulJumlah: terkumpulBaru });
        batch.set(doc(collection(db, 'users', currentUser.uid, 'transaksi')), transaksiData);
        
        await batch.commit();
        showToast('Dana berhasil dialokasikan!');
        alokasiModal.close();
    }
}

async function handleBerulangSubmit(e) {
    e.preventDefault();
    const id = berulangForm.editBerulangId.value;
    const data = {
        deskripsi: berulangForm.berulangDeskripsi.value,
        jumlah: getRawNumber(berulangForm.berulangJumlah.value),
        tipe: berulangForm.berulangTipe.value,
        kategori: berulangForm.berulangKategori.value,
        hariEksekusi: parseInt(berulangForm.hariEksekusi.value),
    };

    if (!id) {
        await addDoc(collection(db, 'users', currentUser.uid, 'transaksiBerulang'), data);
        showToast('Transaksi berulang berhasil dibuat!');
    } else {
        await updateDoc(doc(db, 'users', currentUser.uid, 'transaksiBerulang', id), data);
        showToast('Transaksi berulang diperbarui!');
    }
    berulangModal.close();
}

async function bukaModalEditBerulang(id) {
    const docRef = doc(db, 'users', currentUser.uid, 'transaksiBerulang', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const item = docSnap.data();
        berulangForm.reset();
        berulangForm.querySelector('h2').textContent = 'Edit Transaksi Berulang';
        berulangForm.editBerulangId.value = id;
        berulangForm.berulangTipe.value = item.tipe;
        berulangForm.berulangDeskripsi.value = item.deskripsi;
        berulangForm.berulangJumlah.value = formatRupiah(item.jumlah);
        populateBerulangCategoryOptions(item.tipe);
        berulangForm.berulangKategori.value = item.kategori;
        berulangForm.hariEksekusi.value = item.hariEksekusi;
        berulangModal.showModal();
    }
}

async function hapusTransaksiBerulang(id) {
    if (await showCustomConfirm('Yakin ingin menghapus transaksi berulang ini?')) {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'transaksiBerulang', id));
        showToast('Transaksi berulang dihapus.');
    }
}


// =================================================================
// FUNGSI UI & HELPER
// =================================================================
function showToast(message, type = 'success') {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.className = '';
    toast.classList.add(type);
    toast.classList.add('show');
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showCustomAlert(message, title = 'Informasi') {
    customModalTitle.textContent = title;
    customModalText.textContent = message;
    customModalActions.innerHTML = '<button class="btn-primary">OK</button>';
    customModalActions.querySelector('button').onclick = () => customModal.close();
    customModal.showModal();
}

function showCustomConfirm(message, title = 'Konfirmasi') {
    return new Promise((resolve) => {
        customModalTitle.textContent = title;
        customModalText.textContent = message;
        customModalActions.innerHTML = `<button class="btn-secondary">Batal</button><button class="btn-danger">Ya, Lanjutkan</button>`;
        customModalActions.querySelector('.btn-secondary').onclick = () => { customModal.close(); resolve(false); };
        customModalActions.querySelector('.btn-danger').onclick = () => { customModal.close(); resolve(true); };
        customModal.showModal();
    });
}

function populateCategoryOptions(userData, tipeDipilih = 'pemasukan') {
    const selectKategori = document.getElementById('kategori');
    selectKategori.innerHTML = '';
    if (tipeDipilih === 'pemasukan') {
        selectKategori.innerHTML = '<option value="gaji">Gaji</option>';
    } else {
        if (userData && userData.anggaran) {
            Object.keys(userData.anggaran).forEach(kategori => {
                selectKategori.innerHTML += `<option value="${kategori}">${kategori.charAt(0).toUpperCase() + kategori.slice(1)}</option>`;
            });
        }
    }
}

function updateCategoryOptions() {
    const tipeTerpilih = transaksiForm.tipe.value;
    populateCategoryOptions(userDataCache, tipeTerpilih);
}

function populateBerulangCategoryOptions(tipeDipilih = 'pemasukan') {
    const select = document.getElementById('berulangKategori');
    select.innerHTML = '';
    if (tipeDipilih === 'pemasukan') {
        select.innerHTML = '<option value="gaji">Gaji</option><option value="lainnya">Lainnya</option>';
    } else {
        if (userDataCache && userDataCache.anggaran) {
            Object.keys(userDataCache.anggaran).forEach(kategori => {
                select.innerHTML += `<option value="${kategori}">${kategori.charAt(0).toUpperCase() + kategori.slice(1)}</option>`;
            });
        }
    }
}

function populatePengaturanForm(userData) {
    if (!userData) return;
    pengaturanForm.settingUserName.value = userData.nama;
    categoryEditorContainer.innerHTML = '';
    Object.entries(userData.anggaran).forEach(([nama, jumlah]) => {
        tambahBarisKategori(nama, jumlah);
    });
}

function tambahBarisKategori(nama = '', jumlah = 0) {
    const row = document.createElement('div');
    row.className = 'category-editor-row';
    row.innerHTML = `
        <input type="text" class="category-name-input" placeholder="Nama Kategori" value="${nama}" required>
        <input type="text" inputmode="numeric" class="category-amount-input" placeholder="Jumlah Anggaran" value="${formatRupiah(jumlah)}" required>
        <button type="button" class="tombol-hapus-kategori">×</button>
    `;
    categoryEditorContainer.appendChild(row);
    row.querySelector('.category-amount-input').addEventListener('input', (e) => e.target.value = formatRupiah(e.target.value));
    row.querySelector('.tombol-hapus-kategori').addEventListener('click', () => row.remove());
}

function applyTheme(theme) {
    if (theme === 'dark') document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
}

const formatRupiah = (value) => String(value || '').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const getRawNumber = (value) => parseInt(String(value || '0').replace(/\./g, ''));

// =================================================================
// EVENT LISTENERS
// =================================================================
// Buka Modal
tambahTransaksiBtn.addEventListener('click', () => {
    transaksiForm.reset();
    transaksiForm.querySelector('h2').textContent = 'Tambah Transaksi Baru';
    transaksiForm.editTransaksiId.value = '';
    updateCategoryOptions();
    transaksiModal.showModal();
});
bukaRiwayatBtn.addEventListener('click', () => {
    populateCategoryFilter(userDataCache);
    renderHistory(userDataCache, transaksiCache);
    riwayatModal.showModal();
});
bukaLaporanBtn.addEventListener('click', () => {
    renderLaporanBulanan(userDataCache, transaksiCache);
    laporanModal.showModal();
});
bukaPengaturanBtn.addEventListener('click', () => {
    populatePengaturanForm(userDataCache);
    pengaturanModal.showModal();
});

// Tutup Modal
document.querySelectorAll('.tutup-modal-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('dialog').close());
});

// Aksi Form
transaksiForm.addEventListener('submit', handleTransaksiSubmit);
pengaturanForm.addEventListener('submit', handlePengaturanSubmit);
sasaranForm.addEventListener('submit', handleSasaranSubmit)
tipeTransaksiContainer.addEventListener('change', updateCategoryOptions);
alokasiForm.addEventListener('submit', handleAlokasiSubmit);
berulangForm.addEventListener('submit', handleBerulangSubmit);

// Aksi di dalam Riwayat
riwayatListContainer.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;
    const id = target.dataset.id;
    if (target.classList.contains('tombol-hapus-tx')) hapusTransaksi(id);
    if (target.classList.contains('tombol-edit-tx')) bukaModalEdit(id);
});

// Aksi di dalam Pengaturan
tambahKategoriBtn.addEventListener('click', () => tambahBarisKategori());
resetDataBtn.addEventListener('click', resetSemuaData);
themeToggleBtn.addEventListener('click', () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    updateDoc(doc(db, 'users', currentUser.uid), { theme: isDarkMode ? 'dark' : 'light' });
});

// Aksi di dalam Sasaran (Halaman Utama)
sasaranListContainer.addEventListener('click', e => {
    const target = e.target;
    if (target.classList.contains('btn-alokasi')) {
        alokasiForm.reset();
        document.getElementById('alokasiNamaSasaran').textContent = target.dataset.nama;
        document.getElementById('alokasiSasaranId').value = target.dataset.id;
        alokasiModal.showModal();
    }
});

// Aksi di dalam Sasaran (Pengaturan)
daftarSasaranPengaturan.addEventListener('click', e => {
    const target = e.target.closest('button');
    if (!target) return;
    const id = target.dataset.id;
    if (target.classList.contains('tombol-edit-tx')) bukaModalEditSasaran(id);
    if (target.classList.contains('tombol-hapus-tx')) hapusSasaran(id);
});
tambahSasaranBtn.addEventListener('click', () => {
    sasaranForm.reset();
    sasaranForm.querySelector('h2').textContent = 'Tambah Sasaran Baru';
    sasaranForm.editSasaranId.value = '';
    sasaranModal.showModal();
});

// Aksi di dalam Transaksi Berulang (Pengaturan)
daftarTransaksiBerulang.addEventListener('click', e => {
    const target = e.target.closest('button');
    if (!target) return;
    const id = target.dataset.id;
    if (target.classList.contains('tombol-edit-tx')) bukaModalEditBerulang(id);
    if (target.classList.contains('tombol-hapus-tx')) hapusTransaksiBerulang(id);
});
tambahTransaksiBerulangBtn.addEventListener('click', () => {
    berulangForm.reset();
    berulangForm.querySelector('h2').textContent = 'Transaksi Berulang Baru';
    berulangForm.editBerulangId.value = '';
    populateBerulangCategoryOptions();
    berulangModal.showModal();
});
berulangForm.querySelectorAll('[name="berulangTipe"]').forEach(radio => {
    radio.addEventListener('change', (e) => populateBerulangCategoryOptions(e.target.value));
});

// Filter Riwayat & Format Angka
searchInput.addEventListener('input', () => renderHistory(userDataCache, transaksiCache));
filterKategori.addEventListener('change', () => renderHistory(userDataCache, transaksiCache));
filterTipeContainer.addEventListener('change', () => renderHistory(userDataCache, transaksiCache));
document.getElementById('jumlah').addEventListener('input', (e) => {
    e.target.value = formatRupiah(getRawNumber(e.target.value));
});
sasaranForm.targetJumlah.addEventListener('input', (e) => e.target.value = formatRupiah(getRawNumber(e.target.value)));
alokasiForm.jumlahAlokasi.addEventListener('input', (e) => e.target.value = formatRupiah(getRawNumber(e.target.value)));
berulangForm.berulangJumlah.addEventListener('input', (e) => e.target.value = formatRupiah(getRawNumber(e.target.value)));

function populateCategoryFilter(userData) {
    filterKategori.innerHTML = '<option value="semua">Semua Kategori</option><option value="gaji">Gaji</option>';
    if (userData && userData.anggaran) {
        Object.keys(userData.anggaran).forEach(kategori => {
            filterKategori.innerHTML += `<option value="${kategori}">${kategori.charAt(0).toUpperCase() + kategori.slice(1)}</option>`;
        });
    }
}