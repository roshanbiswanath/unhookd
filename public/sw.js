self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Unhookd", {
      body: data.body ?? "Your 60-second unhook is ready.",
      tag: data.tag ?? "unhook-window",
      data: data.data ?? { url: "/today" },
      actions: [
        { action: "start", title: "Get unhookd" },
        { action: "good", title: "I'm good" },
        { action: "snooze", title: "Snooze" },
      ],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const base = event.notification.data?.url ?? "/today";
  const url = `${base}?notificationAction=${event.action || "start"}`;
  event.waitUntil(clients.openWindow(url));
});
