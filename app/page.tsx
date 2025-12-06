"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { useAccount } from "wagmi";
import { Modal } from "@/components/Modal";
import { Camera } from "@/components/Camera";
import { Button } from "@/components/Button";
import { createLobby, joinLobby, normalizeCode } from "@/lib/lobbyClient";
import styles from "./page.module.css";

function shortenAddress(value?: string | null): string | null {
  if (!value) return null;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatError(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as any).message === "string"
  ) {
    return (err as any).message as string;
  }
  if (typeof err === "string") return err;
  return fallback;
}

export default function Home() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { context, setMiniAppReady, isMiniAppReady } = useMiniKit();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fid = context?.user?.fid ? String(context.user.fid) : null;
  const username =
    context?.user?.username || context?.user?.displayName || null;
  const userId = fid ?? (address ? `wallet:${address.toLowerCase()}` : null);
  const userLabel = username
    ? `Signed in as @${username}`
    : fid
    ? `FID ${fid}`
    : userId
    ? `Wallet user ${shortenAddress(address)}`
    : "Not in mini app";

  useEffect(() => {
    if (!isMiniAppReady) {
      setMiniAppReady();
    }
  }, [isMiniAppReady, setMiniAppReady]);

  const identityReady = isMiniAppReady && Boolean(userId) && isConnected;
  const identityHint = useMemo(() => {
    if (!isMiniAppReady) return "Waiting for mini app to be ready...";
    if (!userId)
      return "Open inside the Base app and connect your wallet to continue.";
    if (!isConnected) return "Connect your wallet to start.";
    return null;
  }, [userId, isConnected, isMiniAppReady]);

  const handleCreateLobby = async () => {
    if (!userId) {
      setError("Missing user. Open the Base app and connect your wallet.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const lobby = await createLobby({
        ownerFid: userId,
        ownerWallet: address,
      });
      setShowCreateModal(false);
      router.push(`/lobby/${lobby.code}`);
    } catch (err) {
      setError(formatError(err, "Failed to create lobby."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinLobby = async (codeOverride?: string) => {
    if (isSubmitting) return;
    if (!userId) {
      setError("Missing user. Open the Base app and connect your wallet.");
      return;
    }
    const code = normalizeCode(codeOverride ?? joinCode);
    if (!code) {
      setError("Enter or scan a lobby code.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await joinLobby({
        code,
        fid: userId,
        walletAddress: address,
      });
      setShowJoinModal(false);
      router.push(`/lobby/${code}`);
    } catch (err) {
      setError(formatError(err, "Failed to join lobby."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <p>{userLabel}</p>
          <p>
            {address ? `Wallet ${shortenAddress(address)}` : "Connect a wallet"}
          </p>
        </div>
        <Wallet />
      </header>

      <main className={styles.main}>
        <h1>Basechip lobby</h1>
        <p>Start a room or join with a code.</p>

        {identityHint && <p className={styles.muted}>{identityHint}</p>}

        <div className={styles.actions}>
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!identityReady}
          >
            Create game
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowJoinModal(true)}
            disabled={!identityReady}
          >
            Join game
          </Button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </main>

      {showCreateModal && (
        <Modal title="Create a lobby" onClose={() => setShowCreateModal(false)}>
          <Button onClick={handleCreateLobby} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create and share code"}
          </Button>
        </Modal>
      )}

      {showJoinModal && (
        <Modal title="Join a lobby" onClose={() => setShowJoinModal(false)}>
          <div className={styles.field}>
            <label htmlFor="lobbyCode">Enter lobby code</label>
            <div className={styles.inlineField}>
              <input
                id="lobbyCode"
                placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <Button
                className={styles.squareButton}
                onClick={() => handleJoinLobby()}
                disabled={isSubmitting}
                aria-label="Join with code"
              >
                →
              </Button>
            </div>
          </div>

          <p>Or scan a QR code with your camera</p>
          <Camera
            className={styles.scanner}
            onDecoded={(value) => {
              const normalized = normalizeCode(value);
              setJoinCode(normalized);
              handleJoinLobby(normalized);
            }}
            onError={(scanError) =>
              setError(
                scanError instanceof Error
                  ? scanError.message
                  : "Unable to access camera."
              )
            }
          />

          <Button onClick={() => handleJoinLobby()} disabled={isSubmitting}>
            {isSubmitting ? "Joining..." : "Join lobby"}
          </Button>
        </Modal>
      )}
    </div>
  );
}
