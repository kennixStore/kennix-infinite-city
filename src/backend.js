import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const backendConfigured = Boolean(url && anonKey);
export const supabase = backendConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

function requireBackend() {
  if (!supabase) throw new Error("Online services are not configured yet.");
  return supabase;
}

export async function createPlayerAccount(email, password, displayName) {
  const db = requireBackend();
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName.trim().slice(0, 24) } }
  });
  if (error) throw error;
  return data;
}

export async function signInPlayer(email, password) {
  const { data, error } = await requireBackend().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const { error } = await requireBackend().auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin
  });
  if (error) throw error;
}

export async function updatePlayerPassword(password) {
  if (String(password).length < 8) throw new Error("Use at least 8 characters.");
  const { error } = await requireBackend().auth.updateUser({ password });
  if (error) throw error;
}

export async function updatePlayerDisplayName(displayName) {
  const db = requireBackend();
  const name = String(displayName || "").trim();
  if (name.length < 2 || name.length > 24) throw new Error("Driver name must be 2–24 characters.");
  const { data, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!data.user) throw new Error("Sign in first.");
  const { error: profileError } = await db.from("player_profiles")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("user_id", data.user.id);
  if (profileError) throw profileError;
  const { error: metadataError } = await db.auth.updateUser({ data: { display_name: name } });
  if (metadataError) throw metadataError;
}

export async function signOutPlayer() {
  const { error } = await requireBackend().auth.signOut();
  if (error) throw error;
}

export async function getPlayerSession() {
  const { data, error } = await requireBackend().auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function savePlayerProgress(progress) {
  const db = requireBackend();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("Sign in to save progress online.");
  const safeProgress = {
    level: Math.max(1, Math.min(1000, Number(progress.level) || 1)),
    xp: Math.max(0, Math.min(100000000, Number(progress.xp) || 0)),
    selected_vehicle: String(progress.selected_vehicle || "kx-sport").slice(0, 32),
    paint: String(progress.paint || "#17436b").slice(0, 16),
    campaign_step: Math.max(0, Math.min(100, Number(progress.campaign_step) || 0))
  };
  const { error } = await db.from("player_saves").upsert({
    user_id: auth.user.id,
    progress: safeProgress,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function loadPlayerProgress() {
  const db = requireBackend();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) return null;
  const { data, error } = await db.from("player_saves")
    .select("progress, updated_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.progress ?? null;
}

export async function getKXBalance() {
  const db = requireBackend();
  const { data, error } = await db.rpc("get_my_kx_balance");
  if (error) throw error;
  return Number(data ?? 0);
}

export async function transferKX(recipientUserId, amount, idempotencyKey) {
  const db = requireBackend();
  const value = Math.floor(Number(amount));
  if (!recipientUserId || !Number.isSafeInteger(value) || value < 1 || value > 100000) {
    throw new Error("Enter a valid player and an amount between 1 and 100,000 KX.");
  }
  if (!idempotencyKey || String(idempotencyKey).length > 80) {
    throw new Error("A valid transfer reference is required.");
  }
  const { data, error } = await db.rpc("transfer_kx", {
    p_recipient: recipientUserId,
    p_amount: value,
    p_idempotency_key: String(idempotencyKey)
  });
  if (error) throw error;
  return data;
}
