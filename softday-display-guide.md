# Soft Day VIP photo purchases

The $3.99 photo display is a **one-time purchase**, with no recurring renewal.
The buyer messages the creator with their name and a direct image URL. Only the creator confirms payment and activates an entry.

Edit `softday-vip-displays.json` after checking the purchase in Patreon. Keep `displays` empty until a real purchase is confirmed. An entry looks like:

```json
{
  "schema": 1,
  "displays": [
    {
      "slot": 0,
      "name": "Public display name",
      "source": "https://i.imgur.com/REPLACE.jpg",
      "activatedAt": "2026-11-11T15:00:00+03:00",
      "enabled": true
    }
  ]
}
```

Use a unique slot from 0 to 255. Set `activatedAt` to the actual activation date and time, including the timezone (`+03:00` for Saudi Arabia). The picture expires after exactly 7 days. The VIP name expires one calendar month after activation. Replacing a link does not reset either period. Set `enabled` to false to withdraw the display. Do not put payment details, emails, private messages or order numbers in this public file.

The publication workflow runs every five minutes (GitHub can delay scheduled runs); saving the file also triggers it. The in-world display refreshes automatically and rejects stale feeds. A world upload is not needed to change a picture.

Room artwork is managed separately in `softday-art.json`. Change the desired entry's HTTPS direct image URL. Original image files remain available so the original artwork can be restored. Supported hosts include i.imgur.com, i.ibb.co, i.postimg.cc, raw.githubusercontent.com, github.io and the other hosts listed in softday-gallery.py. Images are copied to trusted GitHub Pages URLs before VRChat loads them.
