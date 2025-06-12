// ==UserScript==
// @name         BloxScript Key Manager (Secure Auto Renew)
// @namespace    https://blox-script.com/
// @version      8.5
// @description  Secure key generator with auto-renew, ad-wall bypass, and admin unlock. Made by Anas.
// @match        https://blox-script.com/get-key*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // 🛡️ Force Admin Role (bypasses ad-wall + unlock)
  localStorage.setItem("blox_user", JSON.stringify({ admin: true, role: "admin" }));
  localStorage.setItem("_direct_link_check_point", "1");
  localStorage.setItem("_link_vertise_check_point", "1");

  const decrypt = (str, key, base = 'base64') => {
    let raw = base === 'base64' ? atob(str) : str;
    return Array.from(raw, (c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
  };

  const generateSignature = async (payload) => {
    const secret = decrypt('HQAbCxgcERoSFBoSBXgAGwQQGhofARY=', 'DONT_SEE_ME_AM_SECRET');
    const msg = `${Date.now()}:${JSON.stringify(payload)}`;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
    return {
      timestamp: Date.now(),
      signature: Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  };

  const getKeys = () => JSON.parse(localStorage.getItem('_keys') || '[]');
  const saveKeys = (keys) => localStorage.setItem('_keys', JSON.stringify(keys));
  const formatTime = sec => sec <= 0 ? 'Renewing…' : `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;

  const showToast = (msg) => {
    const toast = document.createElement("div");
    toast.className = "gui-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const refreshTimers = () => {
    const keys = getKeys();
    const now = Math.floor(Date.now() / 1000);
    keys.forEach((k, i) => {
      const diff = k.time - now;
      if (diff <= 0 && !k._renewing) {
        k._renewing = true;
        renewKey(i, k.label);
      } else {
        const row = document.querySelectorAll(".key-row")[i];
        if (row) row.textContent = formatTime(diff);
      }
    });
  };

  const generateKey = async (label = "Quick Key") => {
    const payload = { username: decrypt('HQAbCwwWABoSCBoRDhp+', 'DONT_SEE_ME_AM_SECRET') };
    try {
      const { timestamp, signature } = await generateSignature(payload);
      const res = await fetch("https://key.blox-service.com/keys/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Timestamp": timestamp.toString(),
          "X-Signature": signature
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.message !== "Ok") throw new Error();
      const keys = getKeys();
      keys.push({ key: data.key, time: Math.floor(Date.now() / 1000) + 14400, label });
      saveKeys(keys);
      renderPanel();
      showToast("✅ Key generated");
    } catch {
      showToast("❌ Generation failed");
    }
  };

  const renewKey = async (index, label) => {
    const payload = { username: decrypt('HQAbCwwWABoSCBoRDhp+', 'DONT_SEE_ME_AM_SECRET') };
    try {
      const { timestamp, signature } = await generateSignature(payload);
      const res = await fetch("https://key.blox-service.com/keys/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Timestamp": timestamp.toString(),
          "X-Signature": signature
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      const keys = getKeys();
      keys[index] = { key: data.key, time: Math.floor(Date.now() / 1000) + 14400, label };
      saveKeys(keys);
      renderPanel();
      showToast("♻️ Auto-renewed");
    } catch {
      showToast("❌ Renew failed");
    }
  };

  const deleteKeys = async (keysToDelete) => {
    const remaining = getKeys().filter(k => !keysToDelete.includes(k.key));
    for (const key of keysToDelete) {
      try {
        await fetch("/api/delete-key", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key })
        });
      } catch {}
    }
    saveKeys(remaining);
    renderPanel();
    showToast(`🗑️ Deleted ${keysToDelete.length} key(s)`);
  };

  const openDeletePopup = () => {
    const keys = getKeys();
    if (!keys.length) return showToast("ℹ️ No keys to delete.");
    const modal = document.createElement("div");
    modal.className = "gui-modal";
    modal.innerHTML = `
      <h2>🗑️ Delete Keys</h2>
      <ul style="max-height: 200px; overflow-y: auto;">
        ${keys.map(k => `
          <li><label><input type="checkbox" data-key="${k.key}" />
          <code>${k.key}</code> <span class="key-row">${k.label}</span></label></li>`).join("")}
      </ul>
      <button id="confirmDelete" class="btn danger">Delete Selected</button>
      <button id="cancelDelete" class="btn">Cancel</button>
    `;
    document.body.appendChild(modal);
    modal.querySelector("#confirmDelete").onclick = () => {
      const selected = [...modal.querySelectorAll("input:checked")].map(cb => cb.dataset.key);
      if (selected.length === 0) return showToast("No keys selected.");
      deleteKeys(selected);
      modal.remove();
    };
    modal.querySelector("#cancelDelete").onclick = () => modal.remove();
  };

  const renderPanel = () => {
    const old = document.getElementById("keyManagerPanel");
    if (old) old.remove();

    const keys = getKeys();
    const now = Math.floor(Date.now() / 1000);
    const panel = document.createElement("div");
    panel.id = "keyManagerPanel";
    panel.className = "gui-panel";
    panel.innerHTML = `
      <h1>🛡️ Hermanos Bypasser</h1>
      <p style="font-size: 12px; color: #aaa;">Made by Anas</p>
      <p><strong>${keys.length}</strong> key(s)</p>
      <ul class="key-list">
        ${keys.map(k => `<li><code>${k.key}</code><br><span class="key-row">${formatTime(k.time - now)}</span></li>`).join("")}
      </ul>
      <button id="btnNewKey" class="btn success">➕ Generate Key</button>
      <button id="btnDelete" class="btn danger">🗑️ Delete Keys</button>
    `;
    document.body.appendChild(panel);
    document.getElementById("btnNewKey").onclick = () => generateKey("Quick Key");
    document.getElementById("btnDelete").onclick = openDeletePopup;
    setInterval(refreshTimers, 10000);
    console.log("✅ Panel Loaded");
  };

  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
    .gui-panel {
      position: fixed; top: 60px; right: 20px; width: 360px;
      background: #1c1c1c; color: #eee; border: 1px solid #444;
      padding: 16px; border-radius: 12px; z-index: 9999;
      box-shadow: 0 0 20px rgba(0,0,0,0.6); font-family: sans-serif;
    }
    .key-list li {
      background: #262626; padding: 8px; margin-bottom: 6px;
      border-radius: 8px;
    }
    .key-list code {
      color: #90ee90; word-break: break-word;
    }
    .btn {
      display: block; width: 100%; margin-top: 8px; padding: 10px;
      background: #333; border: none; border-radius: 8px;
      color: #ddd; font-weight: bold; cursor: pointer;
    }
    .btn.success { background: #3a3; }
    .btn.danger  { background: #a33; }
    .gui-toast {
      position: fixed; top: 20px; right: 20px;
      background: #444; color: #fff;
      padding: 10px 16px; border-radius: 8px;
      z-index: 10001; font-size: 14px;
    }
    .gui-modal {
      position: fixed; top: 120px; right: 60px;
      background: #222; border: 1px solid #555;
      padding: 14px; border-radius: 10px;
      z-index: 10000; color: #eee; width: 360px;
    }
  `;
  document.head.appendChild(style);

})();