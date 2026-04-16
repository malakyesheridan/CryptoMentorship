"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SystemsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[/systems] render error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Card
          className="border-l-4"
          style={{ borderLeftColor: "var(--danger)" }}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div
                className="rounded-full p-2"
                style={{ background: "rgba(239, 68, 68, 0.1)" }}
              >
                <AlertTriangle className="h-5 w-5" style={{ color: "var(--danger)" }} />
              </div>
              <div className="flex-1">
                <h2 className="heading-md text-[var(--text-strong)]">
                  Unable to load live data
                </h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  The data source may be temporarily unavailable. This usually
                  resolves within a few minutes — try again shortly.
                </p>
                {error.digest && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Ref: {error.digest}
                  </p>
                )}
                <div className="mt-4">
                  <Button onClick={reset} variant="default">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
