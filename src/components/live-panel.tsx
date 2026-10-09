"use client";

import { Check, Lightning, SignOut, UsersThree } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, post } from "@/lib/api-client";
import type { Tier } from "@/lib/db/schema";
import type { LiveState } from "@/lib/drops";
import { fmtRemaining, relTime } from "@/lib/format";
import { money, pct } from "@/lib/money";
import { Countdown } from "./countdown";
import { CrewShare } from "./crew-share";
import { Ladder } from "./ladder";
import { SignInForm } from "./sign-in-form";
import dynamic from "next/dynamic";

// Card form loads only at the card step — browsing a drop never downloads Stripe.
const StripeHold = dynamic(() => import("./stripe-hold").then((m) => m.StripeHold), {
  ssr: false,
  loading: () => <div className="skeleton h-56" aria-label="Loading card form" />,
});

export type Viewer = { signedIn: boolean; crewCode: string | null };
export type ViewerPledge = { id: string; status: string; heldCents: number; chargedCents: number | null; canLeave: boolean } | null;

type Props = {
  slug: string;
  item: string;
  brand: string;
  retailCents: number;
  tiers: Tier[];
  initial: LiveState;
  viewer: Viewer;
  pledge: ViewerPledge;
  siteUrl: string;
  leaveGraceMinutes: number;
};

const POLL_MS = 8000;

/** Poll the drop's live state while the tab is visible. */
function useLive(slug: string, initial: LiveState) {
  const [state, setState] = useState(initial);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/drops/${slug}`, { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      /* offline: keep the last known state */
    }
  }, [slug]);
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(id);
      if (document.visibilityState === "visible") id = setInterval(refresh, POLL_MS);
    };
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
      start();
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);
  return { state, refresh };
}

export function LivePanel(props: Props) {
  const { state, refresh } = useLive(props.slug, props.initial);
  const { ladder } = state;
  const open = state.status === "live" && !state.closing;

  // Celebrate a tier unlock that happens while you're watching.
  const lastTier = useRef(ladder.unlockedTier);
  const [unlockFlash, setUnlockFlash] = useState(0);
  useEffect(() => {
    if (ladder.unlockedTier > lastTier.current) setUnlockFlash((n) => n + 1);
    lastTier.current = ladder.unlockedTier;
  }, [ladder.unlockedTier]);

  const shownPrice = state.finalPriceCents ?? ladder.priceCents ?? props.tiers[0]!.priceCents;

  return (
    <div className="grid gap-6">
      {/* price */}
      <div className="grid gap-2">
        <div className="flex items-center gap-2 label text-ink-2">
          {open ? <span className="live-dot" aria-hidden /> : null}
          <span>{headline(state)}</span>
        </div>
        <div className="flex items-end gap-4 flex-wrap">
          <span key={shownPrice} className="display text-stamp num text-[5.5rem] sm:text-[7rem] leading-[0.78] rise">
            {money(shownPrice)}
          </span>
          <div className="pb-2 font-mono text-sm leading-relaxed">
            <div className="text-ink-3 line-through num">retail {money(props.retailCents)}</div>
            <div className="text-go num">you keep {money(props.retailCents - shownPrice)} · {pct(props.retailCents - shownPrice, props.retailCents)}%</div>
          </div>
          {unlockFlash > 0 ? (
            <span key={unlockFlash} className="stamp stamp-go thump text-sm self-center">
              Price dropped
            </span>
          ) : null}
        </div>
      </div>

      <Ladder tiers={props.tiers} members={ladder.members} unlockedTier={ladder.unlockedTier} />

      <dl className="grid grid-cols-3 border-y border-line divide-x divide-line">
        <Stat label="Members" value={ladder.members.toLocaleString("en-US")} />
        <Stat
          label={ladder.next ? "Next tier" : "Tier"}
          value={ladder.next ? `${ladder.next.needed} more` : "Floor"}
          tone={ladder.next && ladder.next.needed <= 10 ? "hot" : undefined}
        />
        <div className="px-3 py-3 first:pl-0">
          <dt className="label text-ink-3">{open ? "Closes in" : "Status"}</dt>
          <dd className="display text-3xl mt-1">
            {open ? <Countdown closesAt={state.closesAt} initial={fmtRemaining(new Date(state.closesAt).getTime() - Date.now())} /> : closedLabel(state)}
          </dd>
        </div>
      </dl>

      {open && ladder.next ? (
        <p className="text-lg leading-snug">
          <b className="font-semibold">{ladder.next.needed} more</b> and everyone pays{" "}
          <b className="text-stamp font-semibold">{money(ladder.next.priceCents)}</b>
          {ladder.quorumMet ? " — including everyone already in." : " — and the drop opens."}
        </p>
      ) : null}

      <JoinFlow {...props} state={state} open={open} onChange={refresh} />

      <Activity events={state.events} />
    </div>
  );
}

function headline(s: LiveState) {
  if (s.status === "succeeded") return "Cleared — final price";
  if (s.status === "failed") return "Missed quorum — nobody charged";
  if (s.status === "canceled") return "Cancelled — every hold released";
  if (s.closing || s.status === "settling") return "Closing — settling holds";
  if (!s.ladder.quorumMet) return "Opening price — needs quorum";
  return "Everyone pays, right now";
}

function closedLabel(s: LiveState) {
  return s.status === "succeeded" ? "Cleared" : s.status === "failed" ? "Missed" : s.status === "canceled" ? "Cancelled" : "Closing";
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "hot" }) {
  return (
    <div className="px-3 py-3 first:pl-0">
      <dt className="label text-ink-3">{label}</dt>
      <dd className={`display text-3xl mt-1 num ${tone === "hot" ? "text-stamp" : ""}`}>{value}</dd>
    </div>
  );
}

function Activity({ events }: { events: LiveState["events"] }) {
  if (events.length === 0) return null;
  return (
    <div>
      <p className="label text-ink-3 mb-2">On this drop</p>
      <ul className="divide-y divide-line border-y border-line">
        {events.slice(0, 6).map((e) => (
          <li key={`${e.at}-${e.label}`} className="flex items-center gap-3 py-2 text-sm">
            {e.kind === "tier_unlocked" ? (
              <Lightning weight="fill" className="text-go shrink-0" size={16} />
            ) : (
              <UsersThree className="text-ink-3 shrink-0" size={16} />
            )}
            <span className={e.kind === "tier_unlocked" ? "font-semibold" : "text-ink-2"}>{e.label}</span>
            <span className="ml-auto label text-ink-3 shrink-0" suppressHydrationWarning>
              {relTime(e.at)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Stage =
  | { kind: "idle" }
  | { kind: "signin" }
  | { kind: "joining" }
  | { kind: "card"; pledgeId: string; clientSecret: string; publishableKey: string; holdCents: number }
  | { kind: "error"; message: string };

function JoinFlow(props: Props & { state: LiveState; open: boolean; onChange: () => Promise<void> }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [pledge, setPledge] = useState<ViewerPledge>(props.pledge);
  const [leaving, setLeaving] = useState(false);
  // The server's `viewer` prop lags an inline sign-in until the refresh lands; track it here.
  const [signedIn, setSignedIn] = useState(props.viewer.signedIn);
  // Same lag for the crew code: take it straight from the sign-in response, so the
  // very first link a new member copies already credits them.
  const [crewCode, setCrewCode] = useState(props.viewer.crewCode);
  const holdCents = props.state.ladder.holdCents;

  const join = useCallback(async () => {
    setStage({ kind: "joining" });
    try {
      const r = await post<{ pledgeId: string; status: string; clientSecret: string | null; holdCents: number; publishableKey: string | null }>(
        `/api/drops/${props.slug}/join`,
      );
      if (r.status === "held") {
        setPledge({ id: r.pledgeId, status: "held", heldCents: r.holdCents, chargedCents: null, canLeave: true });
        setStage({ kind: "idle" });
        await props.onChange();
        router.refresh();
      } else if (r.clientSecret && r.publishableKey) {
        setStage({ kind: "card", pledgeId: r.pledgeId, clientSecret: r.clientSecret, publishableKey: r.publishableKey, holdCents: r.holdCents });
      } else {
        setStage({ kind: "error", message: "Card payments aren't configured on this server yet." });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === "signed_out") setStage({ kind: "signin" });
      else setStage({ kind: "error", message: err instanceof ApiError ? err.message : "Couldn't join. Try again." });
    }
  }, [props, router]);

  async function confirmHold(pledgeId: string, cents: number) {
    try {
      const r = await post<{ status: string }>(`/api/pledges/${pledgeId}/confirm`);
      if (r.status === "held" || r.status === "pending") {
        // "pending": Stripe accepted it but our webhook may land a beat later.
        setPledge({ id: pledgeId, status: "held", heldCents: cents, chargedCents: null, canLeave: true });
        setStage({ kind: "idle" });
        await props.onChange();
        router.refresh();
      } else {
        setStage({ kind: "error", message: "The card was declined, so nothing was held. Try another card." });
      }
    } catch (err) {
      setStage({ kind: "error", message: err instanceof ApiError ? err.message : "Couldn't confirm the hold." });
    }
  }

  async function leave() {
    if (!pledge) return;
    setLeaving(true);
    try {
      await post(`/api/pledges/${pledge.id}/leave`);
      setPledge(null);
      await props.onChange();
      router.refresh();
    } catch (err) {
      setStage({ kind: "error", message: err instanceof ApiError ? err.message : "Couldn't leave the drop." });
    } finally {
      setLeaving(false);
    }
  }

  const code = crewCode ?? props.viewer.crewCode;
  const crewUrl = code ? `${props.siteUrl}/drops/${props.slug}?c=${code}` : `${props.siteUrl}/drops/${props.slug}`;
  const next = props.state.ladder.next;
  const shareMessage = next
    ? `I'm in on the ${props.brand} ${props.item} drop. ${next.needed} more and it's ${money(next.priceCents)} for all of us —`
    : `${props.brand} ${props.item} is at its lowest price (${money(props.state.ladder.priceCents ?? holdCents)}) —`;

  // Already a member
  if (pledge && ["held", "capturing", "charged", "pending"].includes(pledge.status)) {
    const charged = pledge.status === "charged";
    return (
      <section aria-label="Your membership" className="bg-receipt border-2 border-ink p-5 sm:p-6 grid gap-5 shadow-[6px_6px_0_var(--shadow)]">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center w-9 h-9 bg-go text-paper shrink-0">
            <Check weight="bold" size={20} />
          </span>
          <div>
            <p className="display text-3xl">{charged ? "You're in — it cleared" : "You're in"}</p>
            <p className="text-ink-2 mt-1">
              {charged
                ? `Charged ${money(pledge.chargedCents ?? 0)}. Production has started.`
                : `Hold: ${money(pledge.heldCents)} — the most you can pay. You'll be charged the closing price${
                    props.state.ladder.priceCents !== null && props.state.ladder.priceCents < pledge.heldCents
                      ? `, currently ${money(props.state.ladder.priceCents)}`
                      : ""
                  }.`}
            </p>
          </div>
        </div>
        {props.open ? (
          <>
            <div className="grid gap-1">
              <p className="label text-ink-2">Bring your chat. Every person moves the price for everyone.</p>
            </div>
            <CrewShare url={crewUrl} message={shareMessage} />
            {pledge.canLeave ? (
              <button type="button" onClick={leave} disabled={leaving} className="justify-self-start text-sm text-ink-3 hover:text-stamp underline inline-flex items-center gap-1">
                <SignOut size={14} /> {leaving ? "Leaving…" : "Leave this drop and release my hold"}
              </button>
            ) : (
              <p className="text-xs text-ink-3">
                Quorum&apos;s met and it&apos;s been over {props.leaveGraceMinutes} minutes since you joined, so you&apos;re locked in — your spot is part of what&apos;s holding the price down.
              </p>
            )}
          </>
        ) : null}
        {stage.kind === "error" ? <p role="alert" className="text-sm text-stamp">{stage.message}</p> : null}
      </section>
    );
  }

  if (!props.open) return null;

  return (
    <section aria-label="Join this drop" className="grid gap-4">
      {stage.kind === "signin" ? (
        <div className="bg-receipt border-2 border-ink p-5 grid gap-3">
          <p className="display text-2xl">One code and you&apos;re in</p>
          <SignInForm
            cta="Get code"
            onSignedIn={async (u) => {
              setSignedIn(true);
              setCrewCode(u.crewCode);
              await join();
            }}
          />
        </div>
      ) : stage.kind === "card" ? (
        <div className="bg-receipt border-2 border-ink p-5">
          <StripeHold
            publishableKey={stage.publishableKey}
            clientSecret={stage.clientSecret}
            holdLabel={money(stage.holdCents)}
            onHeld={() => confirmHold(stage.pledgeId, stage.holdCents)}
          />
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn btn-stamp w-full text-2xl min-h-16"
            disabled={stage.kind === "joining"}
            onClick={() => (signedIn ? join() : setStage({ kind: "signin" }))}
          >
            {stage.kind === "joining" ? "Placing hold…" : `Join — hold ${money(holdCents)}`}
          </button>
          <p className="text-sm text-ink-2">
            Your card is held, never charged, until the drop closes. Then you pay the closing price — {money(holdCents)} at most, less if more people join.
          </p>
        </>
      )}
      {stage.kind === "error" ? (
        <p role="alert" className="text-sm text-stamp">
          {stage.message}
        </p>
      ) : null}
    </section>
  );
}
