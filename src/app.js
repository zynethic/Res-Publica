// src/app.js
import { state } from './state.js';
import { registerPlayer, linkGooglePlayGames } from './auth.js';
import { getDictionaryByNIK } from './i18n.js';
import { jobMarket, applyJob, doWorkShift, consumeFood } from './economy.js';
import { sendChatMessage, setActiveChannel } from './chat.js';
import { getFiscalReport, allocateAPBNFunds, ratifyAPBNBill } from './apbn.js';
import { worldNations, travelToCountry } from './map.js';
import { ADMIN_ROLES, switchAdminRole, grantAdminFunds } from './admin.js';

export function initGame() {
  if (!state.player) {
    document.getElementById("auth-screen").classList.remove("hidden");
    document.getElementById("main-screen").classList.add("hidden");
  } else {
    document.getElementById("auth-screen").classList.add("hidden");
    document.getElementById("main-screen").classList.remove("hidden");
    renderInterface();
  }
}

export function renderInterface() {
  const p = state.player;
  if (!p) return;

  const dict = getDictionaryByNIK(p.nik);

  // Status Vitalitas
  document.getElementById("bar-health").style.width = `${p.health}%`;
  document.getElementById("bar-energy").style.width = `${p.energy}%`;
  document.getElementById("bar-hunger").style.width = `${p.hunger}%`;
  document.getElementById("val-energy-num").innerText = `${p.energy}%`;

  // Kartu E-KTP Digital
  document.getElementById("ktp-nik").innerText = p.nik;
  document.getElementById("ktp-name").innerText = p.username;
  document.getElementById("ktp-country").innerText = `${p.citizenship} (HAK SUARA KPU AKTIF)`;
  document.getElementById("ktp-domicile").innerText = `${p.current_city}, ${p.current_region}`;
  document.getElementById("ktp-role").innerText = p.role;
  document.getElementById("ktp-dob").innerText = p.birth_date;
  document.getElementById("ktp-gender").innerText = p.gender;
  document.getElementById("ktp-avatar-box").innerText = p.avatar_url || "👨‍💼";

  // Dompet
  document.getElementById("val-idr-txt").innerText = `Rp ${(p.wallets.IDR || 0).toLocaleString('id-ID')}`;
  document.getElementById("val-usd-txt").innerText = `$ ${(p.wallets.USD || 0).toFixed(2)}`;

  // Google Play Status
  const gpBtn = document.getElementById("btn-gp-link");
  if (p.is_google_linked) {
    gpBtn.innerText = "✓ Google Play Tertaut";
    gpBtn.className = "text-[11px] bg-teal-600/30 text-teal-300 border border-teal-500/30 px-2 py-1 rounded-lg";
  }

  // Render Bursa Kerja
  const jobBox = document.getElementById("job-vacancy-list");
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

  // Render Bandara Internasional
  const airportBox = document.getElementById("airport-nations-list");
  airportBox.innerHTML = worldNations.map(n => `
    <div class="bg-slate-900/70 border border-slate-800 p-2.5 rounded-xl flex justify-between items-center">
      <div class="flex items-center gap-2">
        <span class="text-lg">${n.flag}</span>
        <div>
          <div class="text-xs font-bold text-slate-200">${n.name} (${n.code})</div>
          <div class="text-[10px] text-slate-400">Ibu Kota: ${n.capital} | Tiket: $ 45.00</div>
        </div>
      </div>
      <button onclick="window.resTravel('${n.code}')" class="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold">Terbang</button>
    </div>
  `).join("");

  // Render APBN/APBD Tertutup (Hanya Pejabat)
  const fiscal = getFiscalReport(p);
  const apbnContainer = document.getElementById("apbn-panel-container");
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
        <div class="text-[11px] text-slate-400">Status Undang-Undang: <span class="text-emerald-400 font-bold">${fiscal.apbn_status}</span></div>
        <div class="text-[11px] text-slate-400">Kas APBD ${fiscal.region}: <span class="text-slate-200 font-bold">Rp ${fiscal.apbd_balance.toLocaleString('id-ID')}</span></div>
        
        <div class="pt-2 flex gap-2">
          ${fiscal.canManageAPBN ? `<button onclick="window.resAllocateAPBN()" class="flex-1 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold">Cairkan Subsidi (Menkeu)</button>` : ''}
          ${fiscal.canRatifyAPBN ? `<button onclick="window.resRatifyAPBN()" class="flex-1 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold">Sahkan RUU APBN (DPR)</button>` : ''}
        </div>
      </div>
    `;
  }

  // Render Panel Admin
  const adminBox = document.getElementById("admin-role-options");
  adminBox.innerHTML = ADMIN_ROLES.map(r => `
    <button onclick="window.resSwitchAdminRole('${r}')" class="px-2.5 py-1 text-[11px] rounded-lg border ${p.role === r ? 'bg-teal-600 text-white border-teal-400' : 'bg-slate-800 text-slate-300 border-slate-700'}">${r}</button>
  `).join("");
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
    document.getElementById(t).classList.add("hidden");
  });
  document.getElementById(tabName).classList.remove("hidden");
};

window.resSendChat = () => {
  const input = document.getElementById("chat-input-text");
  const res = sendChatMessage(input.value);
  if (res) {
    input.value = "";
    const box = document.getElementById("chat-feed-box");
    box.innerHTML += `
      <div class="text-xs bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
        <span class="text-teal-400 font-bold">[${res.msg.role}] ${res.msg.sender}:</span>
        <span class="text-slate-200 ml-1">${res.msg.text}</span>
      </div>
    `;
    box.scrollTop = box.scrollHeight;
  }
};

window.resChangeChatChannel = (ch) => {
  setActiveChannel(ch);
};

window.onload = initGame;
