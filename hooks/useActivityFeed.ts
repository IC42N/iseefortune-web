// /hooks/useActivityFeed.ts
"use client";

import { useEffect, useState } from "react";
import type { ActivityMessage } from "@/firebase/activityFeedRepo";
import { subscribeActivityFeed } from "@/firebase/activityFeedRepo";
import { useAtomValue } from "jotai";
import { selectedTierAtom } from "@/state/tier-atoms"; // adjust path if different


export type UseActivityFeedArgs = {
  enabled?: boolean;       // default true
  limitCount?: number;     // pass through to repo
  collectionPath?: string; // pass through to repo
};


export function useTierActivityFeed() {
  const tier = useAtomValue(selectedTierAtom); // assumes a number like 1..5
  // If the tier isn't selected yet, disable subscription
  const enabled = tier > 0;

  const activityRoute = `rooms/tier${tier}/messages`;
  //console.log("useTierActivityFeed:", activityRoute);

  return useActivityFeed({
    enabled,
    limitCount: 20,
    collectionPath: activityRoute,
  });
}


export function useActivityFeed(args?: UseActivityFeedArgs) {
  const enabled = args?.enabled ?? true;
  const limitCount = args?.limitCount;
  const collectionPath = args?.collectionPath;

  const [messages, setMessages] = useState<ActivityMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {

    if (!enabled) {
      //console.log("[ActivityFeed] disabled → clearing state");
      setLoading(false);
      setError(null);
      setMessages([]);
      return;
    }

    //console.log("[ActivityFeed] subscribing…");
    setLoading((prev) => (messages.length === 0 ? true : prev));
    setError(null);

    const unsub = subscribeActivityFeed(
      (msgs) => {
        // console.log("[ActivityFeed] snapshot received", {
        //   count: msgs.length,
        //   first: msgs[0],
        // });

        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error("[ActivityFeed] snapshot error", err);
        setError(err.message || "Failed to load activity feed");
        setLoading(false);
      },
      { limitCount, collectionPath }
    );

    return () => {
      //console.log("[ActivityFeed] unsubscribing");
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, limitCount, collectionPath]);

  return { messages, loading, error };
}