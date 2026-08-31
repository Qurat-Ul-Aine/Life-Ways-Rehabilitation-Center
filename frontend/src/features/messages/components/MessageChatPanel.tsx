import { useCallback, useEffect, useRef, useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { messageService } from "@/features/messages/services/messageService";
import type { ChatMessage, MessageThread } from "@/features/messages/message.types";

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const formatTime = (raw?: string) => {
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-PK", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export type ThreadListItem = {
  id: string;
  name: string;
  role: string;
  last: string;
  time: string;
  unread: number;
  patientId?: string;
  doctorId?: string;
  isContact?: boolean;
};

type MessageChatPanelProps = {
  mode: "doctor" | "patient";
  heightClass?: string;
};

export default function MessageChatPanel({
  mode,
  heightClass = "h-[520px]",
}: MessageChatPanelProps) {
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [headerName, setHeaderName] = useState("");
  const [headerRole, setHeaderRole] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialSelectDone = useRef(false);

  const mapThread = useCallback(
    (t: MessageThread): ThreadListItem => ({
      id: t.id,
      name: mode === "doctor" ? t.patientName : t.doctorName,
      role: mode === "doctor" ? "Patient" : "Doctor",
      last: t.lastMessage?.body ?? "No messages yet",
      time: t.lastMessage?.createdAt ? formatTime(t.lastMessage.createdAt) : "—",
      unread: t.unreadCount ?? 0,
      patientId: t.patientId,
      doctorId: t.doctorId,
    }),
    [mode],
  );

  const buildThreadList = useCallback(async (): Promise<ThreadListItem[]> => {
    const [threadList, contactList] = await Promise.all([
      messageService.listThreads(),
      messageService.listContacts(),
    ]);

    const mapped = threadList.map(mapThread);
    const threadPatientIds = new Set(threadList.map((t) => t.patientId));
    const threadDoctorIds = new Set(threadList.map((t) => t.doctorId));

    const contactThreads: ThreadListItem[] = contactList
      .filter((c) => {
        if (mode === "doctor") return c.patientId && !threadPatientIds.has(c.patientId);
        return c.doctorId && !threadDoctorIds.has(c.doctorId);
      })
      .map((c) => ({
        id: `contact-${mode === "doctor" ? c.patientId : c.doctorId}`,
        name: c.name,
        role: mode === "doctor" ? "Patient" : "Doctor",
        last: "Start a conversation",
        time: "—",
        unread: 0,
        patientId: c.patientId,
        doctorId: c.doctorId,
        isContact: true,
      }));

    return [...mapped, ...contactThreads];
  }, [mapThread, mode]);

  const refreshThreads = useCallback(async () => {
    const all = await buildThreadList();
    setThreads(all);
    return all;
  }, [buildThreadList]);

  const loadConversation = useCallback(
    async (item: ThreadListItem) => {
      setSelectedId(item.id);
      setHeaderName(item.name);
      setHeaderRole(item.role);
      setLoadingMessages(true);
      setError(null);
      setMessages([]);

      try {
        let threadId = item.id;

        if (item.isContact) {
          const created = await messageService.ensureThread(
            mode === "doctor"
              ? { patientId: item.patientId }
              : { doctorId: item.doctorId },
          );
          threadId = created.id;
          const all = await refreshThreads();
          const createdItem = all.find((t) => t.id === threadId);
          if (createdItem) {
            setSelectedId(threadId);
            setHeaderName(createdItem.name);
            setHeaderRole(createdItem.role);
          }
        }

        const { items } = await messageService.getThreadMessages(threadId);
        setMessages(items);
        await messageService.markThreadRead(threadId);
        setThreads((prev) =>
          prev.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load conversation");
      } finally {
        setLoadingMessages(false);
      }
    },
    [mode, refreshThreads],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await buildThreadList();
        if (cancelled) return;
        setThreads(all);
        if (!initialSelectDone.current && all.length > 0) {
          initialSelectDone.current = true;
          const first = all.find((t) => !t.isContact) ?? all[0];
          await loadConversation(first);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load messages");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [buildThreadList, loadConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    const active = threads.find((t) => t.id === selectedId);
    if (!text || !selectedId || active?.isContact) return;

    setSending(true);
    try {
      const sent = await messageService.sendMessage(selectedId, text);
      setMessages((prev) => [...prev, sent]);
      setInput("");
      await refreshThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  return (
    <div className={cn("flex gap-3", heightClass)}>
      <div className="flex w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-3">
          <p className="text-xs font-semibold text-foreground">Messages</p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
            <MessageSquare size={22} className="mb-1 text-muted-foreground/50" />
            <p className="text-[11px] text-muted-foreground">
              {mode === "doctor" ? "No patients to message" : "No doctor assigned yet"}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => loadConversation(t)}
                className={cn(
                  "w-full border-b border-border/50 px-3 py-2.5 text-left transition-colors last:border-none",
                  selectedId === t.id ? "bg-primary/10" : "hover:bg-muted/50",
                )}
              >
                <div className="flex items-start gap-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                      {getInitials(t.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-1">
                      <p className="truncate text-[11px] font-semibold text-foreground">{t.name}</p>
                      <p className="shrink-0 text-[9px] text-muted-foreground">{t.time}</p>
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">{t.last}</p>
                  </div>
                  {t.unread > 0 && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                      {t.unread}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <MessageSquare size={28} className="mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Select a conversation</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                  {getInitials(headerName || selected.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-foreground">{headerName || selected.name}</p>
                <p className="text-[11px] text-muted-foreground">{headerRole || selected.role}</p>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
              )}
              {loadingMessages ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-2/3 rounded-xl" />
                  <Skeleton className="ml-auto h-10 w-1/2 rounded-xl" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center py-8">
                  <p className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
                    No messages yet — start the conversation
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn("flex", m.isMine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                        m.isMine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          m.isMine ? "text-primary-foreground/75" : "text-muted-foreground",
                        )}
                      >
                        {formatTime(m.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="flex gap-2 border-t border-border px-4 py-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message…"
                disabled={sending || selected.isContact}
                className="flex-1 rounded-xl border border-input bg-muted/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
              />
              <Button
                size="sm"
                className="h-9 gap-1 px-3"
                disabled={!input.trim() || sending || selected.isContact}
                onClick={handleSend}
              >
                <Send size={13} /> Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
