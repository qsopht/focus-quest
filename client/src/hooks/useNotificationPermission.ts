import { useEffect, useState } from "react";

export function useNotificationPermission() {
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [permission, setPermission] = useState<NotificationPermission>(supported ? Notification.permission : "denied");

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
  }, [supported]);

  const request = async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  return { supported, permission, request };
}
