import MessageChatPanel from "@/features/messages/components/MessageChatPanel";

const MessagesPanel = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-lg font-semibold text-foreground">Care team messages</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Secure messages from your doctor and care team appear here.
      </p>
    </div>
    <MessageChatPanel mode="patient" heightClass="h-[480px]" />
  </div>
);

export default MessagesPanel;
