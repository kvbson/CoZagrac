import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { MessageContext } from './MessageContext';
import type { Message, MessageType } from './MessageContext';

const AUTO_DISMISS_MS = 5000;

/**
 * Bottom-right toast stack (Steam-dark styling in index.css). Global
 * inline feedback for async actions - the app has no other error banner.
 */
export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const showMessage = useCallback((type: MessageType, text: string) => {
    const id = nextId.current++;
    setMessages((current) => [...current, { id, type, text }]);

    const timer = setTimeout(() => {
      setMessages((current) => current.filter((m) => m.id !== id));
      timers.current.delete(id);
    }, AUTO_DISMISS_MS);
    timers.current.set(id, timer);
  }, []);

  return (
    <MessageContext.Provider value={{ showMessage }}>
      {children}
      <div className="messages" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`messages__item messages__item--${message.type}`}>
            {message.text}
          </div>
        ))}
      </div>
    </MessageContext.Provider>
  );
}
