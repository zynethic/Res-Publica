// src/state.js
export const state = {
  player: JSON.parse(localStorage.getItem("res_publica_player")) || null,
  isAdminMode: JSON.parse(localStorage.getItem("res_publica_admin_mode")) ?? true, // Default aktif untuk pengembang
  activeCountry: {
    code: "ID",
    name: "Indonesia",
    currency_code: "IDR",
    currency_symbol: "Rp",
    apbn_balance: 3300000000000000.0,
    apbn_status: "DISETUJUI_DPR",
    income_tax: 0.10,
    president: "Belum Terpilih",
    finance_minister: "Belum Diangkat",
    dpr_speaker: "Ketua DPR Terpilih"
  },
  activeRegion: {
    id: "ID-BT",
    name: "Banten",
    apbd_balance: 380000000000.0,
    apbd_status: "DISETUJUI_DPRD",
    security_index: 88,
    primary_commodity: "Baja, Petrokimia & Logistik",
    governor: "Gubernur Terpilih"
  },
  save() {
    if (this.player) {
      localStorage.setItem("res_publica_player", JSON.stringify(this.player));
    }
    localStorage.setItem("res_publica_admin_mode", JSON.stringify(this.isAdminMode));
  }
};
