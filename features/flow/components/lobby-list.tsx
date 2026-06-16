"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLobby } from "@/features/flow/contexts/lobby-context";
import { User, Mail, RotateCcw } from "lucide-react";

export function LobbyList() {
  const { visitors, connected, isOwner, sendInvite } = useLobby();

  if (!isOwner) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <User />
          Лобби
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-72" align="start">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>Лобби</span>
          <span className="text-xs font-normal text-muted-foreground">
            {connected ? "online" : "reconnecting..."}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {visitors.length === 0 ? (
          <DropdownMenuItem disabled>
            Nobody is viewing this workspace
          </DropdownMenuItem>
        ) : (
          <DropdownMenuGroup>
            {visitors.map((visitor) => {
              const isSending = visitor.inviteStatus === "sending";
              const isSent = visitor.inviteStatus === "sent";

              return (
                <DropdownMenuItem
                  key={`${visitor.userId}:${visitor.sessionId}`}
                  onSelect={(event) => {
                    event.preventDefault();
                    if (!isSending) {
                      void sendInvite(visitor);
                    }
                  }}
                  disabled={isSending}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {visitor.name || visitor.email}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {visitor.email}
                    </div>
                  </div>

                  <div className="shrink-0 text-muted-foreground">
                    {isSending ? (
                      <RotateCcw className="size-4 animate-spin" />
                    ) : isSent ? (
                      <RotateCcw className="size-4" />
                    ) : (
                      <Mail className="size-4" />
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
