// src/economy.js
import { state } from './state.js';
import { CONFIG } from './config.js';
import { showNotification } from './notifications.js';

export const jobMarket = [
  { id: "J1", company: "PT Krakatau Steel Nusantara", city: "Kota Cilegon", role: "Operator Peleburan Baja", wage: 280000, energy: 25 },
  { id: "J2", company: "Perum Logistik Pangan", city: "Kota Tangerang", role: "Staf Distribusi Beras", wage: 240000, energy: 20 },
  { id: "J3", company: "RSUD Kabupaten Tegal", city: "Kota Tegal", role: "Asisten Medis Darurat", wage: 310000, energy: 20 },
  { id: "J4", company: "PT Aneka Tambang Mineral", city: "Kabupaten Konawe", role: "Teknisi Smelter Nikel", wage: 450000, energy: 35 }
];

export function applyJob(jobId) {
  const job = jobMarket.find(j => j.id === jobId);
  if (!job) return;

  state.player.role = job.role;
  state.save();
  showNotification("Diterima Bekerja!", `Anda resmi menjabat sebagai ${job.role} di ${job.company}`, true);
}

export function doWorkShift() {
  const p = state.player;
  if (!p) return;

  if (p.energy < 20 || p.hunger < 15) {
    showNotification("Fisik Lelah", "Kondisi fisik melemah! Konsumsi beras atau istirahat dahulu.", false);
    return;
  }

  const grossWage = 260000.0;
  const pphTax = grossWage * CONFIG.TAX_PPH_RATE; // PPh 10% dipotong otomatis
  const netWage = grossWage - pphTax;

  p.energy -= 20;
  p.hunger -= 15;
  p.wallets.IDR = (p.wallets.IDR || 0) + netWage;
  
  // Setor pajak: 70% masuk kas APBN, 30% masuk kas APBD
  state.activeCountry.apbn_balance += pphTax * 0.70;
  state.activeRegion.apbd_balance += pphTax * 0.30;
  state.save();

  showNotification("Shift Tuntas", `Gaji bersih: Rp ${netWage.toLocaleString('id-ID')} (PPh 10% disetor ke APBN/APBD)`, true);
}

export function consumeFood() {
  const p = state.player;
  if (!p) return;

  const stock = p.inventory?.BRS_PKP || 0;
  if (stock < 1.0) {
    showNotification("Pangan Habis", "Stok beras di gudang habis! Beli di pasar komoditas.", false);
    return;
  }

  p.inventory.BRS_PKP -= 1.0;
  p.hunger = Math.min(100, p.hunger + 30);
  p.energy = Math.min(100, p.energy + 20);
  state.save();

  showNotification("Kenyang", "Konsumsi 1 Kg beras selesai. Energi dan kenyang meningkat!", true);
}
