export interface MessageThread {
  id: string;
  doctorId: string;
  patientId: string;
  doctorName: string;
  patientName: string;
  updatedAt?: string;
  lastMessage?: {
    body: string;
    createdAt: string;
    senderName: string;
    isMine: boolean;
  } | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderUserId: string;
  body: string;
  readAt?: string | null;
  createdAt: string;
  isMine: boolean;
  senderName: string;
}

export interface MessageContact {
  doctorId?: string;
  patientId?: string;
  name: string;
}
