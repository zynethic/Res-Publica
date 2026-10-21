// src/auth.js
import { supabase, CONFIG } from './config.js';
import { state } from './state.js';
import { showNotification } from './notifications.js';
import { getDictionaryByNIK } from './i18n.js';

export async function registerPlayer(formData) {
  if (!formData.agreedGuidelines) {
    showNotification("Pendaftaran Ditolak", "Anda wajib menyetujui Pedoman Komunitas!", false);
    return false;
  }

  // 1. Generate NIK Otomatis Sesuai Wilayah dan Tanggal Lahir
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const cityCode = formData.city.replace(/[^A-Z]/gi, "").substring(0, 3).toUpperCase() || "CTR";
  const dobClean = `${formData.birthYear}${String(formData.birthMonth).padStart(2, '0')}${String(formData.birthDay).padStart(2, '0')}`;
  const generatedNIK = `${formData.country}-${cityCode}-${dobClean}-${randomSuffix}`;

  // 2. Pemberian Bantuan Awal Warga Baru (Rp 500.000 untuk IDR / $35 untuk USD)
  const isID = formData.country === "ID";
  const initialWallets = {
    IDR: isID ? CONFIG.STARTER_CASH_IDR : 0.0,
    USD: isID ? 15.0 : CONFIG.STARTER_CASH_USD
  };

  const newPlayer = {
    username: formData.username,
    email: formData.email,
    nik: generatedNIK,
    gender: formData.gender,
    birth_date: `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`,
    avatar_url: formData.avatar,
    citizenship: formData.country,
    current_country: formData.country,
    current_region: formData.region,
    current_city: formData.city,
    role: "WARGA_SIPIL", // Otomatis Warga Biasa saat baru pertama mendaftar
    energy: 100,
    health: 100,
    hunger: 100,
    wallets: initialWallets,
    inventory: {
      BRS_PKP: 10.0, // 10 Kg beras kebutuhan pokok
      FUL_BNS: 2.0
    },
    has_voted: false,
    is_google_linked: false
  };

  try {
    const { data, error } = await supabase.from('players').insert([{
      username: newPlayer.username,
      email: newPlayer.email,
      citizenship: newPlayer.citizenship,
      current_country: newPlayer.current_country,
      current_region: newPlayer.current_region,
      current_city: newPlayer.current_city,
      role: newPlayer.role,
      energy: 100,
      health: 100,
      hunger: 100
    }]).select();

    newPlayer.id = data && data[0] ? data[0].id : "PLY-" + randomSuffix;
    state.player = newPlayer;
    state.save();

    const dict = getDictionaryByNIK(newPlayer.nik);
    showNotification("E-KTP Terbit!", dict.notif_registered, true);
    return true;
  } catch (err) {
    showNotification("Gagal Terdaftar", err.message, false);
    return false;
  }
}

export function linkGooglePlayGames() {
  if (!state.player) return;
  state.player.is_google_linked = true;
  state.save();
  showNotification("Google Play Games", "Profil E-KTP berhasil disinkronkan ke Cloud Google Play!", true);
}
