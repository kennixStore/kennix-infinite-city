import { supabase } from "./backend.js";

// Lightweight room presence for friends and casual meetups.
// This is NOT an authoritative race server: never use client snapshots to award KX.
export async function joinCityRoom(roomCode, onPlayersChanged, onSnapshot = () => {}) {
  if (!supabase) throw new Error("Online services are not configured.");
  const room = String(roomCode || "nova-city").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
  if (!room) throw new Error("Enter a valid room code.");

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sign in before joining an online room.");

  const channel = supabase.channel("city-room:" + room, {
    config: { presence: { key: auth.user.id }, broadcast: { self: false } }
  });

  channel.on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();
    const players = Object.values(state).flat().map(entry => ({
      userId: entry.user_id,
      displayName: entry.display_name || "Driver",
      vehicle: entry.vehicle || "kx-sport",
      onlineAt: entry.online_at
    }));
    onPlayersChanged(players);
  });

  channel.on("broadcast", { event: "driver_snapshot" }, ({ payload }) => {
    if (!payload || typeof payload !== "object") return;
    const x = Number(payload.x), z = Number(payload.z), heading = Number(payload.heading);
    if (![x, z, heading].every(Number.isFinite)) return;
    if (Math.abs(x) > 10000 || Math.abs(z) > 10000) return;
    onSnapshot({
      userId: String(payload.user_id || "").slice(0, 64),
      x, z, heading,
      vehicle: String(payload.vehicle || "kx-sport").slice(0, 32),
      sentAt: Number(payload.sent_at) || Date.now()
    });
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Online room connection timed out.")), 12000);
    channel.subscribe(async status => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        try {
          const name = String(auth.user.user_metadata?.display_name || "Driver").slice(0, 24);
          const tracked = await channel.track({
            user_id: auth.user.id,
            display_name: name,
            online_at: new Date().toISOString()
          });
          if (tracked !== "ok") throw new Error("Could not publish player presence.");
          resolve();
        } catch (error) {
          reject(error);
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        reject(new Error("Could not connect to the online room: " + status));
      }
    });
  });

  let lastSent = 0;
  return {
    room,
    async sendSnapshot(snapshot) {
      const now = Date.now();
      if (now - lastSent < 100) return; // 10 updates/second maximum
      lastSent = now;
      const payload = {
        user_id: auth.user.id,
        x: Math.max(-10000, Math.min(10000, Number(snapshot.x) || 0)),
        z: Math.max(-10000, Math.min(10000, Number(snapshot.z) || 0)),
        heading: Number(snapshot.heading) || 0,
        vehicle: String(snapshot.vehicle || "kx-sport").slice(0, 32),
        sent_at: now
      };
      const result = await channel.send({ type: "broadcast", event: "driver_snapshot", payload });
      if (result !== "ok") throw new Error("Could not send the player update.");
    },
    async leave() {
      await supabase.removeChannel(channel);
    }
  };
}
