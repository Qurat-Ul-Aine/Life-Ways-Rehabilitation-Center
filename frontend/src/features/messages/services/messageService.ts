import api from "@/lib/api";
import type { ChatMessage, MessageContact, MessageThread } from "./message.types";

export const messageService = {
  async listThreads(): Promise<MessageThread[]> {
    const { data } = await api.get("/messages/threads");
    return data?.items ?? [];
  },

  async listContacts(): Promise<MessageContact[]> {
    const { data } = await api.get("/messages/contacts");
    return data?.items ?? [];
  },

  async ensureThread(payload?: { patientId?: string; doctorId?: string }): Promise<MessageThread> {
    const { data } = await api.post("/messages/threads", payload ?? {});
    return data?.data ?? data;
  },

  async getThreadMessages(threadId: string): Promise<{ thread: MessageThread; items: ChatMessage[] }> {
    const { data } = await api.get(`/messages/threads/${threadId}`);
    return {
      thread: data?.thread ?? data?.data?.thread,
      items: data?.items ?? data?.data?.items ?? [],
    };
  },

  async sendMessage(threadId: string, body: string): Promise<ChatMessage> {
    const { data } = await api.post(`/messages/threads/${threadId}/messages`, { body });
    return data?.data ?? data;
  },

  async markThreadRead(threadId: string): Promise<void> {
    await api.patch(`/messages/threads/${threadId}/read`);
  },
};
