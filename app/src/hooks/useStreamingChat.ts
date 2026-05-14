import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/store';

interface StreamMessage {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  conversation_id?: string;
  message?: string;
}

export function useStreamingChat() {
  const [isStreaming, setIsStreaming] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const addMessage = useStore((s) => s.addMessage);
  const currentConversation = useStore((s) => s.currentConversation);
  const setIsTyping = useStore((s) => s.setIsTyping);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBase}/chat/ws/dev`);

    ws.onopen = () => {
      wsRef.current = ws;
    };

    ws.onclose = () => {
      wsRef.current = null;
    };

    ws.onerror = () => {
      wsRef.current = null;
    };

    wsRef.current = ws;
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!currentConversation) return;

      const userMessage = {
        id: `msg-${Date.now()}`,
        role: 'user' as const,
        content,
        timestamp: Date.now(),
      };
      addMessage(userMessage);
      setIsTyping(true);
      setIsStreaming(true);

      let fullResponse = '';

      try {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          connect();
          await new Promise<void>((resolve) => {
            const check = () => {
              if (wsRef.current?.readyState === WebSocket.OPEN) resolve();
              else setTimeout(check, 100);
            };
            check();
          });
        }

        const history = currentConversation.messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        wsRef.current!.send(
          JSON.stringify({
            type: 'chat',
            content,
            conversation_id: currentConversation.id,
            history,
          })
        );

        const assistantMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant' as const,
          content: '',
          timestamp: Date.now(),
        };

        const handleMessage = (event: MessageEvent) => {
          const data: StreamMessage = JSON.parse(event.data);

          if (data.type === 'chunk' && data.content) {
            fullResponse += data.content;
            assistantMessage.content = fullResponse;
          } else if (data.type === 'done') {
            assistantMessage.content = fullResponse;
            addMessage(assistantMessage);
            setIsTyping(false);
            setIsStreaming(false);
            wsRef.current?.removeEventListener('message', handleMessage);
          } else if (data.type === 'error') {
            setIsTyping(false);
            setIsStreaming(false);
            wsRef.current?.removeEventListener('message', handleMessage);
          }
        };

        wsRef.current!.addEventListener('message', handleMessage);
      } catch {
        setIsTyping(false);
        setIsStreaming(false);
      }
    },
    [currentConversation, addMessage, setIsTyping, connect]
  );

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  return { sendMessage, isStreaming, connect, disconnect };
}
