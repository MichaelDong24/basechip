import { SupabaseClient } from "@supabase/supabase-js";
import { supabase as supabaseClient } from "./supabaseClient";

export type LobbyRecord = {
  id: string;
  code: string;
  created_at: string;
  lobby_players?: LobbyPlayerRecord[];
};

export type LobbyPlayerRecord = {
  id: string;
  fid: string;
  wallet_address: string | null;
  joined_at: string;
};

export type CreateLobbyParams = {
  ownerFid?: string | null;
  ownerWallet?: string | null;
};

export type JoinLobbyParams = {
  code: string;
  fid: string;
  walletAddress?: string | null;
};

export type LeaveLobbyParams = {
  lobbyId: string;
  fid: string;
};


const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function ensureClient(client: SupabaseClient | null): SupabaseClient {
  if (!client) {
    throw new Error("Supabase client is not configured. Check environment variables.");
  }
  return client;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function generateLobbyCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[index];
  }
  return code;
}

export async function createLobby(params: CreateLobbyParams): Promise<LobbyRecord> {
  const client = ensureClient(supabaseClient);
  const { ownerFid, ownerWallet } = params;
  let attempts = 0;

  while (attempts < 5) {
    const code = generateLobbyCode();
    const { data: lobby, error } = await client
      .from("lobbies")
      .insert({
        code,
      })
      .select("id, code, created_at")
      .single();

    if (error) {
      // Unique violation for code, try again with a fresh code
      if (error.code === "23505") {
        attempts += 1;
        continue;
      }
      throw error;
    }

    if (!lobby) {
      throw new Error("Lobby creation failed.");
    }

    if (ownerFid) {
      const { error: playerError } = await client.from("lobby_players").upsert(
        {
          lobby_id: lobby.id,
          fid: ownerFid,
          wallet_address: ownerWallet ?? null,
        },
        { onConflict: "lobby_id,fid" }
      );

      if (playerError) {
        throw playerError;
      }
    }

    return lobby;
  }

  throw new Error("Could not generate a unique lobby code. Please try again.");
}

export async function joinLobby(params: JoinLobbyParams): Promise<LobbyRecord> {
  const client = ensureClient(supabaseClient);
  const code = normalizeCode(params.code);
  const { data: lobby, error } = await client
    .from("lobbies")
    .select("id, code, created_at")
    .eq("code", code)
    .single();

  if (error || !lobby) {
    throw error ?? new Error("Lobby not found");
  }

  const { error: playerError } = await client.from("lobby_players").upsert(
    {
      lobby_id: lobby.id,
      fid: params.fid,
      wallet_address: params.walletAddress ?? null,
    },
    { onConflict: "lobby_id,fid" }
  );
  if (playerError) {
    throw playerError;
  }

  return lobby;
}

export async function fetchLobby(code: string): Promise<LobbyRecord> {
  const client = ensureClient(supabaseClient);
  const normalizedCode = normalizeCode(code);
  const { data: lobby, error } = await client
    .from("lobbies")
    .select(
      "id, code, created_at, lobby_players (id, fid, wallet_address, joined_at)"
    )
    .eq("code", normalizedCode)
    .single();

  if (error || !lobby) {
    throw error ?? new Error("Lobby not found");
  }

  return lobby as LobbyRecord;
}

export async function leaveLobby(params: LeaveLobbyParams): Promise<void> {
  const client = ensureClient(supabaseClient);
  const { lobbyId, fid } = params;

  const { error } = await client
    .from("lobby_players")
    .delete()
    .eq("lobby_id", lobbyId)
    .eq("fid", fid);

  if (error) {
    throw error;
  }
}
