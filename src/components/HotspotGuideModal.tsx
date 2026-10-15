import React, { useState } from 'react';
import { Wifi, Smartphone, QrCode, ShieldCheck, X, Zap, ArrowRight } from 'lucide-react';

interface HotspotGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  hostIp?: string;
}

export const HotspotGuideModal: React.FC<HotspotGuideModalProps> = ({
  isOpen,
  onClose,
  hostIp,
}) => {
  const [lang, setLang] = useState<'bn' | 'en'>('bn');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Wifi size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-100 uppercase tracking-wide">
                {lang === 'bn' ? 'হটস্পট দিয়ে খেলার নিয়ম (কোনো ইন্টারনেট লাগবে না!)' : 'Local Hotspot Play Guide (No Internet Required!)'}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'মিনি মিলিশিয়ার মতো লোকাল ওয়াইফাই বা হটস্পট দিয়ে যুদ্ধ করুন' : 'Connect multiple devices over local Wi-Fi / Hotspot'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs font-bold">
              <button
                onClick={() => setLang('bn')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  lang === 'bn' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  lang === 'en' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[65vh] flex flex-col gap-5 text-sm">
          {lang === 'bn' ? (
            <>
              {/* Bengali Instructions */}
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-300">১০০% ফ্রি ও অফলাইন যুদ্ধ</h4>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    আপনার মোবাইলের কোনো ডাটা বা এমবি (MB) খরচ হবে না! একদম মিনি মিলিশিয়া গেমের মতো লোকাল ওয়াইফাই দিয়েই মাল্টিপ্লেয়ার খেলা যায়।
                  </p>
                </div>
              </div>

              {/* Step 1 */}
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono font-black flex items-center justify-center shrink-0">
                  ১
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <Smartphone size={16} className="text-cyan-400" />
                    একটি মোবাইলে হটস্পট চালু করুন (Host)
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    যেকোনো একজনের মোবাইলের <strong>Mobile Hotspot</strong> অন করুন (মোবাইল ডাটা অন করার প্রয়োজন নেই)।
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono font-black flex items-center justify-center shrink-0">
                  ২
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <Wifi size={16} className="text-cyan-400" />
                    অন্যান্য বন্ধুরা হটস্পটের সাথে যুক্ত হবেন
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    বাকি বন্ধুদের মোবাইল থেকে ওয়াইফাই (Wi-Fi) অন করে ওই হটস্পট নেটওয়ার্কটিতে কানেক্ট করুন।
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono font-black flex items-center justify-center shrink-0">
                  ৩
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <QrCode size={16} className="text-cyan-400" />
                    QR কোড স্ক্যান বা হোস্ট আইপি দিয়ে জয়েন
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    যে হোস্ট হয়েছে সে <strong>"Host Match"</strong> এ ক্লিক করলে স্ক্রিনে একটি QR কোড এবং আইপি অ্যাড্রেস দেখাবে (যেমন: <code>{hostIp || '192.168.43.1:3000'}</code>)। বন্ধুরা শুধু ক্যামেরা দিয়ে QR স্ক্যান করলেই সরাসরি গেমে ঢুকে পড়বে!
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* English Instructions */}
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck size={24} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-300">100% Free & Local LAN Warfare</h4>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Zero cellular data required! Play high-speed multiplayer over your smartphone's Wi-Fi hotspot, exactly like Doodle Army 2: Mini Militia.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono font-black flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <Smartphone size={16} className="text-cyan-400" />
                    Turn on Mobile Hotspot (Host Device)
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    One player turns on their smartphone's <strong>Wi-Fi Hotspot</strong> (No active internet or mobile data required).
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono font-black flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <Wifi size={16} className="text-cyan-400" />
                    Friends Connect to the Hotspot Wi-Fi
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    All other players turn on Wi-Fi and connect to the host's hotspot network.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-mono font-black flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 flex items-center gap-2">
                    <QrCode size={16} className="text-cyan-400" />
                    Scan QR Code or Enter Host Address
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    The host clicks <strong>"Host Match"</strong>. The host screen displays an instant QR code and local address (e.g., <code>{hostIp || '192.168.43.1:3000'}</code>). Friends scan the QR code with their mobile cameras to join instantly!
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Quick Tip Pill */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-amber-400">
              <Zap size={16} />
              <span>Alone right now? Try Practice Mode with smart combat bots!</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-cyan-950/50 flex items-center gap-2"
          >
            <span>{lang === 'bn' ? 'বুঝতে পেরেছি' : 'Got It, Let\'s Fight'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
