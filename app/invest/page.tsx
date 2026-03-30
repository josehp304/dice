'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function InvestPage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [symbol, setSymbol] = useState('');
  const [activeSymbol, setActiveSymbol] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [buyAmount, setBuyAmount] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [loadingTrade, setLoadingTrade] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setLoadingSearch(true);
    setQuote(null);
    setHistory([]);
    
    try {
      const qSymbol = symbol.toUpperCase();
      const [quoteRes, historyRes] = await Promise.all([
        fetch(`/api/stocks/${qSymbol}?type=quote`),
        fetch(`/api/stocks/${qSymbol}?type=history`),
      ]);

      const quoteData = await quoteRes.json();
      const historyData = await historyRes.json();

      if (!quoteRes.ok) throw new Error(quoteData.error || 'Failed to fetch quote');
      if (!historyRes.ok) throw new Error(historyData.error || 'Failed to fetch history');

      setQuote(quoteData);
      setHistory(historyData.history);
      setActiveSymbol(qSymbol);
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
      const res = await fetch('/api/invest/buy', {
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
      const res = await fetch('/api/invest/sell', {
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
    // Note: since we are not fetching real-time prices for everything on load due to rate limits,
    // we show the purchase value or approximate current value based on the latest searched quote if matched.
    return user.portfolio.reduce((acc, item) => acc + (item.shares * item.averagePrice), 0);
  };

  return (
    <main className="container pb-12">
      <div className="section-header mb-8 mt-4">
        <h1 className="text-3xl font-bold font-mono tracking-tight text-primary">PORTFOLIO.SYS</h1>
        <p className="text-muted-foreground mt-2">Trade equities using your predictive credits.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Search & Trade */}
        <div className="col-span-1 space-y-6">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Market Data</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Ticker (e.g. AAPL)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={loadingSearch}>
                {loadingSearch ? '...' : 'FIND'}
              </button>
            </form>

            {quote && (
              <div className="mt-6 p-4 rounded-lg bg-secondary/20 border border-border">
                <div className="flex justify-between items-center border-b border-border pb-3 mb-3">
                  <div>
                    <h3 className="text-2xl font-bold">{quote.symbol}</h3>
                    <p className="text-sm text-muted-foreground">Price</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-mono">${quote.price.toFixed(2)}</p>
                    <p className={`text-sm ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {quote.change > 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent})
                    </p>
                  </div>
                </div>
                
                {user ? (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Buy Amount (Credits)</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          className="input flex-1" 
                          placeholder="Amount" 
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value)}
                        />
                        <button className="btn btn-primary" onClick={handleBuy} disabled={loadingTrade}>BUY</button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-muted-foreground mb-1">Sell Shares</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          className="input flex-1" 
                          placeholder="Shares" 
                          value={sellShares}
                          onChange={(e) => setSellShares(e.target.value)}
                        />
                        <button className="btn btn-outline" onClick={handleSell} disabled={loadingTrade}>SELL</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-center text-muted-foreground mt-4">Log in to trade</p>
                )}
              </div>
            )}
          </div>

          <div className="card">
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
                
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">Holdings</h3>
                  {user.portfolio.map(item => (
                    <div key={item.symbol} className="flex justify-between items-center py-2 border-b border-border/50 hover:bg-secondary/10 px-2 rounded-md transition-colors cursor-pointer" onClick={() => { setSymbol(item.symbol); handleSearch({ preventDefault: () => {} } as any); }}>
                      <div>
                        <div className="font-bold">{item.symbol}</div>
                        <div className="text-xs text-muted-foreground">Avg: ${item.averagePrice.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{item.shares.toFixed(4)} sh</div>
                        <div className="text-xs text-muted-foreground">${(item.shares * item.averagePrice).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No assets in portfolio. Start buying to build your wealth.</p>
            )}
          </div>
        </div>

        {/* Right Column: Chart */}
        <div className="col-span-1 lg:col-span-2">
          <div className="card h-full min-h-[500px] flex flex-col">
            <h2 className="text-xl font-semibold mb-6">Price History {activeSymbol ? `- ${activeSymbol}` : ''}</h2>
            {history.length > 0 ? (
              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={history} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#888" 
                      tick={{ fill: '#888', fontSize: 12 }} 
                      tickFormatter={(val) => val.split('-').slice(1).join('/')}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      stroke="#888" 
                      tick={{ fill: '#888', fontSize: 12 }}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="var(--primary, #00f0ff)" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
                {loadingSearch ? 'Loading chart data...' : 'Search a ticker to view technicals'}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}