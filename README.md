# Photo Worksheet

Stories in your camera roll, one photo at a time. A working-ish prototype for SVSD 2026.

Open it on your phone, tap **Allow photo access**, and pick photos from your camera roll. The app reads when each photo was taken, groups them into trips, and picks the moments for each one. Then you write about each photo like a primary-school worksheet: photo on top, lines below. Talk or type, and a question drifts in when you go quiet. Your photos stay on your phone; nothing is uploaded.

On a computer it opens with four sample trips and a decision lab beside the phone.

## Run it locally

```
npm install
npm run dev
```

The live prototype is the `gh-pages` branch: `BASE=/photo-worksheet/ npm run build`, then publish `dist/` there.
