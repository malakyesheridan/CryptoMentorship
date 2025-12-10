"use client";

export default function TradingViewWrapper() {
  return (
    <div className="w-full mt-6">
      <iframe 
        src="https://www.tradingview.com/chart/" 
        width="100%" 
        height="800" 
        style={{ border: 0, borderRadius: "12px" }} 
        allowFullScreen 
      />
    </div>
  );
}

