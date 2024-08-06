"use client";

import { useEffect, useRef } from "react";
import { initShaders } from "../utils/shaderUtils";

const ShaderCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      initShaders(canvasRef.current);
    }
  }, []);

  return <canvas ref={canvasRef} className="w-full h-screen" />;
};

export default ShaderCanvas;
