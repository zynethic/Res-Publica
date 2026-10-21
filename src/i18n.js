// src/i18n.js
export const dictionaries = {
  ID: {
    role_civilian: "Warga Biasa",
    vital_health: "Kesehatan",
    vital_energy: "Energi",
    vital_hunger: "Kenyang",
    btn_eat: "Konsumsi Beras",
    btn_work: "Bekerja Shift",
    job_board: "Bursa Lowongan Kerja",
    apbn_title: "Anggaran Pendapatan & Belanja Negara (APBN)",
    apbd_title: "Anggaran Pendapatan & Belanja Daerah (APBD)",
    apbn_locked: "🔒 DOKUMEN RAHASIA NEGARA\nAnda berstatus Warga Biasa. Pembukuan APBN hanya dikelola Menteri Keuangan dan disahkan DPR. APBD hanya dikelola Gubernur/Walikota dan disetujui DPRD.",
    vote_title: "Bilik Suara Pemilihan Umum",
    airport_title: "Bandara Internasional",
    notif_registered: "E-KTP Terbit! Bantuan Warga Baru Rp 500.000 telah masuk ke dompet Anda."
  },
  US: {
    role_civilian: "Civilian",
    vital_health: "Health",
    vital_energy: "Energy",
    vital_hunger: "Hunger",
    btn_eat: "Consume Rations",
    btn_work: "Work Shift",
    job_board: "Employment Board",
    apbn_title: "National Fiscal Budget (APBN)",
    apbd_title: "Regional State Budget (APBD)",
    apbn_locked: "🔒 CLASSIFIED NATIONAL ARCHIVES\nYou are a civilian. APBN is managed by Finance Minister and ratified by Parliament. APBD is governed by Governor/Mayor and approved by Regional Council.",
    vote_title: "Democratic Polling Station",
    airport_title: "International Airport",
    notif_registered: "National ID Issued! $35.00 citizen starter assistance credited."
  },
  JP: {
    role_civilian: "一般市民",
    vital_health: "体力",
    vital_energy: "活力",
    vital_hunger: "満腹度",
    btn_eat: "食料を消費",
    btn_work: "シフト勤務",
    job_board: "求人掲示板",
    apbn_title: "国家予算 (APBN)",
    apbd_title: "地方予算 (APBD)",
    apbn_locked: "🔒 国家機密予算アーカイブ\n一般市民は閲覧不可。APBNは財務大臣が管理し議会が承認、APBDは知事・市長が管理し地方議会が承認します。",
    vote_title: "選挙投票所",
    airport_title: "国際空港",
    notif_registered: "身分証明書発行完了！支援金がウォレットに付与されました。"
  }
};

export function getDictionaryByNIK(nik) {
  if (!nik || typeof nik !== "string") return dictionaries.ID;
  const prefix = nik.substring(0, 2).toUpperCase();
  return dictionaries[prefix] || dictionaries.US;
}
