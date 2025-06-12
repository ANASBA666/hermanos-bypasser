# BloxScript Key Manager (Secure Auto Renew)

This Vercel project hosts the Tampermonkey userscript `bloxscript.user.js` for direct installation.

## Installation

1. Deploy this project to Vercel (e.g., `vercel --prod`).
2. Visit `https://<your-vercel-app>.vercel.app/bloxscript.user.js`.
3. Your browser/Tampermonkey will prompt to install the script.

The script will run on `https://blox-script.com/get-key*` and provides:
- Admin role bypass
- Secure HMAC-based key generation
- Auto-renewal every 4 hours
- Custom GUI panel
