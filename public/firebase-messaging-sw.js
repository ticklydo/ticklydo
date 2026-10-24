// Service worker pre push upozornenia (zobrazí upozornenie aj keď je aplikácia zatvorená)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = {}; }
  const d = payload.data || payload.notification || {};
  const title = d.title || "Ticklydo";
  const options = {
    body: d.body || "",
    icon: "/IKONA.png",
    badge: "/IKONA.png",
    data: { link: d.link || "/notifications" },
  };

  event.waitUntil((async () => {
    // ak má používateľ aplikáciu práve otvorenú a viditeľnú, upozornenie sa zobrazí priamo v nej
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.some((c) => c.visibilityState === "visible")) return;
    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/notifications";
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of wins) {
      if ("focus" in c) { await c.focus(); if ("navigate" in c) { try { await c.navigate(link); } catch (e) {} } return; }
    }
    await self.clients.openWindow(link);
  })());
});