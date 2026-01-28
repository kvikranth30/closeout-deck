export default function MessageCell({ messages }) {
  if (!messages || messages.length === 0) {
    return <span className="text-zinc-700">—</span>;
  }

  return (
    <div className="space-y-1">
      {messages.map((msg, i) => {
        const isWorker = msg.sender_type === 'worker';
        return (
          <div key={msg.message_id || i} className="text-xs">
            <span className={`font-medium ${isWorker ? 'text-purple-400' : 'text-amber-400'}`}>
              {isWorker ? 'Worker:' : 'Business:'}
            </span>{' '}
            <span className="text-zinc-300">{msg.content}</span>
          </div>
        );
      })}
    </div>
  );
}
