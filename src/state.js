// src/state.js
export const state = {
  player: null,
  isAdminMode: false,
  activeCountry: {
    code: 'ID',
    name: 'Indonesia',
    currency_code: 'IDR',
    currency_symbol: 'Rp',
    apbn_balance: 3300000000000000.0,
    apbn_status: 'DISETUJUI_DPR',
    gold_reserves: 1450.0,
    income_tax: 0.10,
    tariff_export: 5.0,
    tariff_import: 7.5,
    president: 'Belum Terpilih',
    finance_minister: 'Belum Diangkat',
    dpr_speaker: 'Ketua DPR Terpilih'
  },
  activeRegion: {
    id: 'ID-BT',
    name: 'Banten',
    apbd_balance: 380000000000.0,
    apbd_status: 'DISETUJUI_DPRD',
    security_index: 88,
    primary_commodity: 'Baja, Petrokimia & Logistik',
    governor: 'Gubernur Terpilih',
    umr_8h_shift: 185000.0
  },

  load() {
    try {
      const stored = localStorage.getItem("res_publica_player_parlamentum") || localStorage.getItem("res_publica_player");
      if (stored) {
        this.player = JSON.parse(stored);
      }
      const adminFlag = localStorage.getItem("res_publica_admin_mode");
      this.isAdminMode = adminFlag === "true";
    } catch (e) {
      console.warn("Gagal memuat penyimpanan lokal", e);
    }
  },

  save() {
    try {
      if (this.player) {
        localStorage.setItem("res_publica_player_parlamentum", JSON.stringify(this.player));
        localStorage.setItem("res_publica_player", JSON.stringify(this.player));
      }
      localStorage.setItem("res_publica_admin_mode", this.isAdminMode ? "true" : "false");
    } catch (e) {
      console.warn("Gagal menyimpan ke penyimpanan lokal", e);
    }
  }
};

state.load();
