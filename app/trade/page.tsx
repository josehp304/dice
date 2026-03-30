'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { createChart, IChartApi, ISeriesApi, CandlestickData } from 'lightweight-charts';

export default function AlpacaTradePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [symbol, setSymbol] = useState('BTC/USD');
  const [activeSymbol, setActiveSymbol] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [buyAmount, setBuyAmount] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [loadingTrade, setLoadingTrade] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Create chart and series...
    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: 'solid', color: '#111' } as any, textColor: '#A0A0A5' },
      grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
      timeScale: { timeVisible: true, borderColor: '#222' },
      autoSize: true,
    });
    const series = chart.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350'
    });
    chartRef.current = chart;
    seriesRef.current = series;

    return () => chart.remove();
  }, []);

  const lastCandleRef = useRef<any>(null);

  useEffect(() => {
    if (!activeSymbol) return;

    const eventSource = new EventSource(`/api/alpaca/stream?symbol=${encodeURIComponent(activeSymbol)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.price) {
          setQuote((prev: any) => {
            if (!prev) return prev;
            return { ...prev, price: data.price };
          });

          if (seriesRef.current && lastCandleRef.current) {
            const lastCandle = lastCandleRef.current;
            const newPrice = Number(data.price);
            const updatedCandle = {
              ...lastCandle,
              high: Math.max(lastCandle.high, newPrice),
              low: Math.min(lastCandle.low, newPrice),
              close: newPrice
            };
            
            lastCandleRef.current = updatedCandle;
            
            try {
              seriesRef.current.update({
                time: lastCandle.time, 
                open: updatedCandle.open,
                high: updatedCandle.high,
                low: updatedCandle.low,
                close: updatedCandle.close
              });
            } catch (e) {
              // Ignore order errors
            }
          }
        }
      } catch (err) {
        // ignore parse error
      }
    };

    return () => {
      eventSource.close();
    };
  }, [activeSymbol]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setLoadingSearch(true);
    setQuote(null);
    setHistory([]);
    
    try {
      let qSymbol = symbol.toUpperCase();
      // format common crypto queries to expected alpaca format
      if (qSymbol.includes('-')) qSymbol = qSymbol.replace('-', '/');
      if (qSymbol === 'BTC' || qSymbol === 'ETH') qSymbol = `${qSymbol}/USD`;

      const [quoteRes, historyRes] = await Promise.all([
        fetch(`/api/alpaca/${encodeURIComponent(qSymbol)}?type=quote`),
        fetch(`/api/alpaca/${encodeURIComponent(qSymbol)}?type=history`),
      ]);

      const quoteData = await quoteRes.json();
      const historyData = await historyRes.json();

      if (!quoteRes.ok) throw new Error(quoteData.error || 'Failed to fetch quote');
      if (!historyRes.ok) throw new Error(historyData.error || 'Failed to fetch history');

      setQuote(quoteData);
      const loadedHistory = historyData.history || [];
      setActiveSymbol(qSymbol);

      if(loadedHistory.length > 0) {
        lastCandleRef.current = loadedHistory[loadedHistory.length - 1];

        // Format and set the data exactly once per search
        if (seriesRef.current) {
          const uniqueData = loadedHistory.map((item: any) => ({
            time: item.time, open: item.open, high: item.high, low: item.low, close: item.close,
          })).filter((h: any) => h.time && !isNaN(h.open)).reduce((acc: any, current: any) => {
            if (!acc.find((item: any) => item.time === current.time)) acc.push(current);
            return acc;
          }, []).sort((a: any, b: any) => new Date(a.time as string).getTime() - new Date(b.time as string).getTime());

          if (uniqueData.length > 0) {
            seriesRef.current.setData(uniqueData);
            chartRef.current?.timeScale().fitContent();
          }
        }
      } else {
        showToast('Warning: No historical data available (API limit)', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleBuy = async () => {
    if (!activeSymbol || !buyAmount || isNaN(Number(buyAmount)) || Number(buyAmount) <= 0) return;
    
    setLoadingTrade(true);
    try {
      const res = await fetch('/api/alpaca/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: activeSymbol, amount: Number(buyAmount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Buy failed');
      
      showToast(`Successfully bought ${activeSymbol}`, 'success');
      setBuyAmount('');
      refreshUser();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingTrade(false);
    }
  };

  const handleSell = async () => {
    if (!activeSymbol || !sellShares || isNaN(Number(sellShares)) || Number(sellShares) <= 0) return;
    
    setLoadingTrade(true);
    try {
      const res = await fetch('/api/alpaca/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: activeSymbol, sharesToSell: Number(sellShares) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sell failed');
      
      showToast(`Successfully sold ${activeSymbol}`, 'success');
      setSellShares('');
      refreshUser();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoadingTrade(false);
    }
  };

  const calculateTotalPortfolioValue = () => {
    if (!user?.portfolio) return 0;
    return user.portfolio.reduce((acc, item) => acc + (item.shares * item.averagePrice), 0);
  };

  return (
    <main className="container pb-12">
      <div className="section-header mb-8 mt-4">
        <h1 className="text-3xl font-bold font-mono tracking-tight text-primary">ALPACA.SYS</h1>
        <p className="text-muted-foreground mt-2">Live Paper Trading API with real market data</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-1 space-y-6">
          <div className="card border border-border bg-card">
            <h2 className="text-xl font-semibold mb-4">Market Data</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                className="input flex-1 bg-secondary/50 border border-border rounded px-3 py-2"
                placeholder="Ticker (e.g. BTC/USD or AAPL)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={loadingSearch}>
                {loadingSearch ? '...' : 'LOAD'}
              </button>
            </form>

            {quote && (
              <div className="mt-6 p-4 rounded-lg bg-secondary/20 border border-border">
                <div className="flex justify-between items-center border-b border-border pb-3 mb-3">
                  <div>
                    <h3 className="text-2xl font-bold">{quote.symbol}</h3>
                    <p className="text-sm text-muted-foreground">Ask/Last Price</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-mono">${Number(quote.price).toFixed(2)}</p>
                  </div>
                </div>
                
                {user ? (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Buy Amount (Credits)</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          className="input flex-1 bg-secondary/50 border border-border rounded px-3 py-2" 
                          placeholder="Amount" 
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={handleBuy} disabled={loadingTrade || !quote.price}>BUY</button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Sell Shares / Coin</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          className="input flex-1 bg-secondary/50 border border-border rounded px-3 py-2" 
                          placeholder="Amount/Shares" 
                          value={sellShares}
                          onChange={(e) => setSellShares(e.target.value)}
                        />
                        <button className="btn btn-outline" onClick={handleSell} disabled={loadingTrade || !quote.price}>SELL</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-center text-muted-foreground mt-4">Log in to trade</p>
                )}
              </div>
            )}
          </div>

          <div className="card border border-border bg-card">
            <h2 className="text-xl font-semibold mb-4">Your Portfolio</h2>
            {!user ? (
              <p className="text-muted-foreground text-sm">Please log in to view your portfolio.</p>
            ) : user.portfolio && user.portfolio.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between text-sm py-2 border-b border-border">
                  <span>Balance</span>
                  <span className="font-mono text-primary">{user.balance.toFixed(2)} CRD</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-border">
                  <span>Invested Value</span>
                  <span className="font-mono">{calculateTotalPortfolioValue().toFixed(2)} CRD</span>
                </div>
                
                <div className="mt-4 max-h-[300px] overflow-y-auto">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Holdings</h3>
                  {user.portfolio.map(item => (
                    <div key={item.symbol} className="flex justify-between items-center py-2 border-b border-border/50 hover:bg-secondary/10 px-2 rounded-md transition-colors cursor-pointer" onClick={() => { setSymbol(item.symbol); handleSearch({ preventDefault: () => {} } as any); }}>
                      <div>
                        <div className="font-bold">{item.symbol}</div>
                        <div className="text-xs text-muted-foreground">Avg: ${item.averagePrice.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{item.shares.toFixed(4)} q</div>
                        <div className="text-xs text-muted-foreground">${(item.shares * item.averagePrice).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-sm py-2 border-b border-border">
                  <span>Balance</span>
                  <span className="font-mono text-primary">{user?.balance?.toFixed(2)} CRD</span>
                </div>
                <p className="text-muted-foreground text-sm mt-4">No assets in portfolio. Start buying to build your wealth.</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 lg:col-span-2 flex flex-col">
          <div className="card h-full flex flex-col border border-border bg-card min-h-[500px]">
            <h2 className="text-xl font-semibold mb-6">Price History {activeSymbol ? `- ${activeSymbol}` : ''}</h2>
            <div className="flex-1 w-full relative min-h-[400px]" ref={chartContainerRef}>
              {loadingSearch && (
                <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center pointer-events-none">
                  <div className="text-primary animate-pulse">Loading Chart...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
