import { createContext } from 'react';

export type MessageType = 'success' | 'error' | 'info';

export type Message = { id: number; type: MessageType; text: string };

export type MessageContextValue = {
  showMessage: (type: MessageType, text: string) => void;
};

export const MessageContext = createContext<MessageContextValue>({
  showMessage: () => {},
});
