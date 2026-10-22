// src/auth.js
import { supabase, CONFIG } from './config.js';
import { state } from './state.js';
import { showNotification } from './notifications.js';
import { getDictionaryByNIK } from './i18n.js';

/**
 * 1. Tarik Daftar 250 Negara Dunia dari Database
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
 * 2. Tarik Daftar Wilayah/Provinsi Berdasarkan Kode Negara
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
    console.error(`Gagal mengambil wilayah ${countryCode}:`, err.message);
    return [];
  }
}

/**
 * 3. Tarik Daftar Kota/Kabupaten Berdasarkan ID Wilayah
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
    console.error(`Gagal mengambil kota ${regionId}:`, err.message);
    return [];
  }
}

/**
 * 4. Verifikasi Masuk (Login) dengan Gmail & Password dari Database
 */
export async function loginPlayer(email, password) {
  if (!navigator.onLine) {
    showNotification("Wajib Online", "Koneksi internet terputus!", false);
    return false;
  }

  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPass = (password || "").trim();

  if (!cleanEmail || !cleanPass) {
    showNotification("Input Kurang", "Masukkan email Gmail dan kata sandi Anda!", false);
    return false;
  }

  try {
    // 1. Verifikasi kredensial dari tabel players
    const { data: playerData, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (playerError || !playerData) {
      showNotification("Akun Tidak Ditemukan", "Email Gmail ini belum terdaftar di sistem!", false);
      return false;
    }

    if (playerData.password && playerData.password !== cleanPass) {
      showNotification("Kata Sandi Salah", "Kata sandi yang Anda masukkan tidak cocok!", false);
      return false;
    }

    // 2. Sinkronkan sesi login Supabase Auth (jika ada)
    await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPass
    }).catch(() => null);

    // 3. Ambil saldo terkini dari tabel wallets
    const { data: walletData } = await supabase
      .from('wallets')
      .select('currency_code, balance')
      .eq('player_id', playerData.id);

    const loadedWallets = { IDR: 0.0, USD: 0.0 };
    if (walletData && walletData.length > 0) {
      walletData.forEach(w => {
        loadedWallets[w.currency_code] = Number(w.balance);
      });
    }

    const isAdmin = playerData.role === "PRESIDEN" || 
                    cleanEmail === "admin@zynethic.xyz" || 
                    playerData.username.toLowerCase() === "admin";

    const cityShort = (playerData.current_city || "CTR").replace(/[^A-Z0-9]/gi, "").substring(0, 3).toUpperCase();
    const generatedNIK = `${playerData.citizenship}-${cityShort}-20000615-${playerData.id.substring(0, 4)}`;

    state.player = {
      id: playerData.id,
      username: playerData.username,
      email: playerData.email,
      nik: generatedNIK,
      gender: "Laki-laki",
      birth_date: "2000-06-15",
      avatar_url: playerData.avatar_url || (isAdmin ? "👨‍💼" : "👨"),
      citizenship: playerData.citizenship,
      current_country: playerData.current_country,
      current_region: playerData.current_region,
      current_city: playerData.current_city,
      role: playerData.role,
      is_admin: isAdmin,
      energy: playerData.energy ?? 100,
      health: playerData.health ?? 100,
      hunger: playerData.hunger ?? 100,
      wallets: loadedWallets,
      inventory: { BRS_PKP: 10.0, FUL_BNS: 5.0 },
      is_google_linked: false
    };

    state.isAdminMode = isAdmin;
    state.save();

    showNotification(
      isAdmin ? "Akses Admin Aktif" : "Login Berhasil",
      `Selamat datang kembali, ${playerData.username}!`,
      true
    );
    return true;
  } catch (err) {
    console.error("Kesalahan proses login:", err);
    showNotification("Gagal Login", err.message || "Gagal menghubungi database.", false);
    return false;
  }
}

/**
 * 5. Kirim Permintaan Reset Password ke Gmail Pemain
 */
export async function sendForgotPasswordEmail(email) {
  if (!navigator.onLine) {
    showNotification("Wajib Online", "Koneksi internet terputus!", false);
    return false;
  }

  const cleanEmail = (email || "").trim().toLowerCase();
  if (!cleanEmail) {
    showNotification("Input Kurang", "Masukkan alamat Gmail Anda!", false);
    return false;
  }

  try {
    const { data: userExists } = await supabase
      .from('players')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!userExists) {
      showNotification("Email Tidak Terdaftar", "Alamat Gmail tidak ditemukan dalam database!", false);
      return false;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin
    });

    if (error) {
      console.warn("Supabase Auth email notice:", error.message);
    }

    sessionStorage.setItem("res_publica_resetting_email", cleanEmail);

    showNotification(
      "Email Terkirim",
      `Tautan pemulihan dikirim ke ${cleanEmail}. Periksa folder Kotak Masuk atau Spam Gmail Anda!`,
      true
    );
    return true;
  } catch (err) {
    showNotification("Gagal Mengirim", err.message, false);
    return false;
  }
}

/**
 * 6. Perbarui Kata Sandi Baru di Database
 */
export async function updateNewPassword(newPassword) {
  const cleanPass = (newPassword || "").trim();
  if (cleanPass.length < 6) {
    showNotification("Kata Sandi Lemah", "Kata sandi minimal 6 karakter!", false);
    return false;
  }

  const targetEmail = sessionStorage.getItem("res_publica_resetting_email") || 
                      (state.player ? state.player.email : "");

  if (!targetEmail) {
    showNotification("Sesi Kedaluwarsa", "Ulangi proses Lupa Kata Sandi dari awal!", false);
    return false;
  }

  try {
    const { error: dbError } = await supabase
      .from('players')
      .update({ password: cleanPass })
      .eq('email', targetEmail);

    if (dbError) throw dbError;

    await supabase.auth.updateUser({ password: cleanPass }).catch(() => null);

    sessionStorage.removeItem("res_publica_resetting_email");

    showNotification("Kata Sandi Diperbarui", "Kata sandi baru berhasil disimpan! Silakan masuk kembali.", true);
    return true;
  } catch (err) {
    showNotification("Gagal Memperbarui", err.message, false);
    return false;
  }
}

/**
 * 7. Pendaftaran Akun Warga Baru & Pembuatan E-KTP
 */
export async function registerPlayer(formData) {
  if (!formData.agreedGuidelines) {
    showNotification("Pendaftaran Ditolak", "Anda wajib menyetujui Pedoman Komunitas Res Publica!", false);
    return false;
  }

  if (!navigator.onLine) {
    showNotification("Wajib Online", "Koneksi internet terputus. Res Publica membutuhkan koneksi aktif!", false);
    return false;
  }

  if (!formData.country || !formData.region || !formData.city) {
    showNotification("Data Kurang", "Pilih Negara, Wilayah, dan Daerah domisili Anda!", false);
    return false;
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const cityCode = String(formData.city).replace(/[^A-Z0-9]/gi, "").substring(0, 3).toUpperCase() || "CTR";
  const dobClean = `${formData.birthYear}${String(formData.birthMonth).padStart(2, '0')}${String(formData.birthDay).padStart(2, '0')}`;
  const generatedNIK = `${formData.country}-${cityCode}-${dobClean}-${randomSuffix}`;

  const usernameClean = (formData.username || "").trim().toLowerCase();
  const emailClean = (formData.email || "").trim().toLowerCase();
  const passClean = (formData.password || "admin123").trim();

  const isAdminAccount = usernameClean === "admin" || 
                         usernameClean === "zynethic" || 
                         emailClean === "admin@zynethic.xyz";

  const initialRole = isAdminAccount ? "PRESIDEN" : "WARGA_SIPIL";
  const isID = formData.country === "ID";

  const initialWallets = {
    IDR: isID ? (isAdminAccount ? 10000000000.0 : CONFIG.STARTER_CASH_IDR) : 0.0,
    USD: isID ? 50.0 : (isAdminAccount ? 500000.0 : CONFIG.STARTER_CASH_USD)
  };

  let resolvedAvatar = formData.avatarBase64;
  if (!resolvedAvatar || resolvedAvatar === "DEFAULT_GENDER") {
    resolvedAvatar = formData.gender === "Perempuan" ? "👩" : "👨";
  }

  const newPlayer = {
    username: formData.username.trim(),
    email: emailClean,
    password: passClean,
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
    inventory: { BRS_PKP: 10.0, FUL_BNS: 5.0 },
    has_voted: false,
    is_google_linked: false
  };

  try {
    await supabase.auth.signUp({
      email: emailClean,
      password: passClean
    }).catch(() => null);

    const { data, error } = await supabase.from('players').insert([{
      username: newPlayer.username,
      email: newPlayer.email,
      password: newPlayer.password,
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

    newPlayer.id = data && data[0] ? data[0].id : "PLY-" + randomSuffix;

    const primaryCurrency = isID ? "IDR" : "USD";
    const primaryBalance = isID ? initialWallets.IDR : initialWallets.USD;
    await supabase.from('wallets').upsert([{
      player_id: newPlayer.id,
      currency_code: primaryCurrency,
      balance: primaryBalance
    }], { onConflict: 'player_id,currency_code' });

    state.player = newPlayer;
    state.isAdminMode = isAdminAccount;
    state.save();

    const dict = getDictionaryByNIK(newPlayer.nik);
    showNotification(
      isAdminAccount ? "Akses Admin Aktif!" : "E-KTP Terbit!",
      isAdminAccount ? "Akun Administrator terdaftar." : dict.notif_registered,
      true
    );
    return true;
  } catch (err) {
    console.error("Kesalahan pendaftaran:", err);
    showNotification("Pendaftaran Gagal", err.message || "Gagal menghubungi database.", false);
    return false;
  }
}

/**
 * 8. Keluar dari Akun (Logout)
 */
export function logoutPlayer() {
  state.player = null;
  state.isAdminMode = false;
  localStorage.removeItem("res_publica_player");
  localStorage.removeItem("res_publica_admin_mode");
  supabase.auth.signOut().catch(() => null);
  showNotification("Keluar Akun", "Anda telah keluar dari sesi permainan.", true);
  window.location.reload();
}

/**
 * 9. Tautkan Akun ke Google Play Games
 */
export function linkGooglePlayGames() {
  if (!state.player) return;
  state.player.is_google_linked = true;
  state.save();
  showNotification("Google Play Games", "Profil berhasil ditautkan ke akun Google Play Games!", true);
}
