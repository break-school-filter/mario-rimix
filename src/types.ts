/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TileType {
  EMPTY = 0,
  GROUND = 1,
  BRICK = 2,
  MYSTERY_COIN = 3,
  MYSTERY_MUSHROOM = 4,
  MYSTERY_FLOWER = 5,
  PIPE_TL = 6, // Top Left of Pipe
  PIPE_TR = 7, // Top Right of Pipe
  PIPE_L = 8,  // Body Left of Pipe
  PIPE_R = 9,  // Body Right of Pipe
  SOLID_BLOCK = 10,
  FLAGPOLE = 11,
  FLAG = 12,
  CASTLE_BRICK = 13,
  CASTLE_DOOR = 14,
  SPIKES = 15,
  LAVA = 16,
  COIN_STILL = 17, // Floating coin in air
  EMPTY_MYSTERY = 18, // Used after hit
}

export type EntityType = 'goomba' | 'koopa' | 'mushroom' | 'flower' | 'fireball' | 'star' | 'yoshi';

export type PlayerForm = 'small' | 'super' | 'fire';

export type GameState = 'menu' | 'playing' | 'gameover' | 'victory' | 'editor';

export interface EntityState {
  id: string;
  type: EntityType;
  x: number; // in world coordinates
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  isDead: boolean;
  deadTimer: number; // for squash animations
  direction: 1 | -1;
  state?: string; // e.g. 'shell' for Koopa
  shellSpeed?: number;
  isSpawning?: boolean;
  spawnTargetY?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  rotation?: number;
  rotSpeed?: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

export interface LevelData {
  id: string;
  name: string;
  theme: 'overworld' | 'underworld' | 'castle';
  width: number; // grid columns
  height: number; // grid rows
  grid: TileType[][]; // Row major grid[y][x]
  timeLimit: number;
  initialEntities: { type: EntityType; x: number; y: number }[];
  backgroundColor: string;
  musicType: 'overworld' | 'underworld' | 'castle';
}
