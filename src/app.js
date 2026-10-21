// src/app.js
import { supabase } from './config.js';
import { state } from './state.js';
import { loadCountries, loadRegions, loadCities, registerPlayer, linkGooglePlayGames } from './auth.js';
import { getDictionaryByNIK } from './i18n.js';
import { jobMarket, applyJob, doWorkShift, consumeFood } from './economy.js';
import { sendChatMessage, setActiveChannel } from './chat.js';
import { getFiscalReport, allocateAPBNFunds, ratifyAPBNBill } from './apbn.js';
import { worldNations, travelToCountry } from './map.js';
import { ADMIN_ROLES, switchAdminRole, grantAdminFunds } from './admin.js';
import { showNotification } from './notifications.js';

let customAvatarData = "";

export async function initGame() {
  // 1. Validasi Keamanan Wajib Online
  window.addEventListener('offline', () => {
    showNotification("Jaringan Terputus", "Game Res Publica wajib terhubung dengan internet!", false);
  });

  if (!state.player) {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("main-screen").classList.add("hidden");
    await initRegistrationDropdowns();
  } else {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("main-screen").classList.remove("hidden");
    renderInterface();
    initRealtimeSubscriptions();
  }
}

// 2. Mengisi Dropdown 250 Negara, Wilayah, & Kota secara Cascading dari Database
async function initRegistrationDropdowns() {
  const countrySelect = document.getElementById("reg-country");
  const regionSelect = document.getElementById("reg-region");
  const citySelect = document.getElementById("reg-city");

  if (!countrySelect) return;

  countrySelect.innerHTML = `<option value="">Memuat Negara...</option>`;
  const countries = await loadCountries();
  
  if (countries.length > 0) {
    countrySelect.innerHTML = countries.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join("");
    await updateRegionOptions(countrySelect.value);
  } else {
    countrySelect.innerHTML = `<option value="ID">Indonesia</option><option value="US">United States</option>`;
    await updateRegionOptions("ID");
  }

  countrySelect.onchange = async () => {
    await updateRegionOptions(countrySelect.value);
  };

  regionSelect.onchange = async () => {
    await updateCityOptions(regionSelect.value);
  };
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

// 3. Engine Real-Time Supabase (Update Kas Negara & Daerah Real-Time)
function initRealtimeSubscriptions() {
  supabase
    .channel('public:countries')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'countries' }, payload => {
      if (payload.new.code === state.player.current_country) {
        state.activeCountry.apbn_balance = Number(payload.new.apbn_balance);
        renderInterface();
      }
    })
    .subscribe();

  supabase
    .channel('public:regions')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'regions' }, payload => {
      if (payload.new.id === state.player.current_region) {
        state.activeRegion.apbd_balance = Number(payload.new.apbd_balance);
        renderInterface();
      }
    })
    .subscribe();
}

export function renderInterface() {
  const p = state.player;
  if (!p) return;

  const dict = getDictionaryByNIK(p.nik);

  // Status Bar Vitalitas
  const barHealth = document.getElementById("bar-health");
  const barEnergy = document.getElementById("bar-energy");
  const barHunger = document.getElementById("bar-hunger");
  const valEnergyNum = document.getElementById("val-energy-num");

  if (barHealth) barHealth.style.width = `${p.health}%`;
  if (barEnergy) barEnergy.style.width = `${p.energy}%`;
  if (barHunger) barHunger.style.width = `${p.hunger}%`;
  if (valEnergyNum) valEnergyNum.innerText = `${p.energy}%`;

  // Kartu E-KTP Digital
  const elNik = document.getElementById("ktp-nik");
  const elName = document.getElementById("ktp-name");
  const elCountry = document.getElementById("ktp-country");
  const elDomicile = document.getElementById("ktp-domicile");
  const elRole = document.getElementById("ktp-role");
  const elDob = document.getElementById("ktp-dob");
  const elGender = document.getElementById("ktp-gender");

  if (elNik) elNik.innerText = p.nik;
  if (elName) elName.innerText = p.username;
  if (elCountry) elCountry.innerText = `${p.citizenship} (HAK SUARA SAH)`;
  if (elDomicile) elDomicile.innerText = `${p.current_city}, ${p.current_region}`;
  if (elRole) elRole.innerText = p.role;
  if (elDob) elDob.innerText = p.birth_date;
  if (elGender) elGender.innerText = p.gender;

  // Render Foto Profil (Base64 Galeri atau Siluet Default Gender)
  const avatarBox = document.getElementById("ktp-avatar-box");
  if (avatarBox) {
    if (p.avatar_url && p.avatar_url.startsWith("data:image")) {
      avatarBox.innerHTML = `<img src="${p.avatar_url}" class="w-full h-full object-cover rounded-xl" alt="KTP Photo" />`;
    } else {
      avatarBox.innerHTML = p.gender === "Perempuan" ? "👩" : "👨";
    }
  }

  // Dompet
  const idrTxt = document.getElementById("val-idr-txt");
  const usdTxt = document.getElementById("val-usd-txt");
  if (idrTxt) idrTxt.innerText = `Rp ${(p.wallets.IDR || 0).toLocaleString('id-ID')}`;
  if (usdTxt) usdTxt.innerText = `$ ${(p.wallets.USD || 0).toFixed(2)}`;

  // Google Play Status
  const gpBtn = document.getElementById("btn-gp-link");
  if (gpBtn && p.is_google_linked) {
    gpBtn.innerText = "✓ Google Play Tertaut";
    gpBtn.className = "text-[11px] bg-teal-600/30 text-teal-300 border border-teal-500/30 px-2 py-1 rounded-lg";
  }

  // Render Bursa Kerja
  const jobBox = document.getElementById("job-vacancy-list");
  if (jobBox) {
    jobBox.innerHTML = jobMarket.map(j => `
      <div class="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl flex justify-between items-center">
        <div>
          <div class="text-xs font-bold text-slate-100">${j.role}</div>
          <div class="text-[10px] text-slate-400">${j.company} • ${j.city}</div>
          <div class="text-xs text-teal-400 font-semibold mt-1">Rp ${j.wage.toLocaleString('id-ID')} / shift</div>
        </div>
        <button onclick="window.resApplyJob('${j.id}')" class="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold active:scale-95 transition">Lamar</button>
      </div>
    `).join("");
  }

  // Render Bandara Internasional
  const airportBox = document.getElementById("airport-nations-list");
  if (airportBox) {
    airportBox.innerHTML = worldNations.map(n => `
      <div class="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="text-lg">${n.flag}</span>
          <div>
            <div class="text-xs font-bold text-slate-200">${n.name} (${n.code})</div>
            <div class="text-[10px] text-slate-400">Valuta: ${n.curr} | Tiket: $ 45.00</div>
          </div>
        </div>
        <button onclick="window.resTravel('${n.code}')" class="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold">Terbang</button>
      </div>
    `).join("");
  }

  // Otoritas Kas APBN/APBD
  const fiscal = getFiscalReport(p);
  const apbnContainer = document.getElementById("apbn-panel-container");
  if (apbnContainer) {
    if (!fiscal.authorized) {
      apbnContainer.innerHTML = `
        <div class="bg-slate-900/80 border border-rose-500/20 p-5 rounded-2xl space-y-2 text-center">
          <div class="text-3xl">🔒</div>
          <div class="text-xs font-bold text-rose-400">DOKUMEN KAS NEGARA TERBATAS</div>
          <div class="text-[11px] text-slate-400 whitespace-pre-line leading-relaxed">${fiscal.message}</div>
        </div>
      `;
    } else {
      apbnContainer.innerHTML = `
        <div class="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-3">
          <div class="text-xs font-bold text-teal-400 tracking-wider">🏛️ KAS APBN NEGARA: ${fiscal.country.toUpperCase()}</div>
          <div class="text-xl font-mono font-bold text-slate-100">Rp ${fiscal.apbn_balance.toLocaleString('id-ID')}</div>
          <div class="text-[11px] text-slate-400">Status UU: <span class="text-emerald-400 font-bold">${fiscal.apbn_status}</span></div>
          <div class="text-[11px] text-slate-400">Kas APBD ${fiscal.region}: <span class="text-slate-200 font-bold">Rp ${fiscal.apbd_balance.toLocaleString('id-ID')}</span></div>
          
          <div class="pt-2 flex gap-2">
            ${fiscal.canManageAPBN ? `<button onclick="window.resAllocateAPBN()" class="flex-1 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold">Cairkan Subsidi (Menkeu)</button>` : ''}
            ${fiscal.canRatifyAPBN ? `<button onclick="window.resRatifyAPBN()" class="flex-1 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold">Sahkan RUU APBN (DPR)</button>` : ''}
          </div>
        </div>
      `;
    }
  }

  // Render Panel Admin
  const adminTabBtn = document.getElementById("btn-tab-admin-nav");
  if (adminTabBtn) {
    if (p.is_admin || state.isAdminMode) {
      adminTabBtn.classList.remove("hidden");
      const adminBox = document.getElementById("admin-role-options");
      if (adminBox) {
        adminBox.innerHTML = ADMIN_ROLES.map(r => `
          <button onclick="window.resSwitchAdminRole('${r}')" class="px-2.5 py-1 text-[11px] rounded-lg border ${p.role === r ? 'bg-teal-600 text-white border-teal-400' : 'bg-slate-800 text-slate-300 border-slate-700'}">${r}</button>
        `).join("");
      }
    } else {
      adminTabBtn.classList.add("hidden");
    }
  }
}

// Window Global Hooks
window.resApplyJob = (id) => { applyJob(id); renderInterface(); };
window.resWork = () => { doWorkShift(); renderInterface(); };
window.resEat = () => { consumeFood(); renderInterface(); };
window.resTravel = (code) => { travelToCountry(code); renderInterface(); };
window.resLinkGoogle = () => { linkGooglePlayGames(); renderInterface(); };
window.resAllocateAPBN = () => { allocateAPBNFunds(5000000000000.0, "Subsidi Pangan & Pupuk Warga"); renderInterface(); };
window.resRatifyAPBN = () => { ratifyAPBNBill(); renderInterface(); };
window.resSwitchAdminRole = (role) => { switchAdminRole(role); renderInterface(); };
window.resGrantAdminFunds = () => { grantAdminFunds(); renderInterface(); };

window.resSwitchTab = (tabName) => {
  ["tab-ktp", "tab-map", "tab-jobs", "tab-chat", "tab-gov", "tab-admin"].forEach(t => {
    const el = document.getElementById(t);
    if (el) el.classList.add("hidden");
  });
  const target = document.getElementById(tabName);
  if (target) target.classList.remove("hidden");
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
        <div class="text-xs bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
          <span class="text-teal-400 font-bold">[${res.msg.role}] ${res.msg.sender}:</span>
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

// Hook Pemilihan File Galeri HP untuk Foto Profil KTP
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
    showNotification("Foto Terpilih", "Foto profil galeri berhasil dimuat ke E-KTP!", true);
  };
  reader.readAsDataURL(file);
};

window.onload = initGame;
