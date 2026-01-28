import { useState } from 'react';

export default function MessageCell({ messages }) {
  const [expanded, setExpanded] = useState(false);

  if (!messages || messages.length === 0) {
    return <td className="px-2 py-1 border-r border-zinc-800/50 text-zinc-700">—</td>;
  }

  const msg = messages[0];
  const isWorker = msg.sender_type === 'worker';
  const truncated = msg.content.length > 30 ? msg.content.slice(0, 30) + '...' : msg.content;

  return (
    <td
      className="px-2 py-1 border-r border-zinc-800/50 relative cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <span className={`text-xs ${isWorker ? 'text-purple-400' : 'text-amber-400'}`}>
        <span className="font-medium">{isWorker ? 'W:' : 'B:'}</span>
        {' '}
        {truncated}
      </span>

      {expanded && (
        <div className="absolute z-20 left-0 top-full mt-1 p-3 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-w-xs">
          {messages.map((m, i) => (
            <div key={m.message_id || i} className="mb-2 last:mb-0">
              <div className={`text-xs font-medium mb-0.5 ${m.sender_type === 'worker' ? 'text-purple-400' : 'text-amber-400'}`}>
                {m.sender_type === 'worker' ? 'Worker' : 'Business'}
              </div>
              <div className="text-xs text-zinc-300">{m.content}</div>
            </div>
          ))}
        </div>
      )}
    </td>
  );
}
