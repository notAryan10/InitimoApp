# Intimo (mobile)

Character-AI style app. React Native (Expo) front-end on the existing Intimo
backend + AI. Text-only — voice/image stripped.

```
ai/      Flask proxy to llama.cpp (MythoMax) — :8000
server/  Node/Express + MongoDB — :5001
mobile/  Expo (expo-router) app
```

## Run locally (4 terminals)

1. **llama.cpp** (MythoMax GGUF) on :8080, with speculative decoding for ~1.5–2×
   speed (TinyLlama 1.1B drafts, MythoMax verifies — output identical):
   ```
   llama-server \
     -m mythomax-l2-13b.Q4_K_M.gguf \
     -md tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf \
     --spec-draft-n-max 16 --spec-draft-n-min 4 \
     --port 8080 --ctx-size 4096 -ngl 99 -ngld 99 -fa on
   ```
   (Without the draft model, drop the `-md`/`--spec-*`/`-ngld` flags.)
2. **AI** `cd ai && pip install -r requirements.txt && python app.py`  (:8000)
3. **server** `cd server && cp .env.example .env && npm i && node server.js`  (:5001)
4. **mobile** `cd mobile && npm i`, set `EXPO_PUBLIC_API_URL` in `.env` to your
   Mac's LAN IP (e.g. `http://192.168.1.5:5001`), then `npm start`.

Phone and Mac must share Wi-Fi. For remote access use Tailscale and point
`EXPO_PUBLIC_API_URL` at the Tailscale IP.

## API contract (server)

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | /api/auth/signup | username, email, password, isAdult | { message } |
| POST | /api/auth/login | email, password | { token, user } |
| POST | /api/character/create | name, personality, description, gender, visibility | character |
| GET  | /api/character/my | — | character[] |
| POST | /api/chat/create | characterId | { chatId } |
| GET  | /api/chat/:chatId | — | { messages, relationship, level, emoji } |
| POST | /api/chat/message | chatId, message | { reply, relationship, level, emoji, emotion, event } |

All routes except auth need `Authorization: Bearer <token>`.
