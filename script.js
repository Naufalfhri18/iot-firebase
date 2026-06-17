/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Smart Home IoT Dashboard Controller Script
 * Dibuat khusus untuk presentasi project kampus dengan clean code yang mudah dipahami.
 */

import { 
  db, ref, set, onValue, update,
  auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup 
} from './firebase-config.js';

// --- ELEMENT SELECTOR ---
const tempElement = document.getElementById('temp-val');
const humidElement = document.getElementById('humid-val');
const connectionStatusText = document.getElementById('conn-text');
const connectionStatusDot = document.getElementById('conn-dot');
const clockElement = document.getElementById('clock-val');
const dateElement = document.getElementById('date-val');

// Auth Layout Elements
const authLayout = document.getElementById('auth-layout');
const dashboardLayout = document.getElementById('dashboard-layout');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const btnLogin = document.getElementById('btn-login');
const btnRegisterToggle = document.getElementById('btn-register-toggle');
const btnGoogleLogin = document.getElementById('btn-google-login');
const btnLogout = document.getElementById('btn-logout');
const userDisplayEmail = document.getElementById('user-display-email');

// Audio wave & Transcript
const voiceBtn = document.getElementById('voice-btn');
const voiceStatusText = document.getElementById('voice-status-text');
const waveContainer = document.getElementById('voice-wave');
const transcriptText = document.getElementById('transcript-text');

// Activity Log
const logList = document.getElementById('log-list');
const btnClearLogs = document.getElementById('clear-logs-btn');

// Simulation Trigger
const btnSimulate = document.getElementById('btn-simulate');

// Array local untuk melacak status relay
const relayStates = {
  relay1: 0,
  relay2: 0,
  relay3: 0,
  relay4: 0
};

// --- MULTI-PROVIDER AUTHENTICATION SYSTEM ---
let isLoginMode = true;

// Friendly translate error code directly for academic styling
function getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Format alamat email salah atau tidak valid.';
    case 'auth/user-disabled':
      return 'Akun pengguna ini telah dinonaktifkan oleh administrator.';
    case 'auth/user-not-found':
      return 'Akun tidak ditemukan. Silakan tekan tombol Daftar di bawah.';
    case 'auth/wrong-password':
      return 'Kata sandi tidak sesuai. Silakan coba lagi.';
    case 'auth/email-already-in-use':
      return 'Alamat email sudah terdaftar. Silakan lakukan proses Log in.';
    case 'auth/invalid-credential':
      return 'Kredensial salah atau sudah kedaluwarsa.';
    case 'auth/weak-password':
      return 'Kata sandi tidak aman (Minimal berisi 6 karakter).';
    case 'auth/popup-closed-by-user':
      return 'Proses masuk Google ditutup sebelum otentikasi selesai.';
    case 'auth/operation-not-allowed':
      return 'Metode login ini belum diaktifkan di konsol Firebase.';
    default:
      return code || 'Terjadi gangguan otentikasi pada server Firebase.';
  }
}

// Register/Login Mode toggle listener
btnRegisterToggle.addEventListener('click', () => {
  const authCardHeaderParagraph = document.querySelector('.auth-card-header p');
  isLoginMode = !isLoginMode;
  if (!isLoginMode) {
    btnLogin.textContent = 'DAFTAR SEKARANG (REGISTER)';
    btnRegisterToggle.textContent = 'Sudah punya akun? Masuk Utama (Log In)';
    if (authCardHeaderParagraph) {
      authCardHeaderParagraph.textContent = 'Buat akun baru untuk mengelola kontrol IoT';
    }
  } else {
    btnLogin.textContent = 'MASUK UTAMA (LOG IN)';
    btnRegisterToggle.textContent = 'Belum punya akun? Buat Baru (Sign Up)';
    if (authCardHeaderParagraph) {
      authCardHeaderParagraph.textContent = 'Masukkan kredensial Anda untuk mengakses Kontrol IoT';
    }
  }
});

// Process auth submissions (Email/Password)
authForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = authEmail.value;
  const password = authPassword.value;
  
  authError.style.display = 'none';
  
  if (isLoginMode) {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        addActivityLog(`Akses disetujui. Selamat datang ${email}.`, 'info');
        showNotification('Login Berhasil', `Selamat datang, ${email}!`, '🔑');
      })
      .catch((error) => {
        authError.style.display = 'block';
        authError.textContent = `Kesalahan: ${getAuthErrorMessage(error.code)}`;
        addActivityLog(`Gagal login email: ${error.message}`, 'info');
      });
  } else {
    createUserWithEmailAndPassword(auth, email, password)
      .then(() => {
        addActivityLog(`Pendaftaran sukses untuk email: ${email}`, 'info');
        showNotification('Registrasi Sukses', 'Akun berhasil dibuat dan otomatis terhubung', '❇️');
      })
      .catch((error) => {
        authError.style.display = 'block';
        authError.textContent = `Kesalahan: ${getAuthErrorMessage(error.code)}`;
        addActivityLog(`Gagal mendaftar: ${error.message}`, 'info');
      });
  }
});

// Process Google provider authentications
btnGoogleLogin.addEventListener('click', () => {
  authError.style.display = 'none';
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then((result) => {
      addActivityLog(`Akses berhasil dikonfirmasi via Google: ${result.user.email}`, 'info');
      showNotification('Google Connected', `Berhasil menghubungkan Google: ${result.user.email}`, '🌐');
    })
    .catch((error) => {
      authError.style.display = 'block';
      authError.textContent = `Kesalahan Google: ${getAuthErrorMessage(error.code)}`;
      addActivityLog(`Google sign-in gagal: ${error.message}`, 'info');
    });
});

// Logout Observer/Trigger
btnLogout.addEventListener('click', () => {
  signOut(auth)
    .then(() => {
      addActivityLog('Sesi dibubarkan. Kembali ke gerbang otentikasi.', 'info');
      showNotification('Sesi Berakhir', 'Anda telah dinonaktifkan dari sistem', '🔌');
    })
    .catch((error) => {
      console.error('Logout error: ', error);
    });
});

// Main Auth Observer Loop
onAuthStateChanged(auth, (user) => {
  // Dismiss Loading Overlay if visible
  const loader = document.getElementById('loading-overlay');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('fade-out');
    }, 400);
  }

  if (user) {
    authLayout.style.setProperty('display', 'none', 'important');
    dashboardLayout.style.display = 'block';
    userDisplayEmail.textContent = user.email || user.displayName || 'Akun Aktif';
    addActivityLog(`Sesi aktif terdeteksi untuk: ${user.email}`, 'info');
  } else {
    dashboardLayout.style.display = 'none';
    authLayout.style.setProperty('display', 'flex', 'important');
  }
});


// --- REALTIME DIGITAL CLOCK ---
function updateClock() {
  const now = new Date();
  
  // Format Waktu: HH:MM:SS
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  clockElement.textContent = `${hours}:${minutes}:${seconds}`;

  // Format Tanggal: Hari, DD/MM/YYYY
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const dayName = days[now.getDay()];
  const dateNum = now.getDate();
  const monthName = months[now.getMonth()];
  const year = now.getFullYear();
  
  dateElement.textContent = `${dayName}, ${dateNum} ${monthName} ${year}`;
}
setInterval(updateClock, 1000);
updateClock(); // Run immediately

// --- FLOATING NOTIFICATION SYSTEM ---
const notifContainer = document.getElementById('notifications-container');

function showNotification(title, body, icon = '🔔') {
  // Buat element notifikasi baru
  const notif = document.createElement('div');
  notif.className = 'notification';
  notif.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-info">
      <span class="notification-title">${title}</span>
      <span class="notification-body">${body}</span>
    </div>
  `;
  notifContainer.appendChild(notif);

  // Trigger transisi slide-in ke dalam view
  setTimeout(() => {
    notif.classList.add('active');
  }, 50);

  // Hilangkan setelah 4 detik
  setTimeout(() => {
    notif.classList.remove('active');
    setTimeout(() => {
      notif.remove();
    }, 500);
  }, 4000);
}

// --- ACTIVITY LOGGER ---
function addActivityLog(text, tag = 'info') {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;

  const logItem = document.createElement('div');
  logItem.className = 'log-item';
  logItem.innerHTML = `
    <span class="log-time">[${timeStr}]</span>
    <span class="log-tag ${tag}">${tag}</span>
    <span class="log-text">${text}</span>
  `;

  logList.prepend(logItem); // Tambahkan yang paling baru di bagian atas

  // Batasi log maksimal 40 item agar memory tidak overload
  if (logList.childElementCount > 40) {
    logList.removeChild(logList.lastChild);
  }
}

// Event Clear Logs
btnClearLogs.addEventListener('click', () => {
  logList.innerHTML = '';
  addActivityLog('Log aktivitas berhasil dibersihkan.', 'info');
  showNotification('Log Cleared', 'Histori log berhasil dihapus', '🗑️');
});

// --- FIREBASE CONNECTION INTERACTION ---
// Path '.info/connected' adalah path bawaan Firebase SDK untuk memantau status jaringan client
const connectedRef = ref(db, '.info/connected');
onValue(connectedRef, (snap) => {
  if (snap.val() === true) {
    connectionStatusText.textContent = 'DATABASE CONNECTED';
    connectionStatusDot.className = 'status-dot online';
    addActivityLog('Terhubung dengan Firebase Realtime Database.', 'db');
    
    // Hilangkan loading overlay jika terhubung
    const loader = document.getElementById('loading-overlay');
    if (loader) {
      setTimeout(() => {
        loader.classList.add('fade-out');
      }, 800);
    }
  } else {
    connectionStatusText.textContent = 'DATABASE OFFLINE';
    connectionStatusDot.className = 'status-dot';
    addActivityLog('Koneksi terputus dari Firebase Database.', 'info');
  }
});

// Semisal database baru belum memiliki struktur yang sesuai, kita lakukan inisialisasi awal.
onValue(ref(db), (snapshot) => {
  if (!snapshot.exists()) {
    addActivityLog('Mendeteksi database baru kosong, menginisialisasi skema awal...', 'info');
    set(ref(db), {
      relay: {
        relay1: 0,
        relay2: 0,
        relay3: 0,
        relay4: 0
      },
      sensor: {
        temperature: 28.4,
        humidity: 65
      }
    }).then(() => {
      addActivityLog('Inisialisasi database berhasil!', 'db');
    }).catch(err => {
      console.error(err);
    });
  }
}, { onlyOnce: true });

// --- MONITORING SENSOR ---
// Listen data dari jalur 'sensor' di Firebase
onValue(ref(db, 'sensor'), (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    const tempValue = parseFloat(data.temperature).toFixed(1);
    const humidValue = Math.round(data.humidity);

    tempElement.textContent = tempValue;
    humidElement.textContent = humidValue;

    // Update efek warna visual saat nilai berubah drastis
    if (tempValue > 32) {
      tempElement.className = 'sensor-value temp-glow text-red-500';
    } else if (tempValue < 24) {
      tempElement.className = 'sensor-value text-blue-400';
    } else {
      tempElement.className = 'sensor-value text-emerald-400';
    }

    addActivityLog(`Pembaruan Data Sensor: Suhu: ${tempValue}°C, Kelembaban: ${humidValue}%`, 'db');
  }
});

// --- RELAY CONTROLS & LISTENERS ---
const relayCardIds = ['relay1-card', 'relay2-card', 'relay3-card', 'relay4-card'];

// Event Listener untuk tombol Relay ON/OFF di Dashboard
for (let i = 1; i <= 4; i++) {
  const btnOn = document.getElementById(`r${i}-on`);
  const btnOff = document.getElementById(`r${i}-off`);

  btnOn.addEventListener('click', () => {
    setRelayState(i, 1, 'Manual Dashboard');
  });

  btnOff.addEventListener('click', () => {
    setRelayState(i, 0, 'Manual Dashboard');
  });
}

// Master Controls
document.getElementById('btn-master-on').addEventListener('click', () => {
  addActivityLog('Mengaktifkan seluruh relay secara massal...', 'info');
  update(ref(db, 'relay'), {
    relay1: 1,
    relay2: 1,
    relay3: 1,
    relay4: 1
  }).then(() => {
    showNotification('Master ON', 'Semua perangkat telah dinyalakan', '💡');
  });
});

document.getElementById('btn-master-off').addEventListener('click', () => {
  addActivityLog('Mematikan seluruh relay secara massal...', 'info');
  update(ref(db, 'relay'), {
    relay1: 0,
    relay2: 0,
    relay3: 0,
    relay4: 0
  }).then(() => {
    showNotification('Master OFF', 'Semua perangkat telah dimatikan', '🔌');
  });
});

// Variation 1 & 2 Custom Buttons Listener
document.getElementById('btn-variation-1').addEventListener('click', () => {
  addActivityLog('Mengaktifkan Variasi 1 (Alternate: Lampu 1, 3 ON & Lampu 2, 4 OFF)...', 'info');
  update(ref(db, 'relay'), {
    relay1: 1,
    relay2: 0,
    relay3: 1,
    relay4: 0
  }).then(() => {
    showNotification('Variasi 1 Aktif', 'Lampu 1 & 3 ON, Lampu 2 & 4 OFF', '⚡');
  });
});

document.getElementById('btn-variation-2').addEventListener('click', () => {
  addActivityLog('Mengaktifkan Variasi 2 (Split: Lampu 2, 4 ON & Lampu 1, 3 OFF)...', 'info');
  update(ref(db, 'relay'), {
    relay1: 0,
    relay2: 1,
    relay3: 0,
    relay4: 1
  }).then(() => {
    showNotification('Variasi 2 Aktif', 'Lampu 2 & 4 ON, Lampu 1 & 3 OFF', '⚡');
  });
});

// Fungsi pembantu untuk set Relay di Firebase
function setRelayState(index, value, triggerSource) {
  const relayPath = `relay/relay${index}`;
  set(ref(db, relayPath), value)
    .then(() => {
      addActivityLog(`Lampu ${index} diubah menjadi ${value === 1 ? 'ON' : 'OFF'} via ${triggerSource}`, 'db');
      showNotification(
        `Lampu ${index} ${value === 1 ? 'Aktif' : 'Nonaktif'}`,
        `Berhasil dirubah via ${triggerSource}`,
        value === 1 ? '💡' : '🌑'
      );
    })
    .catch((error) => {
      addActivityLog(`Gagal merubah relay: ${error.message}`, 'info');
    });
}

// Mendengarkan perubahan status Relay dari Firebase secara Realtime
onValue(ref(db, 'relay'), (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    
    for (let i = 1; i <= 4; i++) {
      const state = data[`relay${i}`];
      relayStates[`relay${i}`] = state;
      
      const card = document.getElementById(`relay${i}-card`);
      const statusText = document.getElementById(`r${i}-status-text`);
      const statusIndicator = document.getElementById(`r${i}-status`);

      if (state === 1) {
        card.classList.add('active');
        statusText.textContent = 'ACTIVE';
        statusIndicator.className = 'relay-status-indicator on';
      } else {
        card.classList.remove('active');
        statusText.textContent = 'INACTIVE';
        statusIndicator.className = 'relay-status-indicator';
      }
    }
  }
});

// --- VOICE COMMAND (WEB SPEECH API) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = 'id-ID'; // Menggunakan bahasa Indonesia
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  voiceBtn.addEventListener('click', () => {
    if (voiceBtn.classList.contains('listening')) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        voiceBtn.classList.add('listening');
        voiceStatusText.textContent = 'MENYIMAK SUARA...';
        waveContainer.classList.add('active');
        transcriptText.innerHTML = '<p class="has-text">Silahkan katakan perintah...</p>';
      } catch (err) {
        console.error(err);
      }
    }
  });

  recognition.onstart = () => {
    addActivityLog('Voice recognition dimulai.', 'info');
  };

  recognition.onresult = (event) => {
    const speechResult = event.results[0][0].transcript.toLowerCase();
    transcriptText.innerHTML = `<span style="color: var(--color-cyan); font-weight:700;">"${speechResult}"</span>`;
    addActivityLog(`Suara didengar: ${speechResult}`, 'voice');
    
    processVoiceCommand(speechResult);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    voiceStatusText.textContent = 'KLIK UNTUK SUARA / REKOR';
    voiceBtn.classList.remove('listening');
    waveContainer.classList.remove('active');
    transcriptText.innerHTML = `<p style="color:var(--color-red);">Error: ${event.error}</p>`;
    showNotification('Voice Error', 'Gagal memproses suara atau mic diblokir.', '❌');
  };

  recognition.onend = () => {
    voiceBtn.classList.remove('listening');
    voiceStatusText.textContent = 'KLIK UNTUK SUARA / REKOR';
    waveContainer.classList.remove('active');
    addActivityLog('Voice recognition dinonaktifkan.', 'info');
  };
} else {
  voiceBtn.style.opacity = '0.5';
  voiceBtn.style.cursor = 'not-allowed';
  voiceStatusText.textContent = 'SPEECH API TIDAK DIDUKUNG BROWSER';
  transcriptText.innerHTML = '<p class="text-red-400">Silakan gunakan Google Chrome untuk mendukung Kontrol Suara.</p>';
}

// Fungsi untuk membalikkan suara (Text-to-Speech) respon AI
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Hentikan ucapan yang sedang berjalan
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.05; // Sedikit lebih cepat agar responsif
    utterance.pitch = 1.0;
    
    // Cari suara bahasa Indonesia jika didukung oleh sistem operasi/browser
    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('id-ID'));
    if (idVoice) {
      utterance.voice = idVoice;
    }
    window.speechSynthesis.speak(utterance);
  }
}

// Pre-initialize Speech Synthesis voices
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
}

// Fungsi Parser Perintah Suara Pintar Bahasa Indonesia
function processVoiceCommand(command) {
  let matched = false;
  
  // Normalisasi suara bahasa Indonesia: ubah kata angka menjadi digit
  let cleanCommand = command.toLowerCase()
    .replace(/satu/g, '1')
    .replace(/dua/g, '2')
    .replace(/tiga/g, '3')
    .replace(/empat/g, '4')
    .replace(/one/g, '1')
    .replace(/two/g, '2')
    .replace(/three/g, '3')
    .replace(/four/g, '4')
    .trim();

  addActivityLog(`Memproses Perintah (Normal): "${cleanCommand}"`, 'voice');

  // --- 1. PERINTAH BACA TELEMETRI (SUHU DAN KELEMBABAN) ---
  if (/berapa (suhu|temperatur)|(suhu|temperatur) berapa|baca (suhu|temperatur)|cek (suhu|temperatur)/i.test(cleanCommand)) {
    const tempVal = tempElement.textContent;
    const responseText = `Suhu ruangan saat ini adalah ${tempVal.replace('.', ',')} derajat Celsius.`;
    addActivityLog(`Respon AI: "${responseText}"`, 'info');
    showNotification('Sensors Readout', `Suhu diproses: ${tempVal}°C`, '🌡️');
    speakText(responseText);
    matched = true;
  }
  else if (/berapa (kelembaban|kelembapan)|(kelembaban|kelembapan) berapa|baca (kelembaban|kelembapan)|cek (kelembaban|kelembapan)/i.test(cleanCommand)) {
    const humidVal = humidElement.textContent;
    const responseText = `Kelembaban udara saat ini adalah ${humidVal} persen.`;
    addActivityLog(`Respon AI: "${responseText}"`, 'info');
    showNotification('Sensors Readout', `Kelembaban diproses: ${humidVal}%`, '💧');
    speakText(responseText);
    matched = true;
  }

  // --- 2. PERINTAH LAMPU INDIVIDUAL (LAMPU 1, 2, 3, 4) ---
  // NYALAKAN LAMPU X
  else if (/(nyalakan|hidupkan|aktifkan|on|turn on|switch on).*(lampu\s*1|1)/i.test(cleanCommand) || /(lampu\s*1|1).*(nyala|hidup|aktif)/i.test(cleanCommand)) {
    setRelayState(1, 1, 'Suara Pintar');
    speakText('Lampu satu dinyalakan.');
    matched = true;
  }
  else if (/(matikan|padamkan|nonaktifkan|off|turn off|switch off).*(lampu\s*1|1)/i.test(cleanCommand) || /(lampu\s*1|1).*(mati|padam|nonaktif)/i.test(cleanCommand)) {
    setRelayState(1, 0, 'Suara Pintar');
    speakText('Lampu satu dimatikan.');
    matched = true;
  }
  
  else if (/(nyalakan|hidupkan|aktifkan|on|turn on|switch on).*(lampu\s*2|2)/i.test(cleanCommand) || /(lampu\s*2|2).*(nyala|hidup|aktif)/i.test(cleanCommand)) {
    setRelayState(2, 1, 'Suara Pintar');
    speakText('Lampu dua dinyalakan.');
    matched = true;
  }
  else if (/(matikan|padamkan|nonaktifkan|off|turn off|switch off).*(lampu\s*2|2)/i.test(cleanCommand) || /(lampu\s*2|2).*(mati|padam|nonaktif)/i.test(cleanCommand)) {
    setRelayState(2, 0, 'Suara Pintar');
    speakText('Lampu dua dimatikan.');
    matched = true;
  }
  
  else if (/(nyalakan|hidupkan|aktifkan|on|turn on|switch on).*(lampu\s*3|3)/i.test(cleanCommand) || /(lampu\s*3|3).*(nyala|hidup|aktif)/i.test(cleanCommand)) {
    setRelayState(3, 1, 'Suara Pintar');
    speakText('Lampu tiga dinyalakan.');
    matched = true;
  }
  else if (/(matikan|padamkan|nonaktifkan|off|turn off|switch off).*(lampu\s*3|3)/i.test(cleanCommand) || /(lampu\s*3|3).*(mati|padam|nonaktif)/i.test(cleanCommand)) {
    setRelayState(3, 0, 'Suara Pintar');
    speakText('Lampu tiga dimatikan.');
    matched = true;
  }
  
  else if (/(nyalakan|hidupkan|aktifkan|on|turn on|switch on).*(lampu\s*4|4)/i.test(cleanCommand) || /(lampu\s*4|4).*(nyala|hidup|aktif)/i.test(cleanCommand)) {
    setRelayState(4, 1, 'Suara Pintar');
    speakText('Lampu empat dinyalakan.');
    matched = true;
  }
  else if (/(matikan|padamkan|nonaktifkan|off|turn off|switch off).*(lampu\s*4|4)/i.test(cleanCommand) || /(lampu\s*4|4).*(mati|padam|nonaktif)/i.test(cleanCommand)) {
    setRelayState(4, 0, 'Suara Pintar');
    speakText('Lampu empat dimatikan.');
    matched = true;
  }

  // --- 3. PERINTAH MASSAL (SEMUA LAMPU) ---
  else if (/(nyalakan|hidupkan|aktifkan|on).*(semua|all)/i.test(cleanCommand) || /(semua|all).*(nyala|hidup|aktif)/i.test(cleanCommand) || /nyalakan lampu/i.test(cleanCommand)) {
    update(ref(db, 'relay'), { relay1: 1, relay2: 1, relay3: 1, relay4: 1 })
      .then(() => {
        addActivityLog('Semua relay dinyalakan via Kontrol Suara.', 'voice');
        showNotification('Semua lobi Aktif', 'Perintah suara menyalakan seisi ruangan', '💡');
        speakText('Semua lampu berhasil dinyalakan.');
      });
    matched = true;
  } else if (/(matikan|padamkan|nonaktifkan|off).*(semua|all)/i.test(cleanCommand) || /(semua|all).*(mati|padam|nonaktif)/i.test(cleanCommand) || /matikan lampu/i.test(cleanCommand)) {
    update(ref(db, 'relay'), { relay1: 0, relay2: 0, relay3: 0, relay4: 0 })
      .then(() => {
        addActivityLog('Semua relay dimatikan via Kontrol Suara.', 'voice');
        showNotification('Semua lobi Nonaktif', 'Perintah suara meredupkan seisi ruangan', '🔌');
        speakText('Semua lampu berhasil dimatikan.');
      });
    matched = true;
  }
  
  // --- 4. PERINTAH VARIASI PRESET ---
  else if (/variasi (1|one)/i.test(cleanCommand)) {
    update(ref(db, 'relay'), { relay1: 1, relay2: 0, relay3: 1, relay4: 0 })
      .then(() => {
        addActivityLog('Variasi 1 (Alternate) diaktifkan via Kontrol Suara.', 'voice');
        showNotification('Variasi 1 Aktif', 'Lampu 1 & 3 dinyalakan (Alternate)', '⚡');
        speakText('Variasi satu berhasil diaktifkan.');
      });
    matched = true;
  } else if (/variasi (2|two)/i.test(cleanCommand)) {
    update(ref(db, 'relay'), { relay1: 0, relay2: 1, relay3: 0, relay4: 1 })
      .then(() => {
        addActivityLog('Variasi 2 (Split) diaktifkan via Kontrol Suara.', 'voice');
        showNotification('Variasi 2 Aktif', 'Lampu 2 & 4 dinyalakan (Split)', '⚡');
        speakText('Variasi dua berhasil diaktifkan.');
      });
    matched = true;
  }

  // Jika perintah tidak cocok
  if (!matched) {
    showNotification('Gagal Mengenali', 'Perintah tidak terdaftar di daftar panduan.', '❓');
    addActivityLog(`Perintah suara tak dikenal: "${command}"`, 'info');
    speakText('Perintah tidak dikenali. Silakan coba lagi.');
  }
}

// --- SIMULATED HARDWARE DRIFT (DHT11 SIMULATOR) ---
// Sangat berguna untuk simulasi interaktif tanpa perlu device hardware ESP32 menyala!
let simulationActive = false;
let simulationInterval = null;

btnSimulate.addEventListener('click', () => {
  if (simulationActive) {
    clearInterval(simulationInterval);
    simulationActive = false;
    btnSimulate.textContent = 'Simulate DHT11';
    btnSimulate.classList.remove('listening');
    addActivityLog('Simulasi drift perangkat DHT11 dihentikan.', 'info');
    showNotification('Simulasi Berhenti', 'Sensor DHT11 kembali ke status standar.', '🛑');
  } else {
    simulationActive = true;
    btnSimulate.textContent = 'Simulating...';
    btnSimulate.classList.add('listening');
    addActivityLog('Simulasi drift perangkat DHT11 dimulai (interval 4s).', 'info');
    showNotification('Simulasi Aktif', 'Data suhu dan kelembaban akan bervariasi otomatis!', '🧪');
    
    // Setiap 4 detik hasilkan fluktuasi data suhu / kelembaban realistis
    simulationInterval = setInterval(() => {
      const currentTemp = parseFloat(tempElement.textContent);
      const currentHumid = parseInt(humidElement.textContent);
      
      // Hitung fluktuasi acak delta (+/- 0.4 C dan +/- 2 %)
      const deltaTemp = (Math.random() * 0.8 - 0.4);
      const deltaHumid = Math.round(Math.random() * 4 - 2);
      
      let newTemp = Math.min(Math.max(currentTemp + deltaTemp, 22.0), 38.5);
      let newHumid = Math.min(Math.max(currentHumid + deltaHumid, 45), 90);

      // Pastikan format aman
      newTemp = parseFloat(newTemp.toFixed(1));
      newHumid = Math.round(newHumid);

      // Kirim ke Firebase Realtime Database
      update(ref(db, 'sensor'), {
        temperature: newTemp,
        humidity: newHumid
      });
    }, 4000);
  }
});

// --- EDUCATIONAL SHIELDS (TABS CONTROL) ---
const tabs = document.querySelectorAll('.edu-tab-btn');
const tabContents = document.querySelectorAll('.edu-tab-content');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Nonaktifkan seluruh tab active
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));

    // Aktifkan tab ini
    tab.classList.add('active');
    const contentId = `${tab.id}-content`;
    document.getElementById(contentId).classList.add('active');
  });
});

// Jika user menekan Escape, hilangkan loader seandainya stuck di environment sandbox
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const loader = document.getElementById('loading-overlay');
    if (loader && !loader.classList.contains('fade-out')) {
      loader.classList.add('fade-out');
      addActivityLog('Loading Overlay dilewati via tekan tombol ESC.', 'info');
    }
  }
});
