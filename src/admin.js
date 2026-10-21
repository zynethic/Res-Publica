// src/admin.js
import { state } from './state.js';
import { showNotification } from './notifications.js';

export const ADMIN_ROLES = [
  "WARGA_SIPIL",
  "PRESIDEN",
  "MENTERI_KEUANGAN",
  "DPR_SPEAKER",
  "GUBERNUR",
  "WALIKOTA",
  "TNI_COMMANDER",
  "POLICE_CHIEF",
  "DIREKTUR_TAMBANG"
];

export function switchAdminRole(newRole) {
  if (!state.player) return;
  state.player.role = newRole;
  state.save();
  showNotification("Admin Override", `Jabatan berhasil diubah menjadi: ${newRole}`, true);
}

export function grantAdminFunds() {
  if (!state.player) return;
  state.player.wallets.IDR = (state.player.wallets.IDR || 0) + 1000000000.0;
  state.player.wallets.USD = (state.player.wallets.USD || 0) + 50000.0;
  state.player.energy = 100;
  state.player.health = 100;
  state.player.hunger = 100;
  state.save();
  showNotification("Admin Grant", "Dana Rp 1 Miliar, $50.000 & Vitalitas Penuh diberikan!", true);
}
