// src/app.js
import { supabase } from './config.js';
import { state } from './state.js';
import { loadCountries, loadRegions, loadCities, registerPlayer, loginPlayer, logoutPlayer, sendForgotPasswordEmail, updateNewPassword, linkGooglePlayGames } from './auth.js';
import { getDictionaryByNIK } from './i18n.js';
import { jobMarket, applyJob, doWorkShift, consumeFood } from './economy.js';
import { sendChatMessage, setActiveChannel } from './chat.js';
import { getFiscalReport, allocateAPBNFunds, ratifyAPBNBill } from './apbn.js';
import { worldNations, travelToCountry } from './map.js';
import { ADMIN_ROLES, switchAdminRole, grantAdminFunds } from './admin.js';
import { showNotification } from './notifications.js';

let customAvatarData = "";
let activeShiftCountdownInterval = null;

export async function initGame() {
  window.addEventListener('offline', () => {
    showNotification("Jaringan Terputus", "Game Res Publica wajib terhubung dengan internet!", false);
  });

  // Listener link reset password dari Gmail
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      if (typeof window.resSwitchAuthMode === 'function') {
        window.resSwitchAuthMode('reset');
      }
    }
  });

  if (!state.player) {
    const authScreen = document.getElementById("auth-screen");
    const mainScreen = document.getElementById("main-screen");
    if (authScreen) authScreen.classList.remove("hidden");
    if (mainScreen) mainScreen.classList.add("hidden");
    await initRegistrationDropdowns();
  } else {
    const authScreen = document.getElementById("auth-screen");
    const mainScreen = document.getElementById("main-screen");
    if (authScreen) authScreen.classList.add("hidden");
    if (mainScreen) mainScreen.classList.remove("hidden");
    renderInterface();
    await checkActiveShiftStatus();
    initRealtimeSubscriptions();
  }
}

async function initRegistrationDropdowns() {
  const countrySelect = document.getElementById("reg-country");
  if (!countrySelect) return;

  countrySelect.innerHTML = `<option value="">Memuat Negara...</option>`;
  const countries = await loadCountries();

  if (countries.length > 0) {
    countrySelect.innerHTML = countries.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join("");
    countrySelect.value = "ID";
    await updateRegionOptions("ID");
  } else {
    countrySelect.innerHTML = `<option value="ID">Indonesia (ID)</option>`;
    await updateRegionOptions("ID");
  }

  countrySelect.onchange = async () => updateRegionOptions(countrySelect.value);

  const regionSelect = document.getElementById("reg-region");
  if (regionSelect) {
    regionSelect.onchange = async () => updateCityOptions(regionSelect.value);
  }
}

async function updateRegionOptions(countryCode) {
  const regionSelect = document.getElementById("reg-region");
  if (!regionSelect) return;

  regionSelect.innerHTML = `<option value="">Memuat Wilayah...</option>`;
  const regions = await loadRegions(countryCode);

  if (regions.length > 0) {
    regionSelect.innerHTML = regions.map(r => `<option value="${r.id}">${r.name}</option>`).join("");
    await updateCityOptions(regions[0].id);
  } else {
    regionSelect.innerHTML = `<option value="${countryCode}-01">Wilayah Pusat</option>`;
    await updateCityOptions(`${countryCode}-01`);
  }
}

async function updateCityOptions(regionId) {
  const citySelect = document.getElementById("reg-city");
  if (!citySelect) return;

  citySelect.innerHTML = `<option value="">Memuat Daerah...</option>`;
  const cities = await loadCities(regionId);

  if (cities.length > 0) {
    citySelect.innerHTML = cities.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  } else {
    citySelect.innerHTML = `<option value="Distrik Pusat">Distrik Pusat</option>`;
  }
}

function initRealtimeSubscriptions() {
  // Update Realtime Dompet
  supabase
    .channel('public:wallets')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, payload => {
      if (payload.new && payload.new.player_id === state.player?.id) {
        if (!state.player.wallets) state.player.wallets = {};
        state.player.wallets[payload.new.currency_code] = Number(payload.new.balance);
        state.save();
        renderInterface();
      }
    })
    .subscribe();

  // Update Realtime Kas Negara APBN
  supabase
    .channel('public:countries')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'countries' }, payload => {
      if (payload.new.code === state.player?.current_country) {
        state.activeCountry.apbn_balance = Number(payload.new.apbn_balance);
        renderInterface();
      }
    })
    .subscribe();

  // Update Realtime Kas APBD Daerah
  supabase
    .channel('public:regions')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'regions' }, payload => {
      if (payload.new.id === state.player?.current_region) {
        state.activeRegion.apbd_balance = Number(payload.new.apbd_balance);
        renderInterface();
      }
    })
    .subscribe();
}

export function renderInterface() {
  const p = state.player;
  if (!p) return;

  // Badge Perisai Tengah Parlementum
  const initial = (p.username || "R").charAt(0).toUpperCase();
  const shieldAvatar = document.getElementById("shield-avatar-char");
  const shieldLevel = document.getElementById("shield-level-badge");
  if (shieldAvatar) shieldAvatar.innerText = initial;
  if (shieldLevel) shieldLevel.innerText = p.level || 2;

  // Saldo Atas Header
  const headerUsd = document.getElementById("header-usd-val");
  const headerGold = document.getElementById("header-gold-val");
  if (headerUsd) headerUsd.innerText = Math.floor(p.wallets?.USD || 650);
  if (headerGold) headerGold.innerText = Math.floor(p.gold || 81);

  // Kartu Profil Pemain
  const pName = document.getElementById("profile-player-name");
  const pCountry = document.getElementById("profile-country-name");
  const pCity = document.getElementById("profile-city-name");
  const pXpText = document.getElementById("profile-xp-text");
  const pXpBadge = document.getElementById("profile-xp-badge");
  const pXpBar = document.getElementById("profile-xp-bar");

  if (pName) pName.innerText = p.username.toUpperCase();
  if (pCountry) pCountry.innerText = `${p.citizenship === 'ID' ? 'Republik Indonesia' : p.citizenship} Faction`;
  if (pCity) pCity.innerText = p.current_city || 'Tangerang';
  if (pXpText) pXpText.innerText = `${p.xp} / ${p.max_xp} XP`;
  if (pXpBadge) pXpBadge.innerText = p.level;

  if (pXpBar) {
    const xpPercent = Math.min(100, Math.floor((p.xp / p.max_xp) * 100));
    pXpBar.style.width = `${xpPercent}%`;
  }

  // Bar Energi Utama
  const energyMain = document.getElementById("energy-main-num");
  const energyMax = document.getElementById("energy-max-num");
  const energyBar = document.getElementById("energy-main-bar");
  const floatEnergy = document.getElementById("float-energy-val");

  if (energyMain) energyMain.innerText = p.energy;
  if (energyMax) energyMax.innerText = `/${p.max_energy}`;
  if (energyBar) {
    const energyPercent = Math.min(100, Math.floor((p.energy / p.max_energy) * 100));
    energyBar.style.width = `${energyPercent}%`;
  }
  if (floatEnergy) floatEnergy.innerText = `${p.energy}/${p.max_energy}`;

  // Slot Makanan & Kuota Harian
  const breadQuota = document.getElementById("bread-quota-text");
  if (breadQuota) breadQuota.innerText = `Sisa roti hari ini ${p.daily_bread_quota}/10`;

  // Dompet Emas & USD
  const walletGold = document.getElementById("wallet-gold-val");
  const walletUsd = document.getElementById("wallet-usd-val");
  if (walletGold) walletGold.innerText = Math.floor(p.gold || 81);
  if (walletUsd) walletUsd.innerText = Math.floor(p.wallets?.USD || 650);

  // Kompatibilitas E-KTP Klasik (jika tab dibuka)
  const ktpNik = document.getElementById("ktp-nik");
  const ktpName = document.getElementById("ktp-name");
  const ktpCountry = document.getElementById("ktp-country");
  const ktpDomicile = document.getElementById("ktp-domicile");
  const ktpRole = document.getElementById("ktp-role");
  const ktpAvatar = document.getElementById("ktp-avatar-box");

  if (ktpNik) ktpNik.innerText = p.nik;
  if (ktpName) ktpName.innerText = p.username;
  if (ktpCountry) ktpCountry.innerText = `${p.citizenship} (HAK SUARA SAH)`;
  if (ktpDomicile) ktpDomicile.innerText = `${p.current_city}, ${p.current_region}`;
  if (ktpRole) ktpRole.innerText = p.role;
  if (ktpAvatar) {
    if (p.avatar_url && p.avatar_url.startsWith("data:image")) {
      ktpAvatar.innerHTML = `<img src="${p.avatar_url}" class="w-full h-full object-cover rounded-xl" alt="KTP Photo" />`;
    } else {
      ktpAvatar.innerHTML = p.gender === "Perempuan" ? "👩" : "👨";
    }
  }

  // Render Lowongan Bursa Kerja Kota
  const jobBox = document.getElementById("job-vacancy-list");
  if (jobBox) {
    jobBox.innerHTML = jobMarket.map(j => `
      <div class="bg-[#0e1625] border border-[#1e2c44] p-3 rounded-2xl flex justify-between items-center">
        <div>
          <div class="text-xs font-bold text-slate-100">${j.role}</div>
          <div class="text-[10px] text-slate-400">${j.company} • ${j.city}</div>
          <div class="text-xs text-[#00e5be] font-semibold mt-1">Rp ${j.wage.toLocaleString('id-ID')} / shift</div>
        </div>
        <button onclick="window.resApplyJob('${j.id}')" class="px-3 py-1.5 bg-[#d4af37] text-black rounded-xl text-xs font-bold active:scale-95 transition">Lamar</button>
      </div>
    `).join("");
  }

  // Render Bandara Internasional
  const airportBox = document.getElementById("airport-nations-list");
  if (airportBox) {
    airportBox.innerHTML = worldNations.map(n => `
      <div class="bg-[#0e1625] border border-[#1e2c44] p-2.5 rounded-xl flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="text-lg">${n.flag}</span>
          <div>
            <div class="text-xs font-bold text-slate-200">${n.name} (${n.code})</div>
            <div class="text-[10px] text-slate-400">Valuta: ${n.curr} | Tiket: $ 45.00</div>
          </div>
        </div>
        <button onclick="window.resTravel('${n.code}')" class="px-3 py-1 bg-[#1e2c44] hover:bg-[#283b5c] text-white rounded-lg text-xs font-semibold">Terbang</button>
      </div>
    `).join("");
  }

  // Otoritas Kas APBN/APBD (Pilar 5)
  const fiscal = getFiscalReport(p);
  const apbnContainer = document.getElementById("apbn-panel-container");
  if (apbnContainer) {
    if (!fiscal.authorized) {
      apbnContainer.innerHTML = `
        <div class="bg-[#0e1625] border border-rose-500/20 p-5 rounded-2xl space-y-2 text-center">
          <div class="text-3xl">🔒</div>
          <div class="text-xs font-bold text-rose-400">DOKUMEN KAS NEGARA TERBATAS</div>
          <div class="text-[11px] text-slate-400 whitespace-pre-line leading-relaxed">${fiscal.message}</div>
        </div>
      `;
    } else {
      apbnContainer.innerHTML = `
        <div class="bg-[#0e1625] border border-[#1e2c44] p-4 rounded-2xl space-y-3 font-rajdhani">
          <div class="text-xs font-bold text-[#f3ba2f] tracking-wider">🏛️ KAS APBN NEGARA: ${fiscal.country.toUpperCase()}</div>
          <div class="text-xl font-bold text-white">Rp ${fiscal.apbn_balance.toLocaleString('id-ID')}</div>
          <div class="text-[11px] text-slate-400">Status UU: <span class="text-[#00e5be] font-bold">${fiscal.apbn_status}</span></div>
          <div class="text-[11px] text-slate-400">Kas APBD ${fiscal.region}: <span class="text-slate-200 font-bold">Rp ${fiscal.apbd_balance.toLocaleString('id-ID')}</span></div>
          
          <div class="pt-2 flex gap-2">
            ${fiscal.canManageAPBN ? `<button onclick="window.resAllocateAPBN()" class="flex-1 py-2 bg-[#d4af37] text-black rounded-xl text-xs font-bold">Cairkan Subsidi (Menkeu)</button>` : ''}
            ${fiscal.canRatifyAPBN ? `<button onclick="window.resRatifyAPBN()" class="flex-1 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold">Sahkan RUU APBN (DPR)</button>` : ''}
          </div>
        </div>
      `;
    }
  }

  // Admin Tools
  const adminTabBtn = document.getElementById("btn-tab-admin-nav");
  if (adminTabBtn) {
    if (p.is_admin || state.isAdminMode) {
      adminTabBtn.classList.remove("hidden");
      const adminBox = document.getElementById("admin-role-options");
      if (adminBox) {
        adminBox.innerHTML = ADMIN_ROLES.map(r => `
          <button onclick="window.resSwitchAdminRole('${r}')" class="px-2.5 py-1 text-[11px] rounded-lg border ${p.role === r ? 'bg-[#d4af37] text-black border-amber-300' : 'bg-[#080c14] text-slate-300 border-[#1e2c44]'}">${r}</button>
        `).join("");
      }
    } else {
      adminTabBtn.classList.add("hidden");
    }
  }
}

// ============================================================================
// PILAR 3: SISTEM SHIFT BUMN 8 JAM BERBASIS UMR WILAYAH & PROSEDUR SERVER
// ============================================================================

export async function checkActiveShiftStatus() {
  const p = state.player;
  if (!p) return;

  const { data: activeShift } = await supabase
    .from('player_work_shifts')
    .select('*')
    .eq('player_id', p.id)
    .eq('status', 'IN_PROGRESS')
    .maybeSingle();

  if (activeShift) {
    startShiftCountdownUI(new Date(activeShift.shift_end));
  } else {
    resetShiftButtonUI();
  }
}

function startShiftCountdownUI(endTime) {
  const btn = document.getElementById("btn-shift-action");
  const label = document.getElementById("shift-status-label");
  if (!btn || !label) return;

  if (activeShiftCountdownInterval) clearInterval(activeShiftCountdownInterval);

  activeShiftCountdownInterval = setInterval(() => {
    const now = new Date();
    const remainingMs = endTime - now;

    if (remainingMs <= 0) {
      clearInterval(activeShiftCountdownInterval);
      label.innerText = "Shift 8 Jam Selesai! Ketuk untuk Klaim Gaji UMR";
      label.className = "text-[11px] text-[#f3ba2f] font-bold";
      btn.onclick = () => window.resClaimBumnShift();
    } else {
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      label.innerText = `Sedang Bekerja di BUMN: ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      label.className = "text-[11px] text-amber-400 font-mono";
      btn.onclick = () => showNotification("Shift Berjalan", "Shift kerja BUMN wajib 8 jam penuh!", false);
    }
  }, 1000);
}

function resetShiftButtonUI() {
  if (activeShiftCountdownInterval) clearInterval(activeShiftCountdownInterval);
  const btn = document.getElementById("btn-shift-action");
  const label = document.getElementById("shift-status-label");
  if (!btn || !label) return;

  label.innerText = "Shift BUMN 8 Jam · Sesuai UMR Kota (+Gaji Bersih & XP)";
  label.className = "text-[11px] text-[#00e5be]";
  btn.onclick = () => window.resStartBumnShift();
}

window.resStartBumnShift = async () => {
  const p = state.player;
  if (!p) return;

  // Panggil Stored Procedure Server Supabase
  const { data, error } = await supabase.rpc('rpc_start_bumn_shift', {
    p_player_id: p.id
  });

  if (error || !data?.success) {
    showNotification("Shift Ditolak", data?.message || error?.message || "Gagal memulai shift.", false);
    return;
  }

  showNotification("Shift Dimulai", `${data.message} Standar UMR: Rp ${Number(data.umr_wage).toLocaleString('id-ID')}`, true);
  p.energy = Math.max(0, p.energy - 15);
  state.save();
  renderInterface();
  startShiftCountdownUI(new Date(data.shift_end));
};

window.resClaimBumnShift = async () => {
  const p = state.player;
  if (!p) return;

  const { data, error } = await supabase.rpc('rpc_claim_bumn_shift', {
    p_player_id: p.id
  });

  if (error || !data?.success) {
    showNotification("Klaim Gagal", data?.message || error?.message || "Shift belum tuntas 8 jam.", false);
    return;
  }

  showNotification("Gaji Diterima", `Gaji UMR Rp ${Number(data.net_paid).toLocaleString('id-ID')} cair ke dompet! PPh 10% disetor ke APBN/APBD.`, true);
  p.xp += 2;
  state.save();
  renderInterface();
  resetShiftButtonUI();
};

// ============================================================================
// PILAR 4: HAK SUARA KTP DOMESTIK VS PPLN KEDUBES
// ============================================================================

window.resVotePoll = async (type) => {
  const p = state.player;
  if (!p) return;

  const { data: ballot } = await supabase
    .from('election_ballots')
    .select('*')
    .eq('is_open', true)
    .limit(1)
    .maybeSingle();

  if (!ballot) {
    showNotification("Bilik Suara", "Saat ini belum ada pemungutan suara aktif.", false);
    return;
  }

  const { data, error } = await supabase.rpc('rpc_cast_ballot_vote', {
    p_player_id: p.id,
    p_ballot_id: ballot.id
  });

  if (error || !data?.success) {
    showNotification("Hak Suara Ditolak", data?.message || error?.message, false);
    return;
  }

  showNotification("Hak Suara Sah", data.message, true);
};

// ============================================================================
// PILAR 2: KONSUMSI RANSUM T1-T5 & METABOLISME
// ============================================================================

window.resEatRation = (tier, boost) => {
  const p = state.player;
  if (!p) return;
  if (p.daily_bread_quota <= 0) {
    showNotification("Jatah Habis", "Anda telah mencapai batas 10 jatah roti hari ini!", false);
    return;
  }

  p.daily_bread_quota -= 1;
  p.energy = Math.min(p.max_energy, p.energy + boost);
  p.hunger = Math.min(100, p.hunger + (boost / 2));
  state.save();
  renderInterface();
  showNotification("Nutrisi Terisi", `Mengonsumsi roti ${tier}. Energi terisi +${boost}!`, true);
};

// ============================================================================
// GLOBAL HOOKS & COMPATIBILITY
// ============================================================================

window.resApplyJob = (id) => { applyJob(id); renderInterface(); };
window.resWork = () => { doWorkShift(); renderInterface(); };
window.resEat = () => { consumeFood(); renderInterface(); };
window.resTravel = (code) => { travelToCountry(code); renderInterface(); };
window.resLinkGoogle = () => { linkGooglePlayGames(); renderInterface(); };
window.resLogout = () => { logoutPlayer(); };
window.resAllocateAPBN = () => { allocateAPBNFunds(5000000000000.0, "Subsidi Pupuk & Pangan Warga"); renderInterface(); };
window.resRatifyAPBN = () => { ratifyAPBNBill(); renderInterface(); };
window.resSwitchAdminRole = (role) => { switchAdminRole(role); renderInterface(); };
window.resGrantAdminFunds = () => { grantAdminFunds(); renderInterface(); };

window.toggleMenuDrawer = () => {
  const drawer = document.getElementById("parlamentum-drawer");
  if (drawer) drawer.classList.toggle("hidden");
};

window.toggleSettingsMenu = () => {
  const popup = document.getElementById("settings-popup");
  const notif = document.getElementById("notifications-popup");
  if (popup) popup.classList.toggle("hidden");
  if (notif) notif.classList.add("hidden");
};

window.toggleNotificationsMenu = () => {
  const popup = document.getElementById("notifications-popup");
  const setPopup = document.getElementById("settings-popup");
  if (popup) popup.classList.toggle("hidden");
  if (setPopup) setPopup.classList.add("hidden");
};

window.resSwitchAuthMode = (mode) => {
  const loginSec = document.getElementById("form-login-section");
  const regSec = document.getElementById("form-register-section");
  const forgotSec = document.getElementById("form-forgot-section");
  const resetSec = document.getElementById("form-reset-section");

  if (loginSec) loginSec.classList.toggle("hidden", mode !== 'login');
  if (regSec) regSec.classList.toggle("hidden", mode !== 'register');
  if (forgotSec) forgotSec.classList.toggle("hidden", mode !== 'forgot');
  if (resetSec) resetSec.classList.toggle("hidden", mode !== 'reset');
};

window.resSwitchTab = (tabName) => {
  ["tab-dashboard", "tab-ktp", "tab-map", "tab-jobs", "tab-chat", "tab-gov", "tab-admin"].forEach(t => {
    const el = document.getElementById(t);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(tabName);
  if (target) target.classList.remove("hidden");
  window.toggleMenuDrawer();
};

window.resSendChat = () => {
  const input = document.getElementById("chat-input-text");
  if (!input) return;
  const res = sendChatMessage(input.value);
  if (res) {
    input.value = "";
    const box = document.getElementById("chat-feed-box");
    if (box) {
      box.innerHTML += `
        <div class="text-xs bg-[#080c14] border border-[#1e2c44] p-2.5 rounded-xl">
          <span class="text-[#00e5be] font-bold">[${res.msg.role}] ${res.msg.sender}:</span>
          <span class="text-slate-200 ml-1">${res.msg.text}</span>
        </div>
      `;
      box.scrollTop = box.scrollHeight;
    }
  }
};

window.resChangeChatChannel = (ch) => {
  setActiveChannel(ch);
};

window.resHandleFileSelect = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    customAvatarData = e.target.result;
    window.customAvatarData = customAvatarData;
    const preview = document.getElementById("avatar-upload-preview");
    const placeholder = document.getElementById("avatar-upload-placeholder");
    if (preview && placeholder) {
      preview.src = customAvatarData;
      preview.classList.remove("hidden");
      placeholder.classList.add("hidden");
    }
    showNotification("Foto Terpilih", "Foto profil galeri berhasil dimuat!", true);
  };
  reader.readAsDataURL(file);
};

window.onload = initGame;
