// src/apbn.js
import { state } from './state.js';
import { getDictionaryByNIK } from './i18n.js';
import { showNotification } from './notifications.js';

export function canManageAPBN(player) {
  if (!player) return false;
  if (state.isAdminMode) return true; // Akses penuh untuk Mode Admin Pengembang
  return player.role === "MENTERI_KEUANGAN";
}

export function canRatifyAPBN(player) {
  if (!player) return false;
  if (state.isAdminMode) return true;
  return ["DPR_SPEAKER", "ANGGOTA_DPR", "MPR_SPEAKER"].includes(player.role);
}

export function canManageAPBD(player) {
  if (!player) return false;
  if (state.isAdminMode) return true;
  return ["GUBERNUR", "WALIKOTA", "BUPATI"].includes(player.role);
}

export function getFiscalReport(player) {
  const dict = getDictionaryByNIK(player?.nik);
  const hasAccess = state.isAdminMode || canManageAPBN(player) || canRatifyAPBN(player) || canManageAPBD(player);

  if (!hasAccess) {
    return {
      authorized: false,
      message: dict.apbn_locked
    };
  }

  return {
    authorized: true,
    country: state.activeCountry.name,
    apbn_balance: state.activeCountry.apbn_balance,
    apbn_status: state.activeCountry.apbn_status,
    income_tax: state.activeCountry.income_tax * 100,
    region: state.activeRegion.name,
    apbd_balance: state.activeRegion.apbd_balance,
    apbd_status: state.activeRegion.apbd_status,
    canManageAPBN: canManageAPBN(player),
    canRatifyAPBN: canRatifyAPBN(player),
    canManageAPBD: canManageAPBD(player)
  };
}

export function allocateAPBNFunds(amount, purpose) {
  if (!canManageAPBN(state.player)) {
    showNotification("Ditolak", "Hanya Menteri Keuangan yang berhak mencairkan dana APBN!", false);
    return;
  }
  if (state.activeCountry.apbn_balance < amount) {
    showNotification("Defisit", "Saldo kas APBN tidak mencukupi!", false);
    return;
  }
  state.activeCountry.apbn_balance -= amount;
  state.save();
  showNotification("Pencairan APBN", `Dana APBN sebesar Rp ${amount.toLocaleString('id-ID')} dicairkan untuk: ${purpose}`, true);
}

export function ratifyAPBNBill() {
  if (!canRatifyAPBN(state.player)) {
    showNotification("Ditolak", "Hanya Anggota DPR yang berhak mengesahkan RUU APBN!", false);
    return;
  }
  state.activeCountry.apbn_status = "DISAHKAN_DPR_RI";
  state.save();
  showNotification("Sidang Paripurna DPR", "Rancangan APBN resmi disahkan menjadi Undang-Undang!", true);
}
