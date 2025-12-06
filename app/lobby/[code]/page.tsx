"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import QRCode from "qrcode";
import { Button } from "@/components/Button";
import {
  LobbyPlayerRecord,
  LobbyRecord,
  fetchLobby,
  normalizeCode,
  leaveLobby,
} from "@/lib/lobbyClient";
import { supabase } from "@/lib/supabaseClient";
import styles from "./lobby.module.css";

function sortPlayers(players: LobbyPlayerRecord[]): LobbyPlayerRecord[] {
  return [...players].sort((a, b) => {
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });
}

export default function LobbyPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = normalizeCode(
    Array.isArray(params?.code) ? params.code[0] : params?.code ?? ""
  );
  const { address } = useAccount();
  const { setMiniAppReady, isMiniAppReady, context } = useMiniKit();
  const fid = context?.user?.fid ? String(context.user.fid) : null;
  const userId = fid ?? (address ? `wallet:${address.toLowerCase()}` : null);

  const [lobby, setLobby] = useState<LobbyRecord | null>(null);
  const [players, setPlayers] = useState<LobbyPlayerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [isMiniAppReady, setMiniAppReady]);

  useEffect(() => {
    const loadLobby = async () => {
      if (!code) return;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLobby(code);
        setLobby(data);
        setPlayers(sortPlayers(data.lobby_players ?? []));
        const url = await QRCode.toDataURL(data.code, { margin: 1 });
        setQrDataUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load lobby.");
      } finally {
        setLoading(false);
      }
    };
    loadLobby();
  }, [code]);

  useEffect(() => {
    if (!supabase || !lobby) return;

    const channel = supabase
      .channel(`lobby-${lobby.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "lobby_players",
          filter: `lobby_id=eq.${lobby.id}`,
        },
        async () => {
          try {
            const updated = await fetchLobby(code);
            setLobby(updated);
            setPlayers(sortPlayers(updated.lobby_players ?? []));
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Unable to refresh lobby."
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, lobby]);

  const handleLeaveClick = async () => {
    if (!lobby || !userId) return;
    setLeaving(true);
    setError(null);
    try {
      await leaveLobby({ lobbyId: lobby.id, fid: userId });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave lobby.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.row}>
        <div>
          <p>Lobby code</p>
          <h2>{code || "..."}</h2>
        </div>
        <Wallet />
      </header>

      {loading && <p>Loading lobby...</p>}
      {error && <p>{error}</p>}

      {lobby && (
        <div>
          <section className={styles.card}>
            <div className={styles.row}>
              <div>
                <p>Share this code</p>
                <h3>{lobby.code}</h3>
              </div>
              <div>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt={`QR for lobby ${lobby.code}`} width={120} />
                ) : (
                  <span>Generating QR...</span>
                )}
              </div>
            </div>
            <p>Created at {new Date(lobby.created_at).toLocaleString()}</p>
            <p>Your wallet: {address ?? "connect to show address"}</p>
            <Button onClick={handleLeaveClick} disabled={leaving}>
              {leaving ? "Leaving..." : "Leave lobby"}
            </Button>
          </section>

          <section className={styles.card}>
            <div className={styles.row}>
              <h3>Players</h3>
              <span>{players.length} joined</span>
            </div>

            <ul className={styles.list}>
              {players.map((player) => (
                <li key={player.id}>
                  <div>
                    <strong>User {player.fid}</strong>
                    <div>
                      {player.wallet_address
                        ? `Wallet ${player.wallet_address}`
                        : "No wallet on record"}
                    </div>
                  </div>
                  <div>{new Date(player.joined_at).toLocaleTimeString()}</div>
                </li>
              ))}
              {players.length === 0 && <li>Waiting for players...</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
