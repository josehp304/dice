import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const ALPACA_API_KEY = process.env.ALPACA_API_KEY || '';
const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET || '';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) return new Response('Symbol required', { status: 400 });

  let formattedSymbol = symbol.toUpperCase();
  const isCrypto = formattedSymbol.includes('/') || formattedSymbol.includes('-') || (formattedSymbol.length > 3 && formattedSymbol.endsWith('USD'));
  
  if (isCrypto) {
    formattedSymbol = formattedSymbol.replace('-', '/');
    if (!formattedSymbol.includes('/')) formattedSymbol = formattedSymbol.replace('USD', '/USD');
  }

  const wsUrl = isCrypto 
    ? 'wss://stream.data.alpaca.markets/v1beta3/crypto/us'
    : 'wss://stream.data.alpaca.markets/v2/iex'; // Use IEX for free tier stocks

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        // Wait for connection success message before authenticating
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          for (const msg of data) {
            if (msg.T === 'success' && msg.msg === 'connected') {
              ws.send(JSON.stringify({
                action: 'auth',
                key: ALPACA_API_KEY,
                secret: ALPACA_API_SECRET
              }));
            } else if (msg.T === 'success' && msg.msg === 'authenticated') {
              ws.send(JSON.stringify({
                action: 'subscribe',
                trades: [formattedSymbol], // Trades for the symbol to get live prices
                quotes: [formattedSymbol]  // Fallback to quotes if trades are sparse
              }));
            } else if (msg.T === 't' || msg.T === 'q') {
              // msg.p is trade price, msg.ap is ask price, we fall back if trade doesn't have it
              const price = msg.p || msg.ap || msg.bp; 
              if (price) {
                const payload = JSON.stringify({ price, time: msg.t });
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
              }
            } else if (msg.T === 'error') {
              console.error('Alpaca WS Error:', msg);
              controller.enqueue(encoder.encode(`event: error\ndata: ${msg.msg}\n\n`));
            }
          }
        } catch (err) {
          console.error('WebSocket parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('Alpaca WS Connection Error:', err);
        try {
          controller.enqueue(encoder.encode(`event: close\ndata: error\n\n`));
          controller.close();
        } catch(e) {}
      };

      ws.onclose = () => {
        try {
          controller.close();
        } catch(e) {}
      };

      req.signal.addEventListener('abort', () => {
        ws.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
