/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { GameState, LevelData } from './types';
import { defaultLevels } from './data/defaultLevels';
import GameCanvas from './components/GameCanvas';
import LevelEditor from './components/LevelEditor';
import RetroUI from './components/RetroUI';

export default function App() {
  // Game states
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [activeLevel, setActiveLevel] = useState<LevelData>(defaultLevels[0]);

  // HUD and statistics state
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isMuted, setIsMuted] = useState(false);

  // Time Attack states
  const [isTimeAttackMode, setIsTimeAttackMode] = useState<boolean>(() => {
    return localStorage.getItem('isTimeAttackMode') === 'true';
  });
  const [lastClearTime, setLastClearTime] = useState<number>(0);
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // Keyboard controls mapped state
  const [inputControls, setInputControls] = useState({
    left: false,
    right: false,
    jump: false,
    run: false,
    up: false,
    down: false,
  });

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent standard browser scrolling when pressing arrow keys or space
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      setInputControls((prev) => {
        const next = { ...prev };
        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
            next.left = true;
            break;
          case 'ArrowRight':
          case 'KeyD':
            next.right = true;
            break;
          case 'ArrowUp':
          case 'KeyW':
          case 'Space':
            next.jump = true;
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
          case 'KeyZ':
          case 'KeyX':
            next.run = true;
            break;
          case 'ArrowDown':
          case 'KeyS':
            next.down = true;
            break;
        }
        return next;
      });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setInputControls((prev) => {
        const next = { ...prev };
        switch (e.code) {
          case 'ArrowLeft':
          case 'KeyA':
            next.left = false;
            break;
          case 'ArrowRight':
          case 'KeyD':
            next.right = false;
            break;
          case 'ArrowUp':
          case 'KeyW':
          case 'Space':
            next.jump = false;
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
          case 'KeyZ':
          case 'KeyX':
            next.run = false;
            break;
          case 'ArrowDown':
          case 'KeyS':
            next.down = false;
            break;
        }
        return next;
      });
    };

    const handleBlur = () => {
      // Reset all inputs if focus is lost to prevent sliding
      setInputControls({
        left: false,
        right: false,
        jump: false,
        run: false,
        up: false,
        down: false,
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // START GAME AT SELECT STAGE
  const handleStartGame = (levelIndex: number) => {
    setCurrentLevelIndex(levelIndex);
    setActiveLevel(defaultLevels[levelIndex]);
    setGameState('playing');
    setScore(0);
    setCoins(0);
    setLives(3);
  };

  // OPEN LEVEL EDITOR
  const handleOpenEditor = () => {
    setGameState('editor');
  };

  // PLAYTEST A DESIGNED LEVEL
  const handlePlayTestCustom = (customLevel: LevelData) => {
    setActiveLevel(customLevel);
    setGameState('playing');
    setScore(0);
    setCoins(0);
    setLives(3);
  };

  // RETRY LEVEL
  const handleResetLevel = () => {
    setGameState('playing');
  };

  // RETURNING TO MENU
  const handleBackToMenu = () => {
    setGameState('menu');
  };

  // TOUCH BUTTON HANDLER
  const handleMobileControlPress = (key: string, pressed: boolean) => {
    setInputControls((prev) => ({
      ...prev,
      [key]: pressed,
    }));
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2" id="app_root">
      {gameState === 'editor' ? (
        <div className="w-full py-8 animate-fade-in" id="editor_viewport">
          <LevelEditor
            onPlayTest={handlePlayTestCustom}
            onClose={handleBackToMenu}
          />
          <div className="mt-4 text-center">
            <button
              onClick={handleBackToMenu}
              className="text-xs text-slate-500 hover:text-white underline cursor-pointer"
            >
              ← メインメニューに戻る
            </button>
          </div>
        </div>
      ) : (
        <RetroUI
          score={score}
          coins={coins}
          lives={lives}
          timeLeft={timeLeft}
          currentLevel={activeLevel}
          gameState={gameState}
          isMuted={isMuted}
          onMuteToggle={handleMuteToggle}
          onStartGame={handleStartGame}
          onOpenEditor={handleOpenEditor}
          onResetLevel={handleResetLevel}
          onBackToMenu={handleBackToMenu}
          onMobileControlPress={handleMobileControlPress}
          isTimeAttackMode={isTimeAttackMode}
          onToggleTimeAttack={() => {
            const nextVal = !isTimeAttackMode;
            setIsTimeAttackMode(nextVal);
            localStorage.setItem('isTimeAttackMode', String(nextVal));
          }}
          lastClearTime={lastClearTime}
          isNewRecord={isNewRecord}
        >
          <GameCanvas
            level={activeLevel}
            gameState={gameState}
            isMuted={isMuted}
            onScoreChange={setScore}
            onCoinsChange={setCoins}
            onLifeChange={setLives}
            onTimeChange={setTimeLeft}
            onGameOver={() => setGameState('gameover')}
            onVictory={() => setGameState('victory')}
            isTimeAttackMode={isTimeAttackMode}
            onVictoryWithTime={(clearTime) => {
              setLastClearTime(clearTime);
              const bestKey = `bestTime_${activeLevel.id}`;
              const prevBestStr = localStorage.getItem(bestKey);
              if (!prevBestStr || clearTime < parseFloat(prevBestStr)) {
                localStorage.setItem(bestKey, clearTime.toString());
                setIsNewRecord(true);
              } else {
                setIsNewRecord(false);
              }
            }}
            inputControls={inputControls}
          />
        </RetroUI>
      )}
    </div>
  );
}
