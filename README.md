# THE GENIUS

A black-and-white, pixel-art AI chat interface with an expression inventory, interruptible streamed answers, Arabic/English switching, and retro RPG text blips.

## Run it

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env` and set `GROQ_API_KEY` to a **new** Groq API key.
3. Run `npm start`.
4. Open `http://localhost:3000`.

The browser never receives the key: `server.mjs` holds the Groq request and streams responses from `openai/gpt-oss-120b`. The Stop button immediately closes the browser request and aborts the upstream generation.

## Phone and PC version

The interface is responsive and installable as a PWA. On the computer, double-click `start-phone-preview.cmd` and keep its window open. The server prints its current Wi-Fi address. On a phone connected to the same Wi-Fi, enter that address (for example, `http://192.168.0.126:3000`) — **do not use `localhost:3000` on the phone**, because that points back to the phone itself. If the phone says `ERR_CONNECTION_RESET`, double-click `enable-phone-access.cmd` on the computer and approve the Windows administrator prompt. It adds one inbound rule for TCP port 3000 on Private networks only.

For an installable app icon and offline interface shell, deploy the included `Dockerfile` to any HTTPS-capable host and set `GROQ_API_KEY` as that host's secret/environment variable. The chat model itself needs a connection; only the interface and expression art are available offline.

## Publish THE GENIUS publicly

The included `render.yaml` is ready for [Render](https://render.com). Do not upload `.env` or paste the Groq key into GitHub.

1. Create a private GitHub repository and upload this project.
2. In Render, select **New → Blueprint**, connect that repository, and select `render.yaml`.
3. Render asks for `GROQ_API_KEY`; paste a newly generated Groq key there as a secret.
4. Deploy. Render gives you an HTTPS `onrender.com` link that works on phones and PCs.

You can add a custom domain afterward in the Render dashboard. Keep the default app Settings key field unused when the public host already has `GROQ_API_KEY` configured.

The supplied reference art is in `public/assets/`. Add more expression images inside the in-app Settings panel; they stay in this browser's local storage and can be selected by the assistant during chat.
