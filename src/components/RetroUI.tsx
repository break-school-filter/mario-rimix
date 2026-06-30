/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameState, LevelData } from '../types';
import { Play, Volume2, VolumeX, HelpCircle, Gamepad2, ArrowLeft, RefreshCw, Sparkles, Sliders } from 'lucide-react';

interface RetroUIProps {
  score: number;
  coins: number;
  lives: number;
  timeLeft: number;
  currentLevel: LevelData;
  gameState: GameState;
  isMuted: boolean;
  onMuteToggle: () => void;
  onStartGame: (levelIndex: number) => void;
  onOpenEditor: () => void;
  onResetLevel: () => void;
  onBackToMenu: () => void;
  onMobileControlPress: (key: string, pressed: boolean) => void;
  children: React.ReactNode;
  isTimeAttackMode?: boolean;
  onToggleTimeAttack?: () => void;
  lastClearTime?: number;
  isNewRecord?: boolean;
}

export default function RetroUI({
  score,
  coins,
  lives,
  timeLeft,
  currentLevel,
  gameState,
  isMuted,
  onMuteToggle,
  onStartGame,
  onOpenEditor,
  onResetLevel,
  onBackToMenu,
  onMobileControlPress,
  children,
  isTimeAttackMode = false,
  onToggleTimeAttack,
  lastClearTime = 0,
  isNewRecord = false,
}: RetroUIProps) {
  const [crtMode, setCrtMode] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  // Helper to pad numbers just like classic arcade machines
  const padNum = (num: number, size: number) => {
    let s = num.toString();
    while (s.length < size) s = "0" + s;
    return s;
  };

  // Helper to get personal best time
  const getBestTimeStr = (levelId: string) => {
    const time = localStorage.getItem(`bestTime_${levelId}`);
    if (time) {
      return parseFloat(time).toFixed(2) + '秒';
    }
    return '--.--秒';
  };

  return (
    <div className="min-h-screen bg-cyber-bg text-slate-100 flex flex-col items-center p-4 md:p-6 font-sans select-none relative overflow-x-hidden w-full" id="retro_container">
      
      {/* Visual background ambient details */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1a2e_0%,#0a0a12_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,243,255,0.08),transparent_40%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,0,255,0.06),transparent_40%)] pointer-events-none" />

      {/* Retro Header logo */}
      <div className="w-full max-w-lg md:max-w-2xl flex items-center justify-between mb-4 border-b border-cyber-border/30 pb-3 z-10" id="game_header">
        <div className="flex items-center gap-3">
          <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]">🎮</span>
          <div>
            <h1 className="text-xl font-bold tracking-widest font-sans text-white flex items-center gap-2">
              <span className="text-cyber-primary glow-cyan">RETRO RUNNER</span> 
              <span className="text-[10px] bg-cyber-secondary text-white px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider shadow-[0_0_10px_#ff00ff] animate-pulse">NEO</span>
            </h1>
            <p className="text-[10px] text-cyber-primary/70 font-mono tracking-widest mt-0.5 uppercase">Arcade interactive system</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute button */}
          <button
            onClick={onMuteToggle}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isMuted 
                ? 'bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-900/20' 
                : 'bg-cyber-glass border-cyber-border text-slate-400 hover:text-white hover:border-cyber-primary/40'
            }`}
            title={isMuted ? "ミュート解除" : "ミュート"}
            id="sound_toggle_btn"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          {/* CRT Filter toggle */}
          <button
            onClick={() => setCrtMode(!crtMode)}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              crtMode 
                ? 'bg-cyber-accent/10 border-cyber-accent/40 text-cyber-accent hover:bg-cyber-accent/20' 
                : 'bg-cyber-glass border-cyber-border text-slate-400 hover:text-white hover:border-cyber-primary/40'
            }`}
            title="CRTフィルター切替"
            id="crt_toggle_btn"
          >
            <Sliders size={16} />
          </button>

          {/* Help button */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 rounded-xl bg-cyber-glass border border-cyber-border text-slate-400 hover:text-white hover:border-cyber-primary/40 hover:bg-cyber-glass/80 transition cursor-pointer"
            id="help_btn"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      {/* Main Console Cabinet Frame */}
      <div className="w-full max-w-lg md:max-w-2xl flex flex-col items-center bg-cyber-bg/80 border-2 border-cyber-border rounded-3xl p-4 md:p-6 shadow-[0_0_50px_rgba(0,243,255,0.15)] relative backdrop-blur-md z-10" id="arcade_cabinet">
        
        {/* Top Cabinet Badge */}
        <div className="w-44 h-5 bg-cyber-primary rounded-b-xl border-x border-b border-cyber-primary/50 absolute top-0 left-1/2 -translate-x-1/2 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.4)]">
          <span className="text-[8px] font-bold text-black tracking-widest font-mono">NEO CABINET SPEC</span>
        </div>

        {/* 8-bit STATS HUD (Always visible in-game, styled retro) */}
        {gameState === 'playing' && (
          <div className="w-full bg-cyber-glass px-5 py-3 rounded-2xl mb-4 border border-cyber-border/40 flex justify-between items-center text-[10px] md:text-xs font-mono font-bold text-yellow-500 tracking-wider shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md" id="arcade_hud">
            <div>
              <div className="text-cyber-primary uppercase text-[8px] mb-0.5 tracking-widest opacity-80 font-sans">PLAYER</div>
              <div className="text-white font-bold text-sm md:text-base glow-cyan">{padNum(score, 6)}</div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-cyber-primary uppercase text-[8px] mb-0.5 tracking-widest opacity-80 font-sans">COINS</div>
              <div className="text-cyber-accent font-bold text-sm md:text-base flex items-center gap-1 glow-gold">🪙 x{padNum(coins, 2)}</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-cyber-primary uppercase text-[8px] mb-0.5 tracking-widest opacity-80 font-sans">WORLD</div>
              <div className="text-white font-bold text-sm md:text-base glow-cyan">{currentLevel.id === 'custom_editor_level' ? 'EDIT' : currentLevel.name.split(' ')[0]}</div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-cyber-primary uppercase text-[8px] mb-0.5 tracking-widest opacity-80 font-sans">LIVES</div>
              <div className="text-cyber-secondary font-bold text-sm md:text-base glow-magenta">❤️ x{lives}</div>
            </div>

            <div className="flex flex-col items-end">
              <div className="text-cyber-primary uppercase text-[8px] mb-0.5 tracking-widest opacity-80 font-sans">{isTimeAttackMode ? 'TIME ATTACK' : 'TIME'}</div>
              <div className="text-white font-bold text-sm md:text-base glow-cyan font-mono" id="precise_timer">{isTimeAttackMode ? '0.00s' : timeLeft}</div>
            </div>
          </div>
        )}

        {/* Display screen (Contains canvas with conditional overlays) */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,243,255,0.1)] bg-black border border-cyber-border/20" id="tv_frame">
          
          {/* CRT scanlines effect overlay */}
          {crtMode && (
            <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-75 animate-flicker" />
          )}

          {/* CRT screen shadow curved edge reflection */}
          {crtMode && (
            <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_80px_rgba(0,0,0,0.7)] rounded-2xl" />
          )}

          {/* Inner game children (Canvas) */}
          {children}

          {/* GAME STATE MENUS AND PANEL OVERLAYS */}
          
          {/* 1. Title / Start Screen Menu */}
          {gameState === 'menu' && (
            <div className="absolute inset-0 bg-cyber-bg/95 flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in" id="menu_panel">
              {/* Retro cloud/scroller visual background */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#00f3ff]/5 to-[#ff00ff]/5 pointer-events-none" />

              <div className="mb-4 text-6xl md:text-7xl animate-float-slow filter drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]">🍄</div>
              <h1 className="text-3xl md:text-4xl font-black tracking-widest bg-gradient-to-r from-cyber-primary via-white to-cyber-secondary bg-clip-text text-transparent mb-1 font-sans">
                NEO RUNNER
              </h1>
              <p className="text-[10px] md:text-xs font-mono text-cyber-primary tracking-widest uppercase mb-6 glow-cyan">
                - CYBERPUNK PLATFORMING ADVENTURE -
              </p>

              {/* Time Attack Toggle Switch */}
              <div className="w-full max-w-sm glass-panel border border-cyber-border/40 p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-4 backdrop-blur-md flex items-center justify-between">
                <div className="flex flex-col text-left">
                  <span className="text-white text-xs font-bold flex items-center gap-1.5">
                    ⏱️ タイムアタックモード
                  </span>
                  <span className="text-[9px] text-cyber-primary/70 font-mono">0.00秒単位でステージクリアを目指す！</span>
                </div>
                <button
                  onClick={onToggleTimeAttack}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isTimeAttackMode ? 'bg-cyber-accent shadow-[0_0_10px_rgba(255,215,0,0.5)]' : 'bg-slate-800'}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isTimeAttackMode ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {/* Level select container */}
              <div className="w-full max-w-sm glass-panel border border-cyber-border/40 p-5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] mb-4 backdrop-blur-md">
                <span className="text-cyber-primary text-[10px] font-bold uppercase tracking-widest block mb-3 glow-cyan">挑戦するステージを選択</span>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onStartGame(0)}
                    className="w-full bg-cyber-bg/60 hover:bg-cyber-primary/10 border border-cyber-border hover:border-cyber-primary/60 py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition flex flex-col gap-1 items-start group cursor-pointer"
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>1-1. 草原の冒険 (草原)</span>
                      </span>
                      <span className="text-cyber-primary group-hover:translate-x-1 transition font-bold text-[10px] glow-cyan">PLAY ➔</span>
                    </div>
                    <div className="text-[9px] text-cyber-accent/80 font-mono flex items-center gap-1 mt-0.5">
                      ⏱️ ベストタイム: {getBestTimeStr('level_1')}
                    </div>
                  </button>
                  <button
                    onClick={() => onStartGame(1)}
                    className="w-full bg-cyber-bg/60 hover:bg-cyber-primary/10 border border-cyber-border hover:border-cyber-primary/60 py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition flex flex-col gap-1 items-start group cursor-pointer"
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                        <span>1-2. 地下の大洞窟 (洞窟/トゲ)</span>
                      </span>
                      <span className="text-cyber-primary group-hover:translate-x-1 transition font-bold text-[10px] glow-cyan">PLAY ➔</span>
                    </div>
                    <div className="text-[9px] text-cyber-accent/80 font-mono flex items-center gap-1 mt-0.5">
                      ⏱️ ベストタイム: {getBestTimeStr('level_2')}
                    </div>
                  </button>
                  <button
                    onClick={() => onStartGame(2)}
                    className="w-full bg-cyber-bg/60 hover:bg-cyber-primary/10 border border-cyber-border hover:border-cyber-primary/60 py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition flex flex-col gap-1 items-start group cursor-pointer"
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span>1-3. 魔王の溶岩城 (城/マグマ)</span>
                      </span>
                      <span className="text-cyber-secondary group-hover:translate-x-1 transition font-bold text-[10px] glow-magenta">PLAY ➔</span>
                    </div>
                    <div className="text-[9px] text-cyber-accent/80 font-mono flex items-center gap-1 mt-0.5">
                      ⏱️ ベストタイム: {getBestTimeStr('level_3')}
                    </div>
                  </button>
                </div>
              </div>

              {/* Editor mode trigger */}
              <div className="flex gap-2">
                <button
                  onClick={onOpenEditor}
                  className="bg-gradient-to-r from-cyber-accent to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                >
                  🔨 コースを自作する (エディター)
                </button>
              </div>

              <div className="text-[9px] text-cyber-primary/60 mt-6 font-mono tracking-wide leading-relaxed uppercase">
                KEYBOARD: MOVE [A/D / ARROWS] | JUMP [SPACE / W] | DASH / FIREBALL [SHIFT]
              </div>
            </div>
          )}

          {/* 2. Game Over Overlay Screen */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-cyber-bg/95 flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in" id="gameover_panel">
              <span className="text-5xl mb-4 filter drop-shadow-[0_0_10px_rgba(255,0,0,0.5)] animate-pulse">💀</span>
              <h2 className="text-3xl font-black text-cyber-secondary tracking-widest font-mono uppercase mb-2 glow-magenta">GAME OVER</h2>
              <p className="text-xs text-cyber-secondary/70 mb-6 font-mono tracking-widest uppercase">system failure: player destroyed</p>
              
              <div className="flex gap-3">
                <button
                  onClick={onResetLevel}
                  className="bg-cyber-glass hover:bg-cyber-primary/10 border border-cyber-border hover:border-cyber-primary/50 text-white font-bold px-5 py-3 rounded-xl text-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <RefreshCw size={14} className="animate-spin-slow" /> もう一度リトライ
                </button>
                <button
                  onClick={onBackToMenu}
                  className="bg-cyber-secondary hover:bg-magenta-500 text-white font-bold px-6 py-3 rounded-xl text-xs shadow-[0_0_15px_rgba(255,0,255,0.4)] transition cursor-pointer"
                >
                  タイトルメニューに戻る
                </button>
              </div>
            </div>
          )}

          {/* 3. Victory Clear Overlay Screen */}
          {gameState === 'victory' && (
            <div className="absolute inset-0 bg-cyber-bg/95 flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in" id="victory_panel">
              <div className="text-5xl mb-3 animate-bounce filter drop-shadow-[0_0_12px_rgba(0,243,255,0.6)]">🏆</div>
              <h2 className="text-2xl md:text-3xl font-black text-cyber-primary tracking-widest mb-2 font-mono glow-cyan uppercase">
                STAGE CLEAR!!
              </h2>
              <p className="text-[10px] md:text-xs text-cyber-primary/70 font-mono tracking-widest mb-6 uppercase">Mission accomplished successfully</p>

              {/* Score breakdown metrics card */}
              <div className="w-full max-w-sm glass-panel border border-cyber-border/40 p-5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] text-left text-xs mb-6 flex flex-col gap-2.5">
                <div className="flex justify-between items-center border-b border-cyber-border/30 pb-2">
                  <span className="text-cyber-primary/80 font-semibold font-sans">クリアステージ：</span>
                  <span className="text-white font-bold font-mono text-sm">{currentLevel.name}</span>
                </div>
                {isTimeAttackMode ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-cyber-primary/80 font-semibold font-sans">クリアタイム：</span>
                      <span className="text-cyber-accent font-bold font-mono text-base glow-gold">{lastClearTime.toFixed(2)} 秒</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyber-primary/80 font-semibold font-sans">自己ベスト：</span>
                      <span className="text-white font-bold font-mono text-sm">{getBestTimeStr(currentLevel.id)}</span>
                    </div>
                    {isNewRecord && (
                      <div className="text-center bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 mt-2 animate-pulse">
                        <span className="text-amber-400 font-extrabold text-sm tracking-widest glow-gold">👑 新記録達成 / NEW RECORD! 👑</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-cyber-primary/80 font-semibold font-sans">最終獲得スコア：</span>
                      <span className="text-cyber-accent font-bold font-mono text-base glow-gold">{padNum(score, 6)} PTS</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyber-primary/80 font-semibold font-sans">集めたコイン：</span>
                      <span className="text-white font-bold font-mono text-sm">🪙 x{coins}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyber-primary/80 font-semibold font-sans">タイムボーナス：</span>
                      <span className="text-emerald-400 font-bold font-mono text-sm">+{timeLeft * 10} PTS</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onBackToMenu}
                  className="bg-gradient-to-r from-cyber-primary to-cyan-500 hover:from-cyan-400 hover:to-cyber-primary text-black font-extrabold px-6 py-3 rounded-xl text-xs flex items-center gap-1.5 transition shadow-[0_0_20px_rgba(0,243,255,0.4)] hover:scale-105 active:scale-95"
                >
                  <Sparkles size={14} /> ステージ選択に戻る
                </button>
              </div>
            </div>
          )}

        </div>

        {/* ON-SCREEN MOBILE / TOUCH CONTROLLER */}
        {gameState === 'playing' && (
          <div className="w-full mt-4 flex justify-between items-center bg-cyber-glass p-4 rounded-2xl border border-cyber-border/40 backdrop-blur-md" id="touch_controls">
            
            {/* D-PAD (Left / Right Arrow Keys) */}
            <div className="flex gap-2">
              <button
                onMouseDown={() => onMobileControlPress('left', true)}
                onMouseUp={() => onMobileControlPress('left', false)}
                onMouseLeave={() => onMobileControlPress('left', false)}
                onTouchStart={(e) => { e.preventDefault(); onMobileControlPress('left', true); }}
                onTouchEnd={(e) => { e.preventDefault(); onMobileControlPress('left', false); }}
                className="w-14 h-14 bg-cyber-glass border border-cyber-border/60 hover:border-cyber-primary hover:text-white text-cyber-primary rounded-2xl flex items-center justify-center font-bold text-xl select-none transition-all box-glow-cyan cursor-pointer active:bg-cyber-primary active:text-black"
                id="touch_btn_left"
              >
                ◀
              </button>
              <button
                onMouseDown={() => onMobileControlPress('right', true)}
                onMouseUp={() => onMobileControlPress('right', false)}
                onMouseLeave={() => onMobileControlPress('right', false)}
                onTouchStart={(e) => { e.preventDefault(); onMobileControlPress('right', true); }}
                onTouchEnd={(e) => { e.preventDefault(); onMobileControlPress('right', false); }}
                className="w-14 h-14 bg-cyber-glass border border-cyber-border/60 hover:border-cyber-primary hover:text-white text-cyber-primary rounded-2xl flex items-center justify-center font-bold text-xl select-none transition-all box-glow-cyan cursor-pointer active:bg-cyber-primary active:text-black"
                id="touch_btn_right"
              >
                ▶
              </button>
            </div>

            {/* Middle selection controls (Back to Menu, restart) */}
            <div className="flex flex-col gap-1.5 text-center">
              <button
                onClick={onBackToMenu}
                className="flex items-center gap-1 bg-cyber-glass hover:bg-cyber-primary/10 border border-cyber-border/40 text-cyber-primary hover:text-white text-[10px] px-3 py-1.5 rounded-lg transition-all cursor-pointer glow-cyan"
              >
                <ArrowLeft size={10} /> メニューに戻る
              </button>
              <button
                onClick={onResetLevel}
                className="flex items-center gap-1 bg-cyber-glass hover:bg-cyber-primary/10 border border-cyber-border/40 text-cyber-primary hover:text-white text-[10px] px-3 py-1.5 rounded-lg transition-all cursor-pointer glow-cyan"
              >
                <RefreshCw size={10} /> やり直す
              </button>
            </div>

            {/* ACTION KEYS: A & B (A=Jump, B=Dash/Fireball) */}
            <div className="flex gap-2">
              <div className="flex flex-col items-center">
                <button
                  onMouseDown={() => onMobileControlPress('run', true)}
                  onMouseUp={() => onMobileControlPress('run', false)}
                  onMouseLeave={() => onMobileControlPress('run', false)}
                  onTouchStart={(e) => { e.preventDefault(); onMobileControlPress('run', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); onMobileControlPress('run', false); }}
                  className="w-12 h-12 bg-cyber-glass border border-cyber-border/60 active:bg-cyber-secondary active:text-white text-cyber-secondary font-mono rounded-full flex items-center justify-center font-black text-sm select-none transition-all box-glow-magenta cursor-pointer"
                  id="touch_btn_b"
                >
                  B
                </button>
                <span className="text-[8px] font-bold text-cyber-secondary uppercase tracking-widest mt-1 font-sans glow-magenta">ダッシュ/玉</span>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onMouseDown={() => onMobileControlPress('jump', true)}
                  onMouseUp={() => onMobileControlPress('jump', false)}
                  onMouseLeave={() => onMobileControlPress('jump', false)}
                  onTouchStart={(e) => { e.preventDefault(); onMobileControlPress('jump', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); onMobileControlPress('jump', false); }}
                  className="w-14 h-14 bg-cyber-glass border border-cyber-border/60 active:bg-cyber-primary active:text-black text-cyber-primary font-mono rounded-full flex items-center justify-center font-black text-lg select-none transition-all box-glow-cyan cursor-pointer"
                  id="touch_btn_a"
                >
                  A
                </button>
                <span className="text-[8px] font-bold text-cyber-primary uppercase tracking-widest mt-1 font-sans glow-cyan">ジャンプ</span>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* HOW TO PLAY / HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-md" id="help_modal">
          <div className="glass-panel border-2 border-cyber-border/60 p-6 rounded-2xl max-w-md w-full shadow-[0_0_40px_rgba(0,243,255,0.2)] relative">
            
            <h3 className="text-lg font-bold text-cyber-primary glow-cyan flex items-center gap-1.5 mb-4 font-sans">
              📘 あそびかたガイド
            </h3>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div>
                <span className="font-bold text-cyber-accent glow-gold">【ゲームの目的】</span>
                <p className="mt-1">
                  障害物や敵を避けながら、右端にある「ゴールポール」に飛びついて旗を降ろし、お城に入るとステージクリアです！
                </p>
              </div>

              <div>
                <span className="font-bold text-cyber-accent glow-gold">【パワーアップ】</span>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>🍄 <b className="text-white">きのこ：</b> プレイヤーが大きくなり、レンガを頭突きで破壊できるようになります。</li>
                  <li>🌸 <b className="text-white">フラワー：</b> 火の玉（ファイアボール）を投げて敵を倒せるようになります。</li>
                </ul>
              </div>

              <div>
                <span className="font-bold text-cyber-accent glow-gold">【キーボード操作】</span>
                <div className="grid grid-cols-2 gap-2 mt-1.5 bg-cyber-bg/80 border border-cyber-border/40 p-2.5 rounded-xl font-mono text-[10px]">
                  <div><b>左右移動:</b> A / D ｜ ◀ / ▶</div>
                  <div><b>ジャンプ:</b> W ｜ SPACE [長押し高]</div>
                  <div><b>ダッシュ/玉:</b> SHIFT</div>
                  <div><b>しゃがむ:</b> S ｜ ▼</div>
                </div>
              </div>

              <div>
                <span className="font-bold text-cyber-accent glow-gold">【ステージエディター】</span>
                <p className="mt-1">
                  タイトル画面からエディターを選択すると、自分だけのコースを作成・テストプレイできます。
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full bg-cyber-primary/20 hover:bg-cyber-primary/30 border border-cyber-primary/50 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer box-glow-cyan"
            >
              とじる
            </button>
          </div>
        </div>
      )}

      {/* Footer system details */}
      <div className="mt-6 text-[10px] text-cyber-primary/30 font-mono tracking-widest text-center uppercase" id="famicom_footer">
        © 2026 RETRO SPEC CORP | NEO-ARCADE SYSTEM V3
      </div>

    </div>
  );
}
