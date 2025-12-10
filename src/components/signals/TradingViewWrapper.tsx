"use client";

export default function TradingViewWrapper() {
  return (
    <div className="w-full mt-6">
      <iframe 
        src="https://www.tradingview.com/widgetembed/?symbol=BINANCE:BTCUSDT&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=1e1e1e&studies=&theme=dark&style=1&timezone=Etc/UTC&locale=en&withdateranges=1&range=1M&allow_symbol_change=1&details=1&calendar=1&hotlist=1&news=1" 
        width="100%" 
        height="800" 
        style={{ border: 0, borderRadius: "12px" }} 
        allowFullScreen={true}
      />
    </div>
  );
}

