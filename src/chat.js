// src/chat.js
import { state } from './state.js';

export const chatChannels = {
  KOTA: [],
  WILAYAH: [],
  NEGARA: [],
  GLOBAL: [],
  JOBDESK: []
};

export let activeChannel = "KOTA";

export function setActiveChannel(ch) {
  activeChannel = ch;
}

export function sendChatMessage(text) {
  if (!text || !state.player) return null;

  const msg = {
    sender: state.player.username,
    role: state.player.role,
    avatar: state.player.avatar_url || "👤",
    text: text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  chatChannels[activeChannel].push(msg);
  return { channel: activeChannel, msg };
}
