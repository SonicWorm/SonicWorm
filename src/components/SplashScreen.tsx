import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setAnimationPhase(1), 500);
    const timer2 = setTimeout(() => setAnimationPhase(2), 1500);
    const timer3 = setTimeout(() => setAnimationPhase(3), 2500);
    const timer4 = setTimeout(() => onComplete(), 3500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div className="splash-screen">
      <div className="splash-content">
        {/* Animated Logo */}
        <div className={`logo-container ${animationPhase >= 1 ? 'animate-in' : ''}`}>
          <div className="logo-rings">
            <div className="ring ring-outer"></div>
            <div className="ring ring-middle"></div>
            <div className="ring ring-inner"></div>
          </div>
          
          <div className="worm-container">
            <div className="worm-segment head"></div>
            <div className="worm-segment body-1"></div>
            <div className="worm-segment body-2"></div>
            <div className="worm-segment body-3"></div>
            <div className="worm-segment body-4"></div>
            <div className="worm-segment tail"></div>
          </div>
        </div>

        {/* Animated Text */}
        <div className={`brand-text ${animationPhase >= 2 ? 'animate-in' : ''}`}>
          <h1 className="brand-title">SONICWORM</h1>
          <p className="brand-subtitle">GameFi Evolution</p>
        </div>

        {/* Loading Animation */}
        <div className={`loading-container ${animationPhase >= 3 ? 'animate-in' : ''}`}>
          <div className="loading-bar">
            <div className="loading-progress"></div>
          </div>
          <p className="loading-text">Initializing Game Engine...</p>
        </div>
      </div>

      <style>{`
        .splash-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #0a1a1a 0%, #1a2a3a 50%, #0a1a2a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          overflow: hidden;
        }

        .splash-content {
          text-align: center;
          position: relative;
        }

        .logo-container {
          position: relative;
          width: 200px;
          height: 200px;
          margin: 0 auto 40px;
          opacity: 0;
          transform: scale(0.5) rotate(-180deg);
          transition: all 1s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .logo-container.animate-in {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }

        .logo-rings {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .ring {
          position: absolute;
          border-radius: 50%;
          border: 2px solid #00ffcc;
          box-shadow: 0 0 20px rgba(0, 255, 204, 0.5);
        }

        .ring-outer {
          width: 180px;
          height: 180px;
          top: 10px;
          left: 10px;
          animation: rotate 8s linear infinite;
          opacity: 0.8;
        }

        .ring-middle {
          width: 150px;
          height: 150px;
          top: 25px;
          left: 25px;
          animation: rotate 6s linear infinite reverse;
          opacity: 0.6;
        }

        .ring-inner {
          width: 120px;
          height: 120px;
          top: 40px;
          left: 40px;
          background: rgba(10, 26, 26, 0.8);
          animation: rotate 4s linear infinite;
        }

        .worm-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .worm-segment {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(45deg, #00ffcc, #00ddaa);
          box-shadow: 0 0 15px rgba(0, 255, 204, 0.6);
          animation: pulse 2s ease-in-out infinite;
        }

        .head {
          width: 24px;
          height: 24px;
          top: -30px;
          left: -15px;
          animation-delay: 0s;
        }

        .head::after {
          content: '';
          position: absolute;
          width: 6px;
          height: 6px;
          background: #0a1a1a;
          border-radius: 50%;
          top: 6px;
          right: 6px;
        }

        .body-1 {
          width: 20px;
          height: 20px;
          top: -10px;
          left: -10px;
          animation-delay: 0.2s;
        }

        .body-2 {
          width: 18px;
          height: 18px;
          top: 10px;
          left: -5px;
          animation-delay: 0.4s;
        }

        .body-3 {
          width: 16px;
          height: 16px;
          top: 25px;
          left: 5px;
          animation-delay: 0.6s;
        }

        .body-4 {
          width: 14px;
          height: 14px;
          top: 35px;
          left: 15px;
          animation-delay: 0.8s;
        }

        .tail {
          width: 12px;
          height: 12px;
          top: 40px;
          left: 25px;
          animation-delay: 1s;
        }

        .brand-text {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }

        .brand-text.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        .brand-title {
          font-size: 3.5rem;
          font-weight: 900;
          background: linear-gradient(45deg, #00ffcc, #ffffff, #00ddaa);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          letter-spacing: 0.1em;
          text-shadow: 0 0 30px rgba(0, 255, 204, 0.5);
        }

        .brand-subtitle {
          font-size: 1.2rem;
          color: #00ddaa;
          margin: 10px 0 0 0;
          font-weight: 300;
          letter-spacing: 0.2em;
          opacity: 0.8;
        }

        .loading-container {
          margin-top: 60px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.6s ease-out;
        }

        .loading-container.animate-in {
          opacity: 1;
          transform: translateY(0);
        }

        .loading-bar {
          width: 300px;
          height: 4px;
          background: rgba(0, 255, 204, 0.2);
          border-radius: 2px;
          margin: 0 auto 15px;
          overflow: hidden;
        }

        .loading-progress {
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #00ffcc, #00ddaa);
          border-radius: 2px;
          animation: loading 2s ease-in-out infinite;
          box-shadow: 0 0 10px rgba(0, 255, 204, 0.8);
        }

        .loading-text {
          color: #00ddaa;
          font-size: 0.9rem;
          margin: 0;
          opacity: 0.7;
          animation: blink 1.5s ease-in-out infinite;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }

        @keyframes loading {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }

        @keyframes blink {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        @media (max-width: 768px) {
          .brand-title {
            font-size: 2.5rem;
          }
          
          .logo-container {
            width: 150px;
            height: 150px;
          }
          
          .loading-bar {
            width: 250px;
          }
        }
      `}</style>
    </div>
  );
};