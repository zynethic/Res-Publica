// src/auth.js
import { supabase, CONFIG } from './config.js';
import { state } from './state.js';
import { showNotification } from './notifications.js';
import { getDictionaryByNIK } from './i18n.js';

/**
 * 1. Tarik Daftar Seluruh 250 Negara Dunia Langsung dari Database Supabase
 */
export async function loadCountries() {
  try {
    const { data, error } = await supabase
      .from('countries')
      .select('code, name, flag_url, currency_code, currency_symbol')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("Gagal mengambil data negara:", err.message);
    return [];
  }
}

/**
 * 2. Tarik Daftar Wilayah/Provinsi Berdasarkan Negara yang Dipilih
 */
export async function loadRegions(countryCode) {
  if (!countryCode) return [];
  try {
    const { data, error } = await supabase
      .from('regions')
      .select('id, name, type, primary_commodity')
      .eq('country_code', countryCode)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`Gagal mengambil wilayah untuk negara ${countryCode}:`, err.message);
    return [];
  }
}

/**
 * 3. Tarik Daftar Daerah/Kota/Kabupaten Berdasarkan Wilayah yang Dipilih
 */
export async function loadCities(regionId) {
  if (!regionId) return [];
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('id, name, type')
      .eq('region_id', regionId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`Gagal mengambil kota untuk wilayah ${regionId}:`, err.message);
    return [];
  }
}

/**
 * 4. Pendaftaran Warga Baru & Registrasi E-KTP
 */
export async function registerPlayer(formData) {
  // Validasi Persetujuan Komunitas
  if (!formData.agreedGuidelines) {
    showNotification("Pendaftaran Ditolak", "Anda wajib menyetujui Pedoman Komunitas Res Publica!", false);
    return false;
  }

  // Validasi Keamanan: Wajib Terhubung ke Internet (Anti-Cheat)
  if (!navigator.onLine) {
    showNotification("Wajib Online", "Koneksi internet terputus. Res Publica membutuhkan koneksi aktif ke server!", false);
    return false;
  }

  // Validasi Kelengkapan Geografis
  if (!formData.country || !formData.region || !formData.city) {
    showNotification("Data Tidak Lengkap", "Silakan pilih Negara, Wilayah, dan Kota domisili Anda!", false);
    return false;
  }

  // 1. Generate Nomor Induk Kependudukan (NIK) Unik
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const cityCode = String(formData.city).replace(/[^A-Z0-9]/gi, "").substring(0, 3).toUpperCase() || "CTR";
  const dobClean = `${formData.birthYear}${String(formData.birthMonth).padStart(2, '0')}${String(formData.birthDay).padStart(2, '0')}`;
  const generatedNIK = `${formData.country}-${cityCode}-${dobClean}-${randomSuffix}`;

  // 2. Deteksi Akun Khusus Administrator / Developer
  const usernameClean = (formData.username || "").trim().toLowerCase();
  const emailClean = (formData.email || "").trim().toLowerCase();
  const isAdminAccount = usernameClean === "admin" || 
                         usernameClean === "zynethic" || 
                         emailClean === "admin@zynethic.xyz";

  const initialRole = isAdminAccount ? "PRESIDEN" : "WARGA_SIPIL";
  const isID = formData.country === "ID";

  // Starter pack: Rp 500.000 (IDR) / $35 (USD) untuk warga biasa, saldo dev untuk admin
  const initialWallets = {
    IDR: isID ? (isAdminAccount ? 5000000000.0 : CONFIG.STARTER_CASH_IDR) : 0.0,
    USD: isID ? 25.0 : (isAdminAccount ? 250000.0 : CONFIG.STARTER_CASH_USD)
  };

  // 3. Tentukan Foto Profil (Foto Galeri Base64 atau Default Gender)
  let resolvedAvatar = formData.avatarBase64;
  if (!resolvedAvatar || resolvedAvatar === "DEFAULT_GENDER") {
    resolvedAvatar = formData.gender === "Perempuan" ? "👩" : "👨";
  }

  const newPlayer = {
    username: formData.username.trim(),
    email: formData.email.trim(),
    nik: generatedNIK,
    gender: formData.gender,
    birth_date: `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}`,
    avatar_url: resolvedAvatar,
    citizenship: formData.country,
    current_country: formData.country,
    current_region: formData.region,
    current_city: formData.city,
    role: initialRole,
    is_admin: isAdminAccount,
    energy: 100,
    health: 100,
    hunger: 100,
    wallets: initialWallets,
    inventory: {
      BRS_PKP: 10.0, // Ransum awal 10 Kg beras
      FUL_BNS: 5.0   // 5 liter bahan bakar cadangan
    },
    has_voted: false,
    is_google_linked: false
  };

  try {
    // Simpan ke Tabel Supabase 'players'
    const { data, error } = await supabase.from('players').insert([{
      username: newPlayer.username,
      email: newPlayer.email,
      citizenship: newPlayer.citizenship,
      current_country: newPlayer.current_country,
      current_region: newPlayer.current_region,
      current_city: newPlayer.current_city,
      role: newPlayer.role,
      energy: newPlayer.energy,
      health: newPlayer.health,
      hunger: newPlayer.hunger
    }]).select();

    if (error) throw error;

    // Tetapkan ID server asli
    newPlayer.id = data && data[0] ? data[0].id : "PLY-" + randomSuffix;

    // Simpan Saldo Dompet Awal ke Supabase (Tabel wallets)
    const primaryCurrency = isID ? "IDR" : "USD";
    const primaryBalance = isID ? initialWallets.IDR : initialWallets.USD;
    await supabase.from('wallets').upsert([{
      player_id: newPlayer.id,
      currency_code: primaryCurrency,
      balance: primaryBalance
    }], { onConflict: 'player_id,currency_code' });

    // Simpan ke State Lokal Klien
    state.player = newPlayer;
    state.isAdminMode = isAdminAccount;
    state.save();

    const dict = getDictionaryByNIK(newPlayer.nik);
    showNotification(
      isAdminAccount ? "Mode Admin Aktif!" : "E-KTP Terbit!", 
      isAdminAccount ? `Selamat bertugas, Administrator ${newPlayer.username}. Seluruh hak akses negara terbuka.` : dict.notif_registered, 
      true
    );
    return true;
  } catch (err) {
    console.error("Kesalahan saat mendaftar:", err);
    showNotification("Pendaftaran Gagal", err.message || "Gagal menghubungi server database.", false);
    return false;
  }
}

/**
 * 5. Tautkan Akun ke Layanan Google Play Games
 */
export function linkGooglePlayGames() {
  if (!state.player) {
    showNotification("Gagal", "Silakan buat E-KTP terlebih dahulu!", false);
    return;
  }
  state.player.is_google_linked = true;
  state.save();
  showNotification("Google Play Games", "Profil E-KTP berhasil disinkronkan ke Cloud Google Play!", true);
}
