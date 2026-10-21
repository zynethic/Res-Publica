// src/map.js
import { state } from './state.js';
import { CONFIG } from './config.js';
import { showNotification } from './notifications.js';

export const worldNations = [
  { code: "ID", name: "Indonesia", curr: "IDR", flag: "🇮🇩", capital: "Jakarta" },
  { code: "US", name: "United States", curr: "USD", flag: "🇺🇸", capital: "Washington, D.C." },
  { code: "JP", name: "Japan", curr: "JPY", flag: "🇯🇵", capital: "Tokyo" },
  { code: "SA", name: "Saudi Arabia", curr: "SAR", flag: "🇸🇦", capital: "Riyadh" },
  { code: "DE", name: "Germany", curr: "EUR", flag: "🇩🇪", capital: "Berlin" },
  { code: "GB", name: "United Kingdom", curr: "GBP", flag: "🇬🇧", capital: "London" },
  { code: "AU", name: "Australia", curr: "AUD", flag: "🇦🇺", capital: "Canberra" },
  { code: "BR", name: "Brazil", curr: "BRL", flag: "🇧🇷", capital: "Brasília" }
];

export function travelToCountry(targetCode) {
  const target = worldNations.find(n => n.code === targetCode);
  if (!target) return;

  const cost = CONFIG.TICKET_PRICE_USD;
  if ((state.player.wallets.USD || 0) < cost) {
    showNotification("Gagal Terbang", `Saldo US Dollar tidak cukup untuk tiket penerbangan ($ ${cost})!`, false);
    return;
  }

  state.player.wallets.USD -= cost;
  state.player.current_country = target.code;
  state.player.current_region = `${target.code}-01`;
  state.player.current_city = `Pusat ${target.name}`;
  state.save();

  showNotification("Penerbangan Sukses", `Anda mendarat di ${target.name}. Lokasi fisik diperbarui.`, true);
}
