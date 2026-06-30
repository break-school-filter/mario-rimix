/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { TileType, LevelData, EntityType } from '../types';
import { Eraser, Play, RefreshCw, Save, Copy, FileCode, Check } from 'lucide-react';

interface LevelEditorProps {
  onPlayTest: (customLevel: LevelData) => void;
  onClose: () => void;
}

const ROWS = 15;
const COLS = 60; // perfect width for creative custom stages

// Brush options
const brushes = [
  { id: 'eraser', label: '消しゴム', value: TileType.EMPTY, color: 'bg-slate-700 border-slate-600 text-slate-400' },
  { id: 'ground', label: '地面', value: TileType.GROUND, color: 'bg-green-700 text-white' },
  { id: 'brick', label: 'レンガ', value: TileType.BRICK, color: 'bg-orange-700 text-white' },
  { id: 'mystery_coin', label: 'ハテナ(コイン)', value: TileType.MYSTERY_COIN, color: 'bg-yellow-500 text-black' },
  { id: 'mystery_mush', label: 'ハテナ(きのこ)', value: TileType.MYSTERY_MUSHROOM, color: 'bg-red-500 text-white' },
  { id: 'mystery_flower', label: 'ハテナ(フラワー)', value: TileType.MYSTERY_FLOWER, color: 'bg-emerald-500 text-white' },
  { id: 'solid', label: 'ブロック', value: TileType.SOLID_BLOCK, color: 'bg-amber-600 text-white' },
  { id: 'pipe_tl', label: '土管左上', value: TileType.PIPE_TL, color: 'bg-lime-600 text-white text-xs' },
  { id: 'pipe_tr', label: '土管右上', value: TileType.PIPE_TR, color: 'bg-lime-600 text-white text-xs' },
  { id: 'pipe_l', label: '土管左下', value: TileType.PIPE_L, color: 'bg-lime-700 text-white text-xs' },
  { id: 'pipe_r', label: '土管右下', value: TileType.PIPE_R, color: 'bg-lime-700 text-white text-xs' },
  { id: 'castle_brick', label: '城カベ', value: TileType.CASTLE_BRICK, color: 'bg-slate-500 text-white' },
  { id: 'castle_door', label: '城の扉', value: TileType.CASTLE_DOOR, color: 'bg-amber-800 text-white' },
  { id: 'spikes', label: 'トゲトラップ', value: TileType.SPIKES, color: 'bg-sky-400 text-slate-900' },
  { id: 'lava', label: '溶岩', value: TileType.LAVA, color: 'bg-rose-600 text-white' },
  { id: 'coin', label: 'コイン', value: TileType.COIN_STILL, color: 'bg-yellow-400 text-slate-950 font-bold' },
  { id: 'flagpole', label: 'ゴール旗', value: TileType.FLAGPOLE, color: 'bg-zinc-400 text-black' },
  { id: 'flag', label: '旗の頂点', value: TileType.FLAG, color: 'bg-red-600 text-white' },
];

const enemyBrushes = [
  { id: 'goomba', label: 'クリボー', type: 'goomba' as EntityType, color: 'bg-yellow-900 text-yellow-100 border border-yellow-700 font-bold' },
  { id: 'koopa', label: 'ノコノコ', type: 'koopa' as EntityType, color: 'bg-emerald-700 text-emerald-100 border border-emerald-500 font-bold' },
];

export default function LevelEditor({ onPlayTest, onClose }: LevelEditorProps) {
  // Load initial custom level from LocalStorage if available, otherwise flat ground
  const [theme, setTheme] = useState<'overworld' | 'underworld' | 'castle'>('overworld');
  const [scrollX, setScrollX] = useState(0);
  const [selectedBrush, setSelectedBrush] = useState<TileType | string>(TileType.GROUND); // can be TileType or string ('goomba'/'koopa')
  const [copied, setCopied] = useState(false);

  const initialGrid = () => {
    const saved = localStorage.getItem('mario_custom_grid_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallthrough
      }
    }
    // Create empty grid with default flat ground
    const g: TileType[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: TileType[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push(r >= 13 ? TileType.GROUND : TileType.EMPTY);
      }
      g.push(row);
    }
    return g;
  };

  const initialEntities = () => {
    const saved = localStorage.getItem('mario_custom_entities_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallthrough
      }
    }
    return [] as { type: EntityType; x: number; y: number }[];
  };

  const [grid, setGrid] = useState<TileType[][]>(initialGrid);
  const [entities, setEntities] = useState<{ type: EntityType; x: number; y: number }[]>(initialEntities);

  const handleCellClick = (r: number, c: number) => {
    const newGrid = grid.map(row => [...row]);
    let newEntities = [...entities];

    // Remove any existing enemy on this tile cell coordinate
    newEntities = newEntities.filter(ent => {
      const entC = Math.floor(ent.x / 32);
      const entR = Math.floor(ent.y / 32);
      return !(entC === c && entR === r);
    });

    if (typeof selectedBrush === 'number') {
      // It is a Tile brush
      newGrid[r][c] = selectedBrush;
    } else {
      // It is an Enemy spawner brush
      newGrid[r][c] = TileType.EMPTY; // clear tile
      newEntities.push({
        type: selectedBrush as EntityType,
        x: c * 32,
        y: r * 32,
      });
    }

    setGrid(newGrid);
    setEntities(newEntities);
  };

  const handleClear = () => {
    if (confirm('作ったステージを全リセットしますか？')) {
      const g = [];
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
          row.push(r >= 13 ? (theme === 'castle' ? TileType.CASTLE_BRICK : TileType.GROUND) : TileType.EMPTY);
        }
        g.push(row);
      }
      setGrid(g);
      setEntities([]);
    }
  };

  const handleSave = () => {
    localStorage.setItem('mario_custom_grid_v1', JSON.stringify(grid));
    localStorage.setItem('mario_custom_entities_v1', JSON.stringify(entities));
    alert('カスタムステージをブラウザに保存しました！');
  };

  const compileLevelData = (): LevelData => {
    let bColor = '#5c94fc';
    if (theme === 'underworld') bColor = '#0d0d1e';
    if (theme === 'castle') bColor = '#1b0303';

    return {
      id: 'custom_editor_level',
      name: 'カスタム・ステージ',
      theme,
      width: COLS,
      height: ROWS,
      grid,
      timeLimit: 240,
      initialEntities: entities,
      backgroundColor: bColor,
      musicType: theme,
    };
  };

  const handleTest = () => {
    const lvl = compileLevelData();
    onPlayTest(lvl);
  };

  const handleCopyJSON = () => {
    const data = compileLevelData();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get tile label color to render on editor grid cell
  const getCellColor = (tile: TileType, c: number, r: number) => {
    // Check if an enemy is parked here
    const enemy = entities.find(ent => {
      const entC = Math.floor(ent.x / 32);
      const entR = Math.floor(ent.y / 32);
      return entC === c && entR === r;
    });

    if (enemy) {
      return enemy.type === 'goomba' ? 'bg-yellow-900 border border-yellow-500' : 'bg-emerald-700 border border-emerald-400';
    }

    switch (tile) {
      case TileType.GROUND: return 'bg-amber-800 border-t-4 border-green-600';
      case TileType.BRICK: return 'bg-orange-600 border border-orange-800';
      case TileType.MYSTERY_COIN:
      case TileType.MYSTERY_MUSHROOM:
      case TileType.MYSTERY_FLOWER:
        return 'bg-yellow-400 border border-yellow-600 animate-pulse';
      case TileType.SOLID_BLOCK: return 'bg-yellow-600 border border-amber-800';
      case TileType.PIPE_TL: return 'bg-emerald-500 border-l border-t border-emerald-900';
      case TileType.PIPE_TR: return 'bg-emerald-500 border-r border-t border-emerald-900';
      case TileType.PIPE_L: return 'bg-emerald-600 border-l border-emerald-950';
      case TileType.PIPE_R: return 'bg-emerald-600 border-r border-emerald-950';
      case TileType.CASTLE_BRICK: return 'bg-slate-600 border border-slate-700';
      case TileType.CASTLE_DOOR: return 'bg-amber-900 border border-yellow-800';
      case TileType.SPIKES: return 'bg-slate-400 border-b-2 border-slate-600';
      case TileType.LAVA: return 'bg-rose-600 border-t-2 border-red-500 animate-pulse';
      case TileType.COIN_STILL: return 'bg-yellow-300 rounded-full border border-yellow-500';
      case TileType.FLAGPOLE: return 'bg-slate-300';
      case TileType.FLAG: return 'bg-red-500';
      default: return 'bg-slate-900/50 hover:bg-slate-800 border border-slate-800/20';
    }
  };

  const getCellLabel = (tile: TileType, c: number, r: number) => {
    const enemy = entities.find(ent => {
      const entC = Math.floor(ent.x / 32);
      const entR = Math.floor(ent.y / 32);
      return entC === c && entR === r;
    });

    if (enemy) {
      return enemy.type === 'goomba' ? '栗' : '亀';
    }

    switch (tile) {
      case TileType.GROUND: return '';
      case TileType.BRICK: return '🧱';
      case TileType.MYSTERY_COIN:
      case TileType.MYSTERY_MUSHROOM:
      case TileType.MYSTERY_FLOWER:
        return '❓';
      case TileType.SOLID_BLOCK: return '◼️';
      case TileType.PIPE_TL: return '┌';
      case TileType.PIPE_TR: return '┐';
      case TileType.PIPE_L: return '├';
      case TileType.PIPE_R: return '┤';
      case TileType.CASTLE_BRICK: return '🏰';
      case TileType.CASTLE_DOOR: return '🚪';
      case TileType.SPIKES: return '▲';
      case TileType.LAVA: return '🔥';
      case TileType.COIN_STILL: return '🪙';
      case TileType.FLAGPOLE: return '│';
      case TileType.FLAG: return '🚩';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-2xl max-w-4xl w-full mx-auto" id="editor_panel">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-4" id="editor_header">
        <div>
          <h2 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
            <span className="text-yellow-400">🔨</span> カスタムステージ・エディター
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            好きな場所にブロックや敵を配置して、オリジナルのコースを作成できます。
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Theme Switcher */}
          <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 flex gap-1">
            {(['overworld', 'underworld', 'castle'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-2.5 py-1 rounded text-xs transition font-medium ${
                  theme === t ? 'bg-yellow-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'overworld' ? '草原' : t === 'underworld' ? '洞窟' : 'お城'}
              </button>
            ))}
          </div>

          <button
            onClick={handleClear}
            className="flex items-center gap-1 bg-red-950/40 text-red-400 border border-red-900/40 hover:bg-red-900/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw size={14} /> 全消し
          </button>
          
          <button
            onClick={handleSave}
            className="flex items-center gap-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 hover:bg-emerald-900/50 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            <Save size={14} /> 保存
          </button>

          <button
            onClick={handleCopyJSON}
            className="flex items-center gap-1 bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />} 
            {copied ? 'コピー済' : 'JSON出力'}
          </button>

          <button
            onClick={handleTest}
            className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-md shadow-yellow-500/10 cursor-pointer"
          >
            <Play size={14} fill="currentColor" /> テストプレイ開始！
          </button>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="relative overflow-x-auto border border-slate-800 bg-slate-900/80 rounded-xl p-4 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs text-slate-500 font-mono">コーススクロール (全60マス):</span>
          <span className="text-xs text-yellow-500 font-mono font-bold">画面：{Math.floor(scrollX / 15) + 1} / 4</span>
        </div>

        {/* Tile Matrix Grid view */}
        <div className="grid grid-rows-15 gap-[2px] select-none" style={{ minWidth: '1200px' }}>
          {Array.from({ length: ROWS }).map((_, r) => (
            <div key={r} className="flex gap-[2px]">
              {Array.from({ length: COLS }).map((_, c) => {
                const isSelectedCol = c >= scrollX && c < scrollX + 22; // emphasize edit zone
                return (
                  <div
                    key={c}
                    onClick={() => handleCellClick(r, c)}
                    className={`w-[20px] h-[20px] flex items-center justify-center text-[10px] cursor-pointer rounded-sm transition-all duration-100 ${
                      isSelectedCol ? 'opacity-100' : 'opacity-40'
                    } ${getCellColor(grid[r][c], c, r)}`}
                    title={`マス: (${c}, ${r})`}
                  >
                    {getCellLabel(grid[r][c], c, r)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Scroll Bar slider */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">← 左側</span>
          <input
            type="range"
            min={0}
            max={COLS - 20}
            value={scrollX}
            onChange={(e) => setScrollX(parseInt(e.target.value))}
            className="flex-1 accent-yellow-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
          />
          <span className="text-xs text-slate-400 font-medium">右側 →</span>
        </div>
      </div>

      {/* Selector Toolbox */}
      <div className="mt-5" id="editor_toolbox">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-sans">🖌️ パレットからアイテム・敵を選択：</h3>
        
        <div className="flex flex-col gap-4">
          {/* Blocks */}
          <div>
            <span className="text-[10px] text-slate-500 font-bold block mb-1.5">【ブロック・仕掛け】</span>
            <div className="flex flex-wrap gap-1.5">
              {brushes.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrush(b.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 border ${
                    selectedBrush === b.value
                      ? 'border-yellow-400 ring-2 ring-yellow-400/20 font-bold scale-105 shadow-md shadow-yellow-500/5'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                  } ${b.color}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enemies */}
          <div>
            <span className="text-[10px] text-slate-500 font-bold block mb-1.5">【モンスター】</span>
            <div className="flex flex-wrap gap-1.5">
              {enemyBrushes.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setSelectedBrush(e.type)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1 border ${
                    selectedBrush === e.type
                      ? 'border-yellow-400 ring-2 ring-yellow-400/20 font-bold scale-105 shadow-md shadow-yellow-500/5'
                      : 'border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                  } ${e.color}`}
                >
                  👿 {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
