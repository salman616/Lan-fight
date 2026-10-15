import React, { useRef, useEffect, useState } from 'react';
import { Bomb, RotateCw, Swords, Crosshair } from 'lucide-react';

interface TouchControlsProps {
  onMove: (dx: number, dy: number, isBoosting: boolean, isCrouching: boolean) => void;
  onAim: (angle: number, isFiring: boolean) => void;
  onThrowGrenade: () => void;
  onMelee: () => void;
  onReload: () => void;
  onSwitchWeapon: () => void;
  currentWeapon: string;
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  grenadeCount: number;
  boost: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMove,
  onAim,
  onThrowGrenade,
  onMelee,
  onReload,
  onSwitchWeapon,
  currentWeapon,
  ammo,
  maxAmmo,
  isReloading,
  grenadeCount,
  boost,
}) => {
  const leftStickRef = useRef<HTMLDivElement>(null);
  const rightStickRef = useRef<HTMLDivElement>(null);

  const [leftThumb, setLeftThumb] = useState({ x: 0, y: 0 });
  const [rightThumb, setRightThumb] = useState({ x: 0, y: 0 });
  const [isAiming, setIsAiming] = useState(false);

  // Left joystick touch handling (Movement & Jetpack)
  useEffect(() => {
    const stick = leftStickRef.current;
    if (!stick) return;

    let touchId: number | null = null;
    let centerX = 0;
    let centerY = 0;
    const maxRadius = 45;

    const handleTouchStart = (e: TouchEvent) => {
      if (touchId !== null) return;
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      const rect = stick.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      updateLeftStick(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          updateLeftStick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          touchId = null;
          setLeftThumb({ x: 0, y: 0 });
          onMove(0, 0, false, false);
          break;
        }
      }
    };

    const updateLeftStick = (tx: number, ty: number) => {
      let dx = tx - centerX;
      let dy = ty - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }

      setLeftThumb({ x: dx, y: dy });

      // Normalized outputs
      const normX = dx / maxRadius;
      const normY = dy / maxRadius;
      const isBoosting = normY < -0.3;
      const isCrouching = normY > 0.45;

      onMove(normX, normY, isBoosting, isCrouching);
    };

    stick.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      stick.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onMove]);

  // Right joystick touch handling (360 Aim & Fire)
  useEffect(() => {
    const stick = rightStickRef.current;
    if (!stick) return;

    let touchId: number | null = null;
    let centerX = 0;
    let centerY = 0;
    const maxRadius = 45;

    const handleTouchStart = (e: TouchEvent) => {
      if (touchId !== null) return;
      const touch = e.changedTouches[0];
      touchId = touch.identifier;
      const rect = stick.getBoundingClientRect();
      centerX = rect.left + rect.width / 2;
      centerY = rect.top + rect.height / 2;
      setIsAiming(true);
      updateRightStick(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          updateRightStick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchId) {
          touchId = null;
          setRightThumb({ x: 0, y: 0 });
          setIsAiming(false);
          onAim(0, false);
          break;
        }
      }
    };

    const updateRightStick = (tx: number, ty: number) => {
      let dx = tx - centerX;
      let dy = ty - centerY;
      const dist = Math.hypot(dx, dy);

      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }

      setRightThumb({ x: dx, y: dy });

      if (dist > 8) {
        const angle = Math.atan2(dy, dx);
        onAim(angle, true);
      }
    };

    stick.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      stick.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onAim]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 overflow-hidden">
      {/* Left movement & jetpack stick */}
      <div className="absolute bottom-6 left-6 pointer-events-auto flex flex-col items-center">
        <div className="text-[10px] font-mono text-cyan-400/80 mb-1 tracking-wider uppercase flex items-center gap-1">
          <span>Fly / Move</span>
          {boost < 20 && <span className="text-red-400 font-bold">LOW FUEL</span>}
        </div>
        <div
          ref={leftStickRef}
          className="relative w-28 h-28 rounded-full border-2 border-cyan-500/40 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center touch-none shadow-lg shadow-cyan-950/40"
        >
          {/* Inner ring & thruster marker */}
          <div className="absolute top-2 w-6 h-1 rounded bg-amber-400/60" />
          <div className="w-10 h-10 rounded-full border border-dashed border-cyan-400/30" />
          {/* Joystick thumb */}
          <div
            className="absolute w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 shadow-md shadow-cyan-500/50 flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translate(${leftThumb.x}px, ${leftThumb.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* Right Action Buttons Cluster */}
      <div className="absolute bottom-28 right-6 pointer-events-auto flex items-center gap-3">
        {/* Grenade Button */}
        <button
          onClick={onThrowGrenade}
          disabled={grenadeCount <= 0}
          className="relative w-14 h-14 rounded-full bg-slate-900/80 border-2 border-emerald-500/60 text-emerald-400 active:scale-90 flex flex-col items-center justify-center shadow-lg transition-transform"
        >
          <Bomb size={22} />
          <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full">
            {grenadeCount}
          </span>
          <span className="text-[8px] font-mono font-bold mt-0.5">BOMB</span>
        </button>

        {/* Melee Punch / Knife Button */}
        <button
          onClick={onMelee}
          className="w-14 h-14 rounded-full bg-slate-900/80 border-2 border-amber-500/60 text-amber-400 active:scale-90 flex flex-col items-center justify-center shadow-lg transition-transform"
        >
          <Swords size={22} />
          <span className="text-[8px] font-mono font-bold mt-0.5">MELEE</span>
        </button>

        {/* Reload Button */}
        <button
          onClick={onReload}
          disabled={isReloading || ammo === maxAmmo}
          className="w-14 h-14 rounded-full bg-slate-900/80 border-2 border-sky-500/60 text-sky-400 active:scale-90 flex flex-col items-center justify-center shadow-lg transition-transform disabled:opacity-40"
        >
          <RotateCw size={20} className={isReloading ? 'animate-spin' : ''} />
          <span className="text-[8px] font-mono font-bold mt-0.5">{isReloading ? '...' : 'RELOAD'}</span>
        </button>
      </div>

      {/* Right Aim & Fire Stick */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex flex-col items-center">
        <div className="text-[10px] font-mono text-rose-400/80 mb-1 tracking-wider uppercase flex items-center gap-1">
          <Crosshair size={12} />
          <span>360° Aim & Fire</span>
        </div>
        <div
          ref={rightStickRef}
          className="relative w-28 h-28 rounded-full border-2 border-rose-500/40 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center touch-none shadow-lg shadow-rose-950/40"
        >
          <div className="w-10 h-10 rounded-full border border-dashed border-rose-400/30" />
          {/* Aim Joystick thumb */}
          <div
            className={`absolute w-12 h-12 rounded-full shadow-md flex items-center justify-center transition-transform duration-75 ${
              isAiming
                ? 'bg-gradient-to-br from-rose-500 to-amber-500 shadow-rose-500/60 scale-110'
                : 'bg-gradient-to-br from-slate-700 to-slate-800'
            }`}
            style={{
              transform: `translate(${rightThumb.x}px, ${rightThumb.y}px)`,
            }}
          >
            <Crosshair size={18} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};
