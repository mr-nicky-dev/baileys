# @ms-nicky/baileys

## Panduan migrasi bot ke Baileys 7.0.0-rc14

> **Status repo ini:** kode fork `@ms-nicky/baileys` sudah direbase ke upstream Baileys `7.0.0-rc14`. Versi `3.0.0` di `package.json` adalah versi fork ini, bukan versi upstream. Repo ini berisi library, bukan source code bot Elaina-Asisten. Panduan ini menjelaskan pemasangan Baileys resmi di repo bot; perubahan dependency dan kode bot harus dilakukan di repo bot tersebut.

Baileys 7 bersifat ESM dan memerlukan Node.js 20 atau lebih baru. Kalau bot masih memakai `require()`, ubah project menjadi ESM sebelum mengganti library.

### 1. Simpan kondisi lama untuk rollback

Di repo bot, buat branch sebelum migrasi:

```bash
git status
git switch -c chore/migrate-baileys-7
```

Pastikan perubahan kerja yang sudah ada disimpan sebelum berpindah branch. Buat commit migrasi setelah dependency dan kode berhasil diperbarui.

### 2. Pasang versi yang diminta

Pilih satu perintah sesuai package manager project:

```bash
npm install @whiskeysockets/baileys@7.0.0-rc14
# atau: yarn add @whiskeysockets/baileys@7.0.0-rc14
# atau: pnpm add @whiskeysockets/baileys@7.0.0-rc14
```

Hapus dependency fork lama dari `package.json` jika sebelumnya memakai `@ms-nicky/baileys`. Jangan mencampur import dari dua package.

### 3. Aktifkan ESM dan ubah import

Tambahkan `"type": "module"` ke `package.json` bot. Ubah `require()` menjadi `import`, termasuk pada contoh koneksi:

```js
import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import pino from 'pino'

const { state, saveCreds } = await useMultiFileAuthState('./auth_info')
const { version } = await fetchLatestBaileysVersion()

const sock = makeWASocket({
  version,
  auth: state,
  logger: pino({ level: 'silent' }),
})

sock.ev.on('creds.update', saveCreds)
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
  if (connection === 'open') console.log('WhatsApp terhubung')
  if (connection === 'close') console.error('Koneksi terputus:', lastDisconnect?.error)
})
```

`fetchLatestBaileysVersion()` adalah API upstream. Fork repo ini memiliki helper bernama `fetchLatestWaWebVersion()`. Periksa API lain yang dipakai bot; helper khusus fork mungkin tidak tersedia di package resmi.

### 4. Kirim media

Gunakan URL HTTP(S), path file lokal, atau `Buffer` sebagai sumber media:

```js
import { readFile } from 'node:fs/promises'

await sock.sendMessage(jid, {
  image: { url: 'https://example.com/foto.jpg' },
  caption: 'Contoh gambar',
})

await sock.sendMessage(jid, { sticker: await readFile('./sticker.webp') })
```

Pastikan fungsi pembuat gambar menu mengembalikan `Buffer` atau sumber yang sesuai dengan pemanggilnya. Jika helper EXIF mengembalikan path file, baca file menjadi `Buffer` bila alur bot memerlukannya. Hapus file sementara setelah pemakaian dengan `try/finally`, termasuk ketika upload gagal.

### 5. Checklist setelah migrasi

1. Jalankan bot dan selesaikan pairing pada akun uji.
2. Coba kirim pesan teks, gambar, video, audio, dan sticker satu per satu.
3. Catat error upload, kode status, dan hostname yang gagal. Jangan catat kredensial atau token autentikasi.
4. Pastikan file sementara dibersihkan ketika upload berhasil maupun gagal.
5. Periksa import dan fitur fork khusus seperti VoIP, pairing code, serta helper versi WA sebelum deploy.

`7.0.0-rc14` adalah release candidate. Lihat [panduan migrasi resmi v7](https://github.com/WhiskeySockets/docs/blob/main/migration/v7.mdx) untuk perubahan breaking, termasuk ESM-only dan perubahan API.

### Rollback

Jika migrasi masih di branch terpisah, kembali ke branch kerja sebelum migrasi:

```bash
git switch main
```

Jika sudah digabung, pulihkan dependency dan lockfile dari commit sebelum migrasi, lalu install ulang dengan package manager yang sama. Contoh untuk npm:

```bash
git restore --source=<commit-sebelum-migrasi> -- package.json package-lock.json
npm install
```

Jangan hapus folder autentikasi saat rollback; sesi WhatsApp tersimpan di sana. Karena source code bot tidak ada di repo ini, migrasi implementasi dan verifikasi upload perlu dilakukan di repo bot.

---

WhatsApp API library using WebSocket technology (multi-device).  
Fork of [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys) (base `7.0.0-rc14`) with:
- Pairing code fixes (canonical browser label, server response wait, 515 auto-reconnect)
- Auto version detection (WA Web sw.js + WPPConnect fallback)
- Built-in VoIP calling (WebRTC / baileys-caller)
- Latest WhatsApp protobuf (202 message types)
- CommonJS build (`require()` works) + ESM named imports

> Requires Node.js >= 20.19.0 (needed to `require()` ESM-only dependencies).

---

## Installation

```bash
npm install github:ms-nicky/baileys
```

Or in `package.json`:

```json
"@whiskeysockets/baileys": "github:ms-nicky/baileys"
```

---

## Quick Start

### Pairing Code (Recommended)

```javascript
const { default: makeWASocket, useMultiFileAuthState, fetchLatestWaWebVersion, makeCacheableSignalKeyStore } = require('@ms-nicky/baileys')
const pino = require('pino')

async function start() {
  const { version } = await fetchLatestWaWebVersion()
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    browser: ['Linux', 'Chrome', ''],  // [OS, browser, version]
  })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('✓ Connected')
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      // 515 = pairing accepted, reconnect
      if (code === 515) start()
      else if (code !== 401) setTimeout(start, 5000)
    }
  })

  const code = await sock.requestPairingCode('62812xxxxxxx')
  console.log(`Pairing code: ${code}`)
}

start()
```

### Using the included pair script

```bash
node pair.js 62812xxxxxxx            # random code
node pair.js 62812xxxxxxx ELAINA13   # custom code (8 chars)
```

Auto-reconnects after pairing is accepted (handles 515 stream error).

---

## Key Features

### Auto Version Detection

Fetches the WA Web version automatically (from `web.whatsapp.com/sw.js`, falling back to [WPPConnect](https://wppconnect.io/whatsapp-versions)), falls back to hardcoded.

```javascript
const { version, isLatest } = await fetchLatestWaWebVersion()
```

### Pairing Code

- Validates international format (rejects leading `0`)
- Waits for Noise handshake + server response (`query` with 30s timeout)
- Custom pairing code support (exactly 8 chars)
- Canonical browser/OS label (WhatsApp rejects non-standard labels)
- Raw binary nonce (not hex string)
- Auto-reconnect on 515

```javascript
const code = await sock.requestPairingCode('62812xxxxxxx')
const code = await sock.requestPairingCode('62812xxxxxxx', 'MYCODE13')
```

### 405 Error Recovery

Automatically detects `405 Method Not Allowed` and retries the connection.

---

## Config Reference (useful options)

| Option | Default | Description |
| --- | --- | --- |
| `version` | auto | WA protocol version; pass result of `fetchLatestWaWebVersion()` |
| `browser` | `['Mac OS', 'Chrome', '14.4.1']` | `[OS, browser, version]` |
| `auth` | – | `useMultiFileAuthState()` result + `makeCacheableSignalKeyStore()` |
| `logger` | pino child | any pino logger |
| `keepAliveIntervalMs` | `30000` | WS keep-alive |
| `connectTimeoutMs` | `20000` | frame/connect timeout |
| `defaultQueryTimeoutMs` | `60000` | default `query()` timeout |
| `markOnlineOnConnect` | `true` | presence; `false` = stay "offline" |
| `syncFullHistory` | `true` | request full history sync |
| `getMessage` | – | retry lookup for failed sends |
| `linkPreviewImageThumbnailWidth` | `192` | link preview thumbnail |
| `generateHighQualityLinkPreview` | `false` | upload HQ preview image |

Removed in v3.0.0: `printQRInTerminal` (listen to `connection.update` yourself) and `mobile` (mobile API is not supported by WhatsApp servers — throws immediately).

---

## VoIP / Voice Calling

Built-in WebRTC voice calling using the official WhatsApp WASM stack.  
Powered by [baileys-caller](https://github.com/SheIITear/baileys-caller).

### Usage

```javascript
const { createVoipClient, CallState } = require('@ms-nicky/baileys')

const client = await createVoipClient({ authDir: 'auth_info' })
const call = await client.call('62812xxxxxxx', { durationMs: 60000 })

call.on('ringing', () => console.log('• ringing'))
call.on('connected', () => console.log('✓ connected'))
call.on('ended', (reason) => console.log('• ended:', reason))

// Control
call.mute(true)       // mute/unmute
call.end()            // hang up
call.waitForEnd()     // promise resolves when call ends

// Later
client.disconnect()   // cleanup
```

### Test Script

```bash
node call-test.js                    # default target
node call-test.js 62812xxxxxxx       # specific number
CALL_DURATION=60000 node call-test.js  # custom duration (ms)
```

### Call Links & Reject (socket level)

```javascript
// create a sharable call link (raw token); prefix it with
// https://call.whatsapp.com/video/ or https://call.whatsapp.com/voice/
const token = await sock.createCallLink('video')
const link = `https://call.whatsapp.com/video/${token}`

// reject an incoming call
sock.ev.on('call', async (events) => {
  for (const ev of events) {
    if (ev.offering && !ev.isGroup) {
      await sock.rejectCall(ev.callId, ev.callFrom)
    }
  }
})
```

### CallState

```javascript
CallState.Idle              // 0
CallState.Calling           // 1
CallState.PreacceptReceived // 2
CallState.ReceivedCall      // 3
CallState.AcceptSent        // 4
CallState.AcceptReceived    // 5
CallState.Active            // 6
CallState.ActiveElsewhere   // 7
CallState.Ending            // 13
```

---

## SendMessage

### Text
```javascript
await sock.sendMessage(jid, { text: 'Hello World' })
```

### Image
```javascript
await sock.sendMessage(jid, { image: { url: 'https://example.com/image.jpg' }, caption: 'Caption' })
```

### Video
```javascript
await sock.sendMessage(jid, { video: { url: 'https://example.com/video.mp4' }, caption: 'Caption' })
```

### Audio
```javascript
await sock.sendMessage(jid, { audio: { url: 'https://example.com/audio.mp3' }, mimetype: 'audio/mp4', ptt: true })
```

### Document
```javascript
await sock.sendMessage(jid, { document: fs.readFileSync('./file.pdf'), mimetype: 'application/pdf', fileName: 'file.pdf' })
```

### Sticker
```javascript
await sock.sendMessage(jid, { sticker: { url: 'https://example.com/image.webp' } })
```

### Location
```javascript
await sock.sendMessage(jid, { location: { degreesLatitude: -6.2, degreesLongitude: 106.8 } })
```

### Contact
```javascript
await sock.sendMessage(jid, { contacts: { displayName: 'Alice', contacts: [{ vcard: 'BEGIN:VCARD\nVERSION:3.0\nFN:Alice\nEND:VCARD' }] } })
```

### Poll
```javascript
await sock.sendMessage(jid, {
  poll: {
    name: 'Pilihan',
    values: ['A', 'B', 'C'],
    selectableCount: 1
  }
})
```

### List
```javascript
await sock.sendMessage(jid, {
  list: {
    title: 'Menu',
    text: 'Pilih opsi:',
    buttonText: 'Lihat',
    sections: [{
      title: 'Section',
      rows: [{ title: 'Option 1', description: 'Desc', rowId: 'opt1' }]
    }]
  }
})
```

### Buttons
```javascript
await sock.sendMessage(jid, {
  buttons: [
    { buttonId: 'btn1', buttonText: { displayText: 'Button 1' }, type: 1 }
  ],
  header: 'Header',
  text: 'Text',
  footer: 'Footer'
})
```

---

## Additional Features

### Album Message (Multiple Images)
```javascript
await sock.sendMessage(jid, {
  albumMessage: [
    { image: fs.readFileSync('./img1.jpg'), caption: 'Photo 1' },
    { image: { url: 'https://example.com/img.jpg' }, caption: 'Photo 2' }
  ]
})
```

### Interactive Message
```javascript
await sock.sendMessage(jid, {
  interactiveMessage: {
    header: 'Header',
    title: 'Title',
    footer: 'Footer',
    buttons: [{
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({ display_text: 'Copy Code', id: '123', copy_code: 'ABC123' })
    }]
  }
})
```

### Native Flow Message
```javascript
await sock.sendMessage(jid, {
  interactiveMessage: {
    header: 'Header',
    title: 'Title',
    footer: 'Footer',
    nativeFlowMessage: {
      messageParamsJson: JSON.stringify({ bottom_sheet: { in_thread_buttons_limit: 2, list_title: 'Menu', button_title: 'Pilih' } }),
      buttons: [{
        name: 'single_select',
        buttonParamsJson: JSON.stringify({ title: 'Pilih Opsi', sections: [{ title: 'Section', rows: [{ title: 'Option 1', id: 'opt1' }] }] })
      }]
    }
  }
})
```

### Event Message
```javascript
await sock.sendMessage(jid, {
  eventMessage: {
    isCanceled: false,
    name: 'Event Name',
    description: 'Description',
    location: { degreesLatitude: 0, degreesLongitude: 0, name: 'Location' },
    startTime: String(Math.floor(Date.now() / 1000)),
    endTime: String(Math.floor(Date.now() / 1000) + 3600)
  }
})
```

### Poll Result Message
```javascript
await sock.sendMessage(jid, {
  pollResultMessage: {
    name: 'Poll Name',
    pollVotes: [
      { optionName: 'A', optionVoteCount: '10' },
      { optionName: 'B', optionVoteCount: '5' }
    ]
  }
})
```

### Product Message
```javascript
await sock.sendMessage(jid, {
  productMessage: {
    title: 'Product',
    description: 'Description',
    thumbnail: { url: 'https://example.com/img.jpg' },
    productId: 'PROD001',
    retailerId: 'RETAIL001',
    priceAmount1000: 50000,
    currencyCode: 'IDR',
    buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Buy Now', url: 'https://example.com/buy' }) }]
  }
})
```

### Request Payment Message
```javascript
await sock.sendMessage(jid, {
  requestPaymentMessage: {
    currency: 'IDR',
    amount: 100000,
    from: m.sender,
    background: { id: '100', fileLength: '0', width: 1000, height: 1000, mimetype: 'image/webp', placeholderArgb: 0xFF00FFFF, textArgb: 0xFFFFFFFF, subtextArgb: 0xFFAA00FF }
  }
})
```

### Status Mention

```javascript
// content = message content object, jids = array of contact/group jid
await sock.sendStatusMention({ text: 'Hello' }, ['628xxxx@s.whatsapp.net'])
```

---

## Group Functions

```javascript
// Create group
const group = await sock.groupCreate('Group Name', [participant1, participant2])

// Update subject
await sock.groupUpdateSubject(jid, 'New Subject')

// Update description
await sock.groupUpdateDescription(jid, 'New Description')

// Add / Remove participants
await sock.groupParticipantsUpdate(jid, [participant1], 'add')
await sock.groupParticipantsUpdate(jid, [participant1], 'remove')

// Promote / Demote admin
await sock.groupParticipantsUpdate(jid, [participant1], 'promote')
await sock.groupParticipantsUpdate(jid, [participant1], 'demote')

// Leave group
await sock.groupLeave(jid)

// Invite code
const code = await sock.groupInviteCode(jid)
await sock.groupRevokeInviteCode(jid)

// Settings
await sock.groupSettingUpdate(jid, 'announcement')   // or 'not_announcement'
await sock.groupSettingUpdate(jid, 'locked')          // or 'unlocked'

// Ephemeral messages
await sock.groupToggleEphemeral(jid, 86400)

// Label group
await sock.setLabelGroup(jid, 'label')
```

---

## Newsletter

```javascript
// Fetch by jid
const info = await sock.newsletterMetadata('jid', jidNewsletter)
// ...or by invite code (channel URL's last path segment)
const info2 = await sock.newsletterMetadata('invite', inviteCode)

// Follow / unfollow / react
await sock.newsletterFollow(jid)
await sock.newsletterUnfollow(jid)
await sock.newsletterReactMessage(jid, messageId, message, emoji)

// Admin ops
await sock.newsletterUpdateName(jid, 'New Name')
await sock.newsletterUpdateDescription(jid, 'New Description')
await sock.newsletterMute(jid)
await sock.newsletterCreate('Channel Name', 'Description')
```

---

## Communities

```javascript
const community = await sock.communityCreate('Community Name', 'Description')
await sock.communityMetadata(jid)
await sock.communityLinkGroup(communityJid, groupJid)
await sock.communityAcceptInvite('https://chat.whatsapp.com/...')
await sock.communitySettingUpdate(communityJid, 'announcement') // 'announcement' | 'unlocked'
await sock.communityToggleEphemeral(communityJid, 86400)         // disappearing messages
```

---

## Store (fork add-on)

```javascript
const { makeInMemoryStore } = require('@ms-nicky/baileys')

const store = makeInMemoryStore({})
store.readFromFile('./baileys-store.json')

// bind store to events so chats/contacts/labels keep syncing
sock.ev.on('messages.upsert', () => store.writeToFile('./baileys-store.json'))
sock.ev.bind(store.ev)

// optional: cache-manager backed auth state
const { makeCacheManagerAuthState } = require('@ms-nicky/baileys')
```

---

## Utility Functions

```javascript
// Check if number(s) is on WhatsApp
const checks = await sock.onWhatsApp('628xxxx', '628xxxx')
// [{ phoneNumber: '628xxxx', jid: ..., exists: true }, ...]

// Block/unblock
await sock.updateBlockStatus(jid, 'block')
await sock.updateBlockStatus(jid, 'unblock')

// Update profile status
await sock.updateProfileStatus('New status')

// Update profile name
await sock.updateProfileName('New Name')

// Set/remove profile picture
await sock.updateProfilePicture(jid, { url: 'https://example.com/photo.jpg' })
await sock.removeProfilePicture(jid)

// Get business profile
const profile = await sock.getBusinessProfile(jid)
```

---

## Events

```javascript
// Connection update
sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
  if (connection === 'open') console.log('Connected')
  if (connection === 'close') {
    // reconnect logic
  }
})

// Messages
sock.ev.on('messages.upsert', ({ messages, type }) => {
  // handle incoming messages
})

// Presence
sock.ev.on('presence.update', ({ id, presences }) => {
  // online, typing, recording, etc
})

// Group update
sock.ev.on('groups.update', (groups) => {
  // group metadata changes
})

// Credentials
sock.ev.on('creds.update', saveCreds)
```

---

## Contact

- GitHub: [ms-nicky](https://github.com/ms-nicky)
- Telegram: [t.me/MsXploiter](https://t.me/MsXploiter)

---

## Changelog v3.0.0

- Rebased onto upstream `@whiskeysockets/baileys` `7.0.0-rc14` (latest line), compiled to CommonJS
- Regenerated `WAProto` from the latest upstream protocol (202 message types, +~1 year of new WhatsApp messages)
- WA handshake version `2.3000.1043857760` (same as latest upstream)
- Removed legacy mobile-registration layer and random-failure "guard" code
- `libsignal` upgraded to official v6, `pino` v9, `protobufjs` v7.5
- Pairing code flow: `query()` (waits for server response), phone sanitization, canonical platform labels, raw nonce
- `require()` CommonJS + ESM named-import support
- Node engine: >= 20.19.0

## License

MIT
