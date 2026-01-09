"use client";

import { useRef } from "react";
import { Maximize2 } from "lucide-react";

export default function TradingViewWrapper() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFullscreen = async () => {
    if (!iframeRef.current) return;

    try {
      if (iframeRef.current.requestFullscreen) {
        await iframeRef.current.requestFullscreen();
      } else if ((iframeRef.current as any).webkitRequestFullscreen) {
        // Safari
        await (iframeRef.current as any).webkitRequestFullscreen();
      } else if ((iframeRef.current as any).mozRequestFullScreen) {
        // Firefox
        await (iframeRef.current as any).mozRequestFullScreen();
      } else if ((iframeRef.current as any).msRequestFullscreen) {
        // IE/Edge
        await (iframeRef.current as any).msRequestFullscreen();
      }
    } catch (error) {
      console.error("Error attempting to enable fullscreen:", error);
    }
  };

  return (
    <div className="w-full mt-6 relative">
      {/* Fullscreen Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleFullscreen}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
          aria-label="Enter fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
          Fullscreen
        </button>
      </div>

      {/* TradingView Chart */}
      <iframe
        id="tv-frame"
        ref={iframeRef}
        src="https://www.tradingview.com/widgetembed/?symbol=BTCUSD&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=1e1e1e&studies=&theme=dark&style=1&timezone=Etc/UTC&locale=en&withdateranges=1&range=1M&allow_symbol_change=1&details=1&calendar=1&hotlist=1&news=1"
        width="100%"
        height="800"
        style={{ border: 0, borderRadius: "12px" }}
        allowFullScreen={true}
      />
    </div>
  );
}

