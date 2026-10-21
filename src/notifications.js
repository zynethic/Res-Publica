// src/notifications.js
export function showNotification(title, message, isSuccess = true) {
  const container = document.getElementById("ios-notification-container");
  if (!container) return;

  const banner = document.createElement("div");
  banner.className = `transform -translate-y-28 transition-all duration-300 ease-out bg-slate-900/95 border ${
    isSuccess ? 'border-teal-500/40 shadow-teal-500/10' : 'border-rose-500/40 shadow-rose-500/10'
  } backdrop-blur-xl text-slate-100 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 w-full max-w-sm pointer-events-auto select-none`;

  const iconEmoji = isSuccess ? "🔔" : "⚠️";
  const statusColor = isSuccess ? "bg-teal-400" : "bg-rose-400";

  banner.innerHTML = `
    <div class="text-xl">${iconEmoji}</div>
    <div class="flex-1 overflow-hidden">
      <div class="text-[11px] font-semibold text-slate-300 tracking-wider uppercase">${title}</div>
      <div class="text-xs font-medium text-slate-100 truncate">${message}</div>
    </div>
    <div class="w-2 h-2 rounded-full ${statusColor} animate-ping"></div>
  `;

  container.appendChild(banner);

  requestAnimationFrame(() => {
    banner.classList.remove("-translate-y-28");
    banner.classList.add("translate-y-0");
  });

  setTimeout(() => {
    banner.classList.remove("translate-y-0");
    banner.classList.add("-translate-y-28", "opacity-0");
    setTimeout(() => banner.remove(), 350);
  }, 3500);
}
