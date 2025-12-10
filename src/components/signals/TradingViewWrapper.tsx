"use client";

import { useState } from "react";

export default function TradingViewWrapper() {
  const [symbol, setSymbol] = useState("BTCUSDT");

  const encodedSymbol = encodeURIComponent(`BINANCE:${symbol}`);

  return (
    <div className="w-full space-y-4 mt-6">
      
      {/* Coin Selector */}
      <div className="flex gap-2 flex-wrap">
        {["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "BNBUSDT"].map((coin) => (
          <button
            key={coin}
            onClick={() => setSymbol(coin)}
            className={`px-4 py-2 rounded text-sm transition ${
              symbol === coin
                ? "bg-white text-black"
                : "bg-neutral-800 text-white hover:bg-neutral-700"
            }`}
          >
            {coin.replace("USDT", "")}
          </button>
        ))}
      </div>

      {/* TradingView Chart */}
      <iframe
        key={symbol}
        src={`https://www.tradingview.com/widgetembed/?symbol=${encodedSymbol}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=0&toolbarbg=1e1e1e&studies=&theme=dark&style=1&timezone=Etc/UTC`}
        width="100%"
        height="500"
        style={{ border: 0 }}
        allowTransparency
        scrolling="no"
        allowFullScreen
      />
    </div>
  );
}

