/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { TileType, LevelData, EntityState, Particle, FloatingText, PlayerForm, GameState, EntityType } from '../types';
import { audio } from '../utils/audio';

interface GameCanvasProps {
  level: LevelData;
  gameState: GameState;
  isMuted: boolean;
  onScoreChange: (score: number) => void;
  onCoinsChange: (coins: number) => void;
  onLifeChange: (lives: number) => void;
  onTimeChange: (time: number) => void;
  onGameOver: () => void;
  onVictory: () => void;
  inputControls: {
    left: boolean;
    right: boolean;
    jump: boolean;
    run: boolean;
    up: boolean;
    down: boolean;
  };
  isTimeAttackMode?: boolean;
  onVictoryWithTime?: (time: number) => void;
}

const TILE_SIZE = 32;

export default function GameCanvas({
  level,
  gameState,
  isMuted,
  onScoreChange,
  onCoinsChange,
  onLifeChange,
  onTimeChange,
  onGameOver,
  onVictory,
  inputControls,
  isTimeAttackMode = false,
  onVictoryWithTime,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Physics & Game loop variables
  const stateRef = useRef({
    // Camera
    cameraX: 0,
    
    // Player Physics
    px: 64,
    py: 320,
    pvx: 0,
    pvy: 0,
    pWidth: 20,
    pHeight: 24,
    pForm: 'small' as PlayerForm,
    pGrounded: false,
    pFacing: 1 as 1 | -1,
    pInvulnerableTimer: 0,
    pIsDead: false,
    pDeathTimer: 0,
    pVictorySeq: false,
    pVictoryTimer: 0,
    pVictoryStep: 0, // 0 = slide, 1 = walk, 2 = vanish
    hasYoshi: false,
    yoshiFlutterTimer: 0,

    // Time Attack Mode Variables
    timeAttackElapsed: 0,
    timeAttackRunning: false,
    timeAttackStartTime: 0,

    // Map Grid copy (so we can break bricks or empty mysteries)
    grid: [] as TileType[][],
    levelWidth: 0,
    levelHeight: 0,
    
    // Bouncing tiles (when player hits block from below)
    bouncingTiles: [] as { x: number; y: number; originalType: TileType; offset: number; timer: number; dy: number }[],

    // Entities (items, enemies)
    entities: [] as EntityState[],
    
    // Particles
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    
    // Counters
    score: 0,
    coins: 0,
    lives: 3,
    timeLeft: 300,
    frameCounter: 0,
    screenShake: 0,
  });

  // Keep tracking input in ref for high performance inside loop
  const inputRef = useRef(inputControls);
  useEffect(() => {
    inputRef.current = inputControls;
  }, [inputControls]);

  // Handle Mute changes
  useEffect(() => {
    audio.setMute(isMuted);
  }, [isMuted]);

  // Restart / Initialise Level
  useEffect(() => {
    if (gameState === 'playing') {
      const state = stateRef.current;
      state.px = 64;
      state.py = 320;
      state.pvx = 0;
      state.pvy = 0;
      state.pForm = 'small';
      state.pHeight = 24;
      state.pWidth = 20;
      state.pGrounded = false;
      state.pFacing = 1;
      state.pInvulnerableTimer = 0;
      state.pIsDead = false;
      state.pDeathTimer = 0;
      state.pVictorySeq = false;
      state.pVictoryTimer = 0;
      state.pVictoryStep = 0;
      state.hasYoshi = false;
      state.yoshiFlutterTimer = 0;
      state.timeAttackElapsed = 0;
      state.timeAttackRunning = true;
      state.timeAttackStartTime = performance.now();
      state.cameraX = 0;
      state.timeLeft = level.timeLimit;
      state.bouncingTiles = [];
      state.particles = [];
      state.floatingTexts = [];
      state.screenShake = 0;

      // Deep copy level grid
      state.levelWidth = level.width;
      state.levelHeight = level.height;
      state.grid = level.grid.map(row => [...row]);

      // Copy initial entities
      state.entities = level.initialEntities.map((ent, idx) => {
        let vx = ent.type === 'goomba' ? -1 : -1.2;
        if (ent.type === 'yoshi') vx = 0;

        let width = 24;
        let height = 24;
        if (ent.type === 'koopa') height = 32;
        if (ent.type === 'yoshi') {
          width = 28;
          height = 28;
        }

        return {
          id: `ent_${idx}_${Date.now()}`,
          type: ent.type,
          x: ent.x,
          y: ent.y,
          vx,
          vy: 0,
          width,
          height,
          isGrounded: false,
          isDead: false,
          deadTimer: 0,
          direction: -1,
        };
      });

      onScoreChange(state.score);
      onCoinsChange(state.coins);
      onLifeChange(state.lives);
      onTimeChange(state.timeLeft);

      audio.init();
      audio.playBgm(level.musicType);
    } else {
      audio.stopBgm();
    }
  }, [level, gameState]);

  // Game Loop
  useEffect(() => {
    let animationId: number;
    
    // Timer countdown
    const timerInterval = setInterval(() => {
      if (gameState === 'playing' && !stateRef.current.pIsDead && !stateRef.current.pVictorySeq) {
        stateRef.current.timeLeft--;
        onTimeChange(stateRef.current.timeLeft);
        if (stateRef.current.timeLeft <= 0) {
          killPlayer();
        }
      }
    }, 1000);

    const update = () => {
      const state = stateRef.current;
      if (gameState !== 'playing') return;

      if (state.timeAttackRunning && !state.pIsDead && !state.pVictorySeq) {
        const now = performance.now();
        state.timeAttackElapsed = (now - state.timeAttackStartTime) / 1000;
        
        if (isTimeAttackMode) {
          const timerEl = document.getElementById('precise_timer');
          if (timerEl) {
            timerEl.textContent = state.timeAttackElapsed.toFixed(2) + 's';
          }
        }
      } else {
        state.timeAttackRunning = false;
      }

      state.frameCounter++;

      // Handle invulnerable timer
      if (state.pInvulnerableTimer > 0) {
        state.pInvulnerableTimer--;
      }

      // Decrement screen shake
      if (state.screenShake > 0) {
        state.screenShake -= 0.5;
      }

      if (state.pIsDead) {
        updatePlayerDeath();
        draw();
        animationId = requestAnimationFrame(update);
        return;
      }

      if (state.pVictorySeq) {
        updateVictorySequence();
        draw();
        animationId = requestAnimationFrame(update);
        return;
      }

      // Normal gameplay update
      updatePlayerPhysics();
      updateEntities();
      updateBouncingTiles();
      updateParticles();
      
      // Keep Camera smooth but bounded, allowing movement in both directions
      const targetCamX = Math.max(0, state.px - 250);
      state.cameraX = Math.max(0, Math.min(targetCamX, state.levelWidth * TILE_SIZE - 640));

      // Check boundary death
      if (state.py > state.levelHeight * TILE_SIZE + 64) {
        killPlayer();
      }

      draw();
      animationId = requestAnimationFrame(update);
    };

    // Trigger loop
    if (gameState === 'playing') {
      animationId = requestAnimationFrame(update);
    }

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(timerInterval);
    };
  }, [gameState]);

  // PHYSICS FUNCTIONS
  function updatePlayerPhysics() {
    const state = stateRef.current;
    const input = inputRef.current;

    // Set height based on form
    const expectedHeight = state.pForm === 'small' ? 24 : 44;
    if (state.pHeight !== expectedHeight) {
      state.py -= (expectedHeight - state.pHeight); // Adjust height offset gracefully
      state.pHeight = expectedHeight;
    }

    // Accelerations & Friction constants
    const accel = state.hasYoshi ? 0.35 : 0.25;
    const maxSpeed = state.hasYoshi ? (input.run ? 5.8 : 3.8) : (input.run ? 4.5 : 2.8);
    const friction = 0.82;
    const gravity = 0.42;
    const maxFallSpeed = 9;

    // Movement input
    if (input.left) {
      state.pvx -= accel;
      state.pFacing = -1;
    } else if (input.right) {
      state.pvx += accel;
      state.pFacing = 1;
    } else {
      // Normal drag
      state.pvx *= friction;
    }

    // Speed limits
    if (state.pvx > maxSpeed) state.pvx = maxSpeed;
    if (state.pvx < -maxSpeed) state.pvx = -maxSpeed;

    // Stop complete drift
    if (Math.abs(state.pvx) < 0.05) state.pvx = 0;

    // Apply Gravity
    state.pvy += gravity;
    if (state.pvy > maxFallSpeed) state.pvy = maxFallSpeed;

    // Flutter Jump / ふんばりジャンプ (Yoshi specific hover logic)
    if (state.hasYoshi) {
      if (state.pGrounded) {
        state.yoshiFlutterTimer = 0;
      } else {
        // If falling or near peak and holding jump, flutter!
        if (input.jump && state.pvy > -1.5 && state.yoshiFlutterTimer < 35) {
          state.yoshiFlutterTimer++;
          state.pvy = Math.min(state.pvy, 0.4); // clamp fall speed
          if (state.yoshiFlutterTimer % 4 === 0) {
            state.pvy = -1.5; // push up slightly
          }
          
          // Spawn little green/white sparkles under feet to visualize flutter
          if (state.frameCounter % 3 === 0) {
            state.particles.push({
              id: `part_flutter_${Date.now()}_${Math.random()}`,
              x: state.px + Math.random() * state.pWidth,
              y: state.py + state.pHeight,
              vx: (Math.random() - 0.5) * 1,
              vy: 1 + Math.random() * 1,
              color: '#32cd32', // lime green
              size: 4 + Math.random() * 3,
              alpha: 1,
              life: 0,
              maxLife: 20,
            });
          }
        }
      }
    }

    // Jump logic (higher jump when holding button, scales with running speed)
    if (input.jump && state.pGrounded) {
      const speedRatio = Math.min(1, Math.abs(state.pvx) / (state.hasYoshi ? 5.8 : 4.5));
      const jumpImpulse = state.hasYoshi ? -11.0 : -10.4;
      const jumpBoost = state.hasYoshi ? -1.8 : -1.4;
      state.pvy = jumpImpulse + (speedRatio * jumpBoost); // standing jump is -11.0 / -10.4, running jump can reach higher
      state.pGrounded = false;
      audio.playJump();
      // Add a couple of dust particles
      spawnDust(state.px + state.pWidth / 2, state.py + state.pHeight);
    } else if (!input.jump && state.pvy < -3.0) {
      // release jump early to cut height
      state.pvy = -3.0;
    }

    // Crouching logic (Super/Fire can shrink down visually)
    const isCrouching = input.down && state.pForm !== 'small' && state.pGrounded;
    if (isCrouching) {
      state.pHeight = 24; // Shrink bounding box
    }

    // Move player incrementally along X to handle clean tile collisions
    state.px += state.pvx;
    handleCollisionsX();

    // Move player along Y
    state.py += state.pvy;
    handleCollisionsY();

    // Prevent moving back past camera left edge
    if (state.px < state.cameraX) {
      state.px = state.cameraX;
      state.pvx = 0;
    }
  }

  function handleCollisionsX() {
    const state = stateRef.current;
    
    const startRow = Math.max(0, Math.floor(state.py / TILE_SIZE));
    const endRow = Math.min(state.levelHeight - 1, Math.floor((state.py + state.pHeight) / TILE_SIZE));
    const startCol = Math.max(0, Math.floor(state.px / TILE_SIZE));
    const endCol = Math.min(state.levelWidth - 1, Math.floor((state.px + state.pWidth) / TILE_SIZE));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = state.grid[r][c];
        if (isSolid(tile)) {
          // Collision on horizontal axis!
          if (state.pvx > 0) {
            // Moving Right: push back to left edge of tile
            state.px = c * TILE_SIZE - state.pWidth - 0.01;
            state.pvx = 0;
          } else if (state.pvx < 0) {
            // Moving Left: push to right edge of tile
            state.px = (c + 1) * TILE_SIZE + 0.01;
            state.pvx = 0;
          }
        }
      }
    }
  }

  function handleCollisionsY() {
    const state = stateRef.current;
    
    const startRow = Math.max(0, Math.floor(state.py / TILE_SIZE));
    const endRow = Math.min(state.levelHeight - 1, Math.floor((state.py + state.pHeight) / TILE_SIZE));
    const startCol = Math.max(0, Math.floor(state.px / TILE_SIZE));
    const endCol = Math.min(state.levelWidth - 1, Math.floor((state.px + state.pWidth) / TILE_SIZE));

    state.pGrounded = false;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const tile = state.grid[r][c];

        // Custom touch triggers (e.g. spikes, flagpoles)
        if (tile === TileType.FLAGPOLE || tile === TileType.FLAG) {
          triggerVictorySequence(c);
          return;
        }

        if (tile === TileType.SPIKES || tile === TileType.LAVA) {
          damagePlayer();
          return;
        }

        if (tile === TileType.COIN_STILL) {
          // Instantly grab floating coin
          state.grid[r][c] = TileType.EMPTY;
          collectCoin(c * TILE_SIZE + 8, r * TILE_SIZE + 8);
          continue;
        }

        if (tile === TileType.CASTLE_DOOR) {
          triggerVictorySequence(c);
          return;
        }

        if (isSolid(tile)) {
          if (state.pvy > 0) {
            // Falling Down: Land on top of tile
            state.py = r * TILE_SIZE - state.pHeight - 0.01;
            state.pvy = 0;
            state.pGrounded = true;
          } else if (state.pvy < 0) {
            // Rising Up: Bump bottom of tile
            state.py = (r + 1) * TILE_SIZE + 0.01;
            state.pvy = 0;
            
            // Trigger block action!
            bumpBlock(c, r);
          }
        }
      }
    }
  }

  function bumpBlock(c: number, r: number) {
    const state = stateRef.current;
    const tile = state.grid[r][c];

    // Check if block is already bouncing to avoid double hits
    const isAlreadyBouncing = state.bouncingTiles.some(b => b.x === c && b.y === r);
    if (isAlreadyBouncing) return;

    if (tile === TileType.BRICK) {
      if (state.pForm !== 'small') {
        // Break brick for Super forms!
        state.grid[r][c] = TileType.EMPTY;
        audio.playBreakBrick();
        state.screenShake = 3;
        state.score += 50;
        onScoreChange(state.score);
        
        // Spawn shattered brick particles!
        spawnBrickParticles(c * TILE_SIZE + 16, r * TILE_SIZE + 16);
      } else {
        // Just small bounce
        addBouncingTile(c, r, tile);
        audio.playStomp(); // standard bump sound
      }
    } else if (
      tile === TileType.MYSTERY_COIN ||
      tile === TileType.MYSTERY_MUSHROOM ||
      tile === TileType.MYSTERY_FLOWER
    ) {
      // Spawn items/coins
      addBouncingTile(c, r, tile);
      state.grid[r][c] = TileType.EMPTY_MYSTERY; // turn into static hit block
      
      if (tile === TileType.MYSTERY_COIN) {
        collectCoin(c * TILE_SIZE + 8, r * TILE_SIZE + 8, true);
      } else if (tile === TileType.MYSTERY_MUSHROOM) {
        spawnEntity('mushroom', c * TILE_SIZE + 4, r * TILE_SIZE);
      } else if (tile === TileType.MYSTERY_FLOWER) {
        // Flower behaves depending on form: if small spawns mushroom, otherwise flower
        const spawnType = state.pForm === 'small' ? 'mushroom' : 'flower';
        spawnEntity(spawnType, c * TILE_SIZE + 4, r * TILE_SIZE);
      }
    }
  }

  function addBouncingTile(c: number, r: number, type: TileType) {
    stateRef.current.bouncingTiles.push({
      x: c,
      y: r,
      originalType: type,
      offset: 0,
      timer: 0,
      dy: -3.5, // initial upward kick
    });
  }

  function updateBouncingTiles() {
    const state = stateRef.current;
    for (let i = state.bouncingTiles.length - 1; i >= 0; i--) {
      const b = state.bouncingTiles[i];
      b.timer++;
      b.offset += b.dy;
      b.dy += 0.55; // simple gravity

      if (b.offset >= 0) {
        // Bounce finished, snap back
        state.bouncingTiles.splice(i, 1);
      }
    }
  }

  // ENEMY & POWERUPS UPDATES
  function updateEntities() {
    const state = stateRef.current;
    
    for (let i = state.entities.length - 1; i >= 0; i--) {
      const ent = state.entities[i];

      if (ent.isDead) {
        ent.deadTimer++;
        if (ent.deadTimer > 30) {
          state.entities.splice(i, 1);
        }
        continue;
      }

      // De-spawn if off camera left too far
      if (ent.x < state.cameraX - 128) {
        state.entities.splice(i, 1);
        continue;
      }

      // If entity is spawning/rising from a block
      if (ent.isSpawning) {
        ent.y -= 0.8; // slowly rise up (1 pixel / frame looks classic and smooth)
        if (ent.y <= (ent.spawnTargetY || 0)) {
          ent.y = ent.spawnTargetY || 0;
          ent.isSpawning = false;
          if (ent.type === 'mushroom') {
            ent.vx = 1.4; // start sliding
          }
        }

        // Check player collection even while spawning
        const playerBounds = {
          x: state.px,
          y: state.py,
          width: state.pWidth,
          height: state.pHeight,
        };
        if (checkCollision(playerBounds, ent)) {
          state.entities.splice(i, 1);
          collectPowerup(ent.type as 'mushroom' | 'flower');
        }
        continue; // Skip normal movement/gravity/enemy collision while spawning
      }

      // Fireball custom updates
      if (ent.type === 'fireball') {
        ent.vy += 0.4; // heavy gravity
        ent.x += ent.vx;
        
        // Horizontal collision
        const tileX = Math.floor((ent.x + (ent.vx > 0 ? ent.width : 0)) / TILE_SIZE);
        const tileY = Math.floor((ent.y + ent.height / 2) / TILE_SIZE);
        if (isSolid(state.grid[tileY]?.[tileX])) {
          // Explode
          spawnExplosion(ent.x + ent.width / 2, ent.y + ent.height / 2);
          state.entities.splice(i, 1);
          continue;
        }

        ent.y += ent.vy;
        // Vertical collision
        const tileBottomY = Math.floor((ent.y + ent.height) / TILE_SIZE);
        const tileCol = Math.floor((ent.x + ent.width / 2) / TILE_SIZE);
        if (isSolid(state.grid[tileBottomY]?.[tileCol])) {
          // Bounce up!
          ent.y = tileBottomY * TILE_SIZE - ent.height - 0.1;
          ent.vy = -3.8;
        }

        // Hit enemies with fireball
        const hitEnemy = state.entities.find(other => 
          other.id !== ent.id && 
          !other.isDead && 
          ['goomba', 'koopa'].includes(other.type) &&
          checkCollision(ent, other)
        );

        if (hitEnemy) {
          // Explode fireball and defeat enemy in flip-over style!
          spawnExplosion(ent.x + ent.width / 2, ent.y + ent.height / 2);
          defeatEnemyFliped(hitEnemy);
          state.entities.splice(i, 1);
          continue;
        }

        // Boundary de-spawn
        if (ent.y > state.levelHeight * TILE_SIZE) {
          state.entities.splice(i, 1);
        }
        continue;
      }

      // General Entity Movement (Mushroom, flower, goomba, koopa)
      if (ent.type === 'flower') {
        // Flowers stay static, but they must be collectable by the player!
        const playerBounds = {
          x: state.px,
          y: state.py,
          width: state.pWidth,
          height: state.pHeight,
        };
        if (checkCollision(playerBounds, ent)) {
          state.entities.splice(i, 1);
          collectPowerup(ent.type);
        }
        continue;
      }

      // Yoshi custom movement behavior
      if (ent.type === 'yoshi') {
        // Apply simple gravity
        ent.vy += 0.35;
        if (ent.vy > 8) ent.vy = 8;

        // Yoshi occasionally hops gently on the spot to look alive
        if (ent.isGrounded && state.frameCounter % 120 === 0) {
          ent.vy = -3.5;
          ent.isGrounded = false;
        }

        // Apply Y movement and check vertical collision
        ent.y += ent.vy;
        let entRow = Math.floor((ent.y + ent.height) / TILE_SIZE);
        let startCol = Math.max(0, Math.floor(ent.x / TILE_SIZE));
        let endCol = Math.min(state.levelWidth - 1, Math.floor((ent.x + ent.width) / TILE_SIZE));
        let grounded = false;
        for (let c = startCol; c <= endCol; c++) {
          if (isSolid(state.grid[entRow]?.[c])) {
            grounded = true;
            break;
          }
        }
        if (grounded) {
          ent.y = entRow * TILE_SIZE - ent.height - 0.01;
          ent.vy = 0;
          ent.isGrounded = true;
        } else {
          ent.isGrounded = false;
        }

        // Check collision with Player
        const playerBounds = {
          x: state.px,
          y: state.py,
          width: state.pWidth,
          height: state.pHeight,
        };

        if (checkCollision(playerBounds, ent)) {
          // Mount Yoshi!
          state.entities.splice(i, 1);
          state.hasYoshi = true;
          state.yoshiFlutterTimer = 0;
          
          audio.playPowerupCollect(); // Play fun sound
          spawnFloatingText('YOSHI!', ent.x, ent.y - 16, '#32cd32'); // lime green
          
          // Spawn nice green/white sparkles
          for (let p = 0; p < 15; p++) {
            state.particles.push({
              id: `part_yoshi_${Date.now()}_${p}`,
              x: ent.x + ent.width / 2,
              y: ent.y + ent.height / 2,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4 - 2,
              color: p % 2 === 0 ? '#32cd32' : '#ffffff',
              size: 5 + Math.random() * 4,
              alpha: 1,
              life: 0,
              maxLife: 30 + Math.floor(Math.random() * 15),
            });
          }
        }
        continue; // Skip standard enemy/item path
      }

      // Apply simple gravity
      ent.vy += 0.35;
      if (ent.vy > 8) ent.vy = 8;

      // Move X
      ent.x += ent.vx;
      
      // X Collision
      let startRow = Math.max(0, Math.floor(ent.y / TILE_SIZE));
      let endRow = Math.min(state.levelHeight - 1, Math.floor((ent.y + ent.height) / TILE_SIZE));
      let entCol = Math.floor((ent.vx > 0 ? ent.x + ent.width : ent.x) / TILE_SIZE);

      let collidedX = false;
      for (let r = startRow; r <= endRow; r++) {
        if (isSolid(state.grid[r]?.[entCol])) {
          collidedX = true;
          break;
        }
      }

      if (collidedX) {
        ent.vx = -ent.vx; // Flip direction
        ent.direction = ent.vx > 0 ? 1 : -1;
        ent.x += ent.vx; // eject
      }

      // Move Y
      ent.y += ent.vy;
      
      // Y Collision
      let entRow = Math.floor((ent.y + ent.height) / TILE_SIZE);
      let startCol = Math.max(0, Math.floor(ent.x / TILE_SIZE));
      let endCol = Math.min(state.levelWidth - 1, Math.floor((ent.x + ent.width) / TILE_SIZE));

      let grounded = false;
      for (let c = startCol; c <= endCol; c++) {
        if (isSolid(state.grid[entRow]?.[c])) {
          grounded = true;
          break;
        }
      }

      if (grounded) {
        ent.y = entRow * TILE_SIZE - ent.height - 0.01;
        ent.vy = 0;
        ent.isGrounded = true;
      } else {
        ent.isGrounded = false;
      }

      // CHECK COLLISION WITH PLAYER
      const playerBounds = {
        x: state.px,
        y: state.py,
        width: state.pWidth,
        height: state.pHeight,
      };

      if (checkCollision(playerBounds, ent)) {
        if (['mushroom', 'flower'].includes(ent.type)) {
          // Player powerup!
          state.entities.splice(i, 1);
          collectPowerup(ent.type);
        } else {
          // Enemy collision! Goomba / Koopa
          const isFallingOnTop = state.pvy > 0 && (state.py + state.pHeight - state.pvy) <= ent.y + 8;
          
          if (isFallingOnTop && ent.state !== 'shell') {
            // Jump stomp!
            state.pvy = -5.5; // bounce player
            stompEnemy(ent);
          } else if (ent.type === 'koopa' && ent.state === 'shell' && ent.shellSpeed === 0) {
            // Kick static shell
            audio.playStomp();
            ent.shellSpeed = 6;
            ent.vx = state.px < ent.x ? 6 : -6;
            ent.direction = ent.vx > 0 ? 1 : -1;
            // Eject shell slightly to avoid double collision instantly
            ent.x += ent.vx * 1.5;
          } else {
            // Shell is moving, or regular walk: Player hurt
            damagePlayer();
          }
        }
      }

      // Shell kills other enemies
      if (ent.type === 'koopa' && ent.state === 'shell' && ent.shellSpeed && ent.shellSpeed > 0) {
        state.entities.forEach(other => {
          if (other.id !== ent.id && !other.isDead && ['goomba', 'koopa'].includes(other.type)) {
            if (checkCollision(ent, other)) {
              defeatEnemyFliped(other);
            }
          }
        });
      }
    }
  }

  function checkCollision(r1: { x: number; y: number; width: number; height: number }, r2: { x: number; y: number; width: number; height: number }) {
    return (
      r1.x < r2.x + r2.width &&
      r1.x + r1.width > r2.x &&
      r1.y < r2.y + r2.height &&
      r1.y + r1.height > r2.y
    );
  }

  function isSolid(tile: TileType | undefined) {
    if (!tile) return false;
    return [
      TileType.GROUND,
      TileType.BRICK,
      TileType.MYSTERY_COIN,
      TileType.MYSTERY_MUSHROOM,
      TileType.MYSTERY_FLOWER,
      TileType.PIPE_TL,
      TileType.PIPE_TR,
      TileType.PIPE_L,
      TileType.PIPE_R,
      TileType.SOLID_BLOCK,
      TileType.CASTLE_BRICK,
      TileType.EMPTY_MYSTERY,
    ].includes(tile);
  }

  // PLAYER INTERACTION ACTIONS
  function collectCoin(x: number, y: number, fromMystery = false) {
    const state = stateRef.current;
    state.coins++;
    state.score += 200;
    onCoinsChange(state.coins);
    onScoreChange(state.score);
    audio.playCoin();

    // Spawn shining coin visual particles
    spawnCoinSpark(x, y - (fromMystery ? 24 : 0));
    spawnFloatingText('+200', x, y, '#ffd700');
  }

  function spawnEntity(type: EntityType, x: number, y: number) {
    const state = stateRef.current;
    
    // Play sound of powerup appearing
    audio.playPowerupAppears();

    const isPowerup = type === 'mushroom' || type === 'flower';

    state.entities.push({
      id: `ent_${Date.now()}_${Math.random()}`,
      type,
      x,
      y: isPowerup ? y + 8 : y - 4, // start inside block if powerup, else raise slightly
      vx: 0, // no movement while spawning
      vy: 0, // no gravity physics while spawning
      width: 24,
      height: 24,
      isGrounded: false,
      isDead: false,
      deadTimer: 0,
      direction: 1,
      isSpawning: isPowerup,
      spawnTargetY: isPowerup ? y - 24 : undefined,
    });
  }

  function collectPowerup(type: 'mushroom' | 'flower') {
    const state = stateRef.current;
    audio.playPowerupCollect();
    state.screenShake = 2;

    if (type === 'mushroom') {
      if (state.pForm === 'small') {
        state.pForm = 'super';
        spawnFloatingText('SUPER!', state.px, state.py, '#ff4500');
      } else {
        state.score += 1000;
        spawnFloatingText('+1000', state.px, state.py, '#fff');
      }
    } else if (type === 'flower') {
      state.pForm = 'fire';
      spawnFloatingText('FIREPOWER!', state.px, state.py, '#ff4500');
    }

    state.score += 1000;
    onScoreChange(state.score);
  }

  function stompEnemy(ent: EntityState) {
    audio.playStomp();
    ent.isDead = true;
    ent.vx = 0;
    ent.vy = 0;
    ent.deadTimer = 0;

    const state = stateRef.current;
    state.score += 100;
    onScoreChange(state.score);
    spawnFloatingText('100', ent.x, ent.y, '#fff');

    if (ent.type === 'koopa') {
      // Turn into a shell that can be kicked
      ent.isDead = false;
      ent.state = 'shell';
      ent.shellSpeed = 0;
      ent.vx = 0;
      ent.height = 20; // smaller shell height
      ent.y += 12; // lower shell onto floor
    }
  }

  function defeatEnemyFliped(ent: EntityState) {
    audio.playStomp();
    ent.isDead = true;
    ent.vx = ent.vx > 0 ? 1 : -1;
    ent.vy = -6; // launch flipped up into air
    ent.deadTimer = 0;

    const state = stateRef.current;
    state.score += 200;
    onScoreChange(state.score);
    spawnFloatingText('200', ent.x, ent.y, '#ffd700');
  }

  function damagePlayer() {
    const state = stateRef.current;
    if (state.pInvulnerableTimer > 0 || state.pIsDead || state.pVictorySeq) return;

    if (state.hasYoshi) {
      // Yoshi is completely invulnerable! Keep Yoshi and ignore damage.
      return;
    }

    if (state.pForm === 'fire') {
      state.pForm = 'super';
      state.pInvulnerableTimer = 90; // invulnerability frames (1.5s)
      audio.playHurt();
    } else if (state.pForm === 'super') {
      state.pForm = 'small';
      state.pInvulnerableTimer = 90;
      audio.playHurt();
    } else {
      // Death
      killPlayer();
    }
  }

  function killPlayer() {
    const state = stateRef.current;
    if (state.pIsDead) return;

    state.timeAttackRunning = false;
    state.pIsDead = true;
    state.pDeathTimer = 0;
    state.pvy = -6.5; // fly up sad animation
    audio.playDeath();
  }

  function updatePlayerDeath() {
    const state = stateRef.current;
    state.pDeathTimer++;

    // Let him slide/fall down off screen
    if (state.pDeathTimer > 30) {
      state.py += state.pvy;
      state.pvy += 0.35; // fall
    }

    if (state.pDeathTimer > 150) {
      // Subtract life and trigger GameOver or Retry
      state.lives--;
      onLifeChange(state.lives);
      if (state.lives <= 0) {
        state.lives = 3; // Reset for next game
        onGameOver();
      } else {
        // Retry level: re-init state
        gameState = 'playing';
        useEffectTriggerHack();
      }
    }
  }

  // Quick helper to force react level re-trigger
  const [, setTick] = useState(0);
  function useEffectTriggerHack() {
    setTick(t => t + 1);
  }

  // VICTORY SEQUENCE
  function triggerVictorySequence(flagpoleCol: number) {
    const state = stateRef.current;
    if (state.pVictorySeq || state.pIsDead) return;

    state.timeAttackRunning = false;
    const now = performance.now();
    state.timeAttackElapsed = (now - state.timeAttackStartTime) / 1000;

    state.pVictorySeq = true;
    state.pVictoryTimer = 0;
    state.pVictoryStep = 0;
    state.px = flagpoleCol * TILE_SIZE - 4; // snap to pole
    state.pvx = 0;
    state.pvy = 1.5; // slow slide down

    audio.playVictory();
  }

  function updateVictorySequence() {
    const state = stateRef.current;
    state.pVictoryTimer++;

    if (state.pVictoryStep === 0) {
      // 0. Slide down the flagpole
      state.py += state.pvy;
      const tileRow = Math.floor((state.py + state.pHeight) / TILE_SIZE);
      
      // Stop sliding if hit bottom block
      if (tileRow >= 12) {
        state.py = 12 * TILE_SIZE - state.pHeight;
        state.pvy = 0;
        state.pVictoryStep = 1; // Walk to castle
        state.pVictoryTimer = 0;
      }
    } else if (state.pVictoryStep === 1) {
      // 1. Hop off flagpole slightly and walk right
      if (state.pVictoryTimer < 15) {
        state.pvx = 1.5;
        state.pvy = -1.2; // hop off
        state.px += state.pvx;
        state.py += state.pvy;
      } else {
        // Walk right
        state.pvx = 2;
        state.pvy = 0.4; // tiny gravity to stick to floor
        state.px += state.pvx;
        
        // Handle floor level snaps
        const footRow = Math.floor((state.py + state.pHeight) / TILE_SIZE);
        if (footRow >= 13) {
          state.py = 13 * TILE_SIZE - state.pHeight;
        }

        // Vanish after a few steps or when hitting castle door
        if (state.pVictoryTimer > 110) {
          state.pVictoryStep = 2;
          state.pVictoryTimer = 0;
        }
      }
    } else if (state.pVictoryStep === 2) {
      // 2. Victory popup delay
      state.pvx = 0;
      if (state.pVictoryTimer > 60) {
        onVictory();
        onVictoryWithTime?.(state.timeAttackElapsed);
      }
    }
  }

  // FIREBALL LAUNCH
  // Expose fireballs throwing through input checks inside canvas update if player triggers Z/X/run key
  const prevShootRef = useRef(false);
  useEffect(() => {
    const state = stateRef.current;
    const input = inputRef.current;

    // Check Z/X key down trigger
    const shootKeyDown = input.run; // Use Shift/Run key as Fireball button
    if (shootKeyDown && !prevShootRef.current && state.pForm === 'fire' && !state.pIsDead && !state.pVictorySeq) {
      audio.playFireball();
      
      const fireX = state.px + (state.pFacing > 0 ? state.pWidth + 2 : -10);
      const fireY = state.py + 8;
      
      state.entities.push({
        id: `fire_${Date.now()}`,
        type: 'fireball',
        x: fireX,
        y: fireY,
        vx: state.pFacing * 4.2,
        vy: 1,
        width: 12,
        height: 12,
        isGrounded: false,
        isDead: false,
        deadTimer: 0,
        direction: state.pFacing,
      });

      // Show little particle puff at muzzle
      spawnExplosion(fireX + 6, fireY + 6);
    }
    prevShootRef.current = shootKeyDown;
  }, [inputControls.run]);

  // PARTICLE GENERATORS
  function spawnDust(x: number, y: number) {
    const state = stateRef.current;
    for (let i = 0; i < 4; i++) {
      state.particles.push({
        id: `p_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: (Math.random() * 2 - 1) * 0.8,
        vy: -Math.random() * 0.8 - 0.2,
        color: 'rgba(230,230,230,0.6)',
        size: Math.random() * 4 + 2,
        alpha: 0.8,
        life: 0,
        maxLife: 20 + Math.random() * 15,
      });
    }
  }

  function spawnBrickParticles(x: number, y: number) {
    const state = stateRef.current;
    const colors = level.theme === 'underworld' ? ['#244585', '#3863b8'] : ['#a23c10', '#df5813'];
    // 4 chunky block pieces exploding outwards
    const dirs = [
      { vx: -2, vy: -5 },
      { vx: 2, vy: -5 },
      { vx: -1.2, vy: -2.5 },
      { vx: 1.2, vy: -2.5 },
    ];
    dirs.forEach((dir) => {
      state.particles.push({
        id: `p_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: dir.vx,
        vy: dir.vy,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 5,
        alpha: 1,
        life: 0,
        maxLife: 45,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
      });
    });
  }

  function spawnCoinSpark(x: number, y: number) {
    const state = stateRef.current;
    // Glowing stars and ascending mini coin
    for (let i = 0; i < 8; i++) {
      state.particles.push({
        id: `p_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: (Math.random() * 2 - 1) * 1.5,
        vy: -Math.random() * 2 - 1,
        color: '#ffea00',
        size: Math.random() * 3 + 2,
        alpha: 1,
        life: 0,
        maxLife: 25,
      });
    }
  }

  function spawnExplosion(x: number, y: number) {
    const state = stateRef.current;
    // Sparks for fireballs or stomp puffs
    for (let i = 0; i < 6; i++) {
      state.particles.push({
        id: `p_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: (Math.random() * 2 - 1) * 1.2,
        vy: (Math.random() * 2 - 1) * 1.2,
        color: '#ff7700',
        size: Math.random() * 3 + 3,
        alpha: 1,
        life: 0,
        maxLife: 15,
      });
    }
  }

  function spawnFloatingText(text: string, x: number, y: number, color = '#fff') {
    stateRef.current.floatingTexts.push({
      id: `text_${Date.now()}_${Math.random()}`,
      text,
      x,
      y,
      vy: -1.4,
      alpha: 1,
      color,
      size: 11,
    });
  }

  function updateParticles() {
    const state = stateRef.current;
    
    // Update basic particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      // apply gravity if it is brick piece
      if (Math.abs(p.vx) > 1.1) {
        p.vy += 0.22; // brick particle gravity
      }

      if (p.rotation !== undefined && p.rotSpeed !== undefined) {
        p.rotation += p.rotSpeed;
      }

      p.alpha = 1 - p.life / p.maxLife;

      if (p.life >= p.maxLife || p.y > state.levelHeight * TILE_SIZE + 32) {
        state.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
      const t = state.floatingTexts[i];
      t.y += t.vy;
      t.alpha -= 0.022;
      if (t.alpha <= 0) {
        state.floatingTexts.splice(i, 1);
      }
    }
  }

  // CANVAS GRAPHICS RENDERING
  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state = stateRef.current;

    ctx.save();
    
    // Screen shake FX
    if (state.screenShake > 0) {
      const dx = (Math.random() - 0.5) * state.screenShake * 2;
      const dy = (Math.random() - 0.5) * state.screenShake * 2;
      ctx.translate(dx, dy);
    }

    // Clear with theme backdrop
    ctx.fillStyle = level.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply Camera translation
    ctx.translate(-state.cameraX, 0);

    // 1. Draw level grid background decor / sky clouds (Very retro!)
    drawSkyDecor(ctx);

    // 2. Draw level grid tiles
    const colStart = Math.max(0, Math.floor(state.cameraX / TILE_SIZE));
    const colEnd = Math.min(state.levelWidth - 1, colStart + Math.ceil(canvas.width / TILE_SIZE) + 1);

    for (let r = 0; r < state.levelHeight; r++) {
      for (let c = colStart; c <= colEnd; c++) {
        const tileType = state.grid[r][c];
        
        // Find if this tile is currently bouncing
        const bounce = state.bouncingTiles.find(b => b.x === c && b.y === r);
        const yOffset = bounce ? bounce.offset : 0;

        drawTile(ctx, tileType, c * TILE_SIZE, r * TILE_SIZE + yOffset);
      }
    }

    // 3. Draw flagpole flag sliding if victory sequence active
    drawFlagMovement(ctx);

    // 4. Draw entities (enemies, items)
    state.entities.forEach((ent) => {
      drawEntity(ctx, ent);
    });

    // 5. Draw Player
    if (!state.pIsDead || state.pDeathTimer > 30) {
      drawPlayer(ctx);
    }

    // 6. Draw particles
    state.particles.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      if (p.rotation !== undefined) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.restore();
    });

    // 7. Draw floating texts
    state.floatingTexts.forEach((t) => {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px "Press Start 2P", monospace`;
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });

    ctx.restore();
  }

  function drawSkyDecor(ctx: CanvasRenderingContext2D) {
    const state = stateRef.current;
    if (level.theme !== 'overworld') return;

    // Draw cute pixelated clouds & bush backdrops in background
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff';

    // Simple procedurally spaced clouds
    for (let i = 0; i < state.levelWidth; i += 12) {
      const cx = i * TILE_SIZE + 64;
      const cy = 60 + (i % 3) * 20;
      // cloud circles
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.arc(cx + 15, cy - 8, 22, 0, Math.PI * 2);
      ctx.arc(cx + 35, cy, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft green bushes
    ctx.fillStyle = '#4cd137';
    for (let i = 4; i < state.levelWidth; i += 15) {
      const bx = i * TILE_SIZE;
      const by = 13 * TILE_SIZE;
      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI, true);
      ctx.arc(bx + 14, by - 6, 20, 0, Math.PI, true);
      ctx.arc(bx + 28, by, 14, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTile(ctx: CanvasRenderingContext2D, type: TileType, x: number, y: number) {
    if (type === TileType.EMPTY) return;

    ctx.save();
    
    // Pixelated border shadow style
    ctx.imageSmoothingEnabled = false;

    // Set colors based on Level Theme (Overworld/Underworld/Castle)
    const isUnder = level.theme === 'underworld';
    const isCastle = level.theme === 'castle';

    const brickColor = isUnder ? '#273c75' : (isCastle ? '#4b5563' : '#d24d10');
    const brickShadow = isUnder ? '#192a56' : (isCastle ? '#1f2937' : '#7f2801');
    const brickHighlight = isUnder ? '#3c5a99' : (isCastle ? '#6b7280' : '#ff7a3d');

    switch (type) {
      case TileType.GROUND: {
        // Classic grassy/earth block
        ctx.fillStyle = '#228b22'; // bright grass top
        ctx.fillRect(x, y, TILE_SIZE, 6);
        ctx.fillStyle = '#8b5a2b'; // deep rich earth
        ctx.fillRect(x, y + 6, TILE_SIZE, TILE_SIZE - 6);
        // Dirt speckles
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 4, y + 10, 3, 3);
        ctx.fillRect(x + 16, y + 14, 3, 3);
        ctx.fillRect(x + 24, y + 11, 3, 3);
        ctx.fillRect(x + 8, y + 22, 3, 3);
        break;
      }
      case TileType.BRICK: {
        // Textured retro brick
        ctx.fillStyle = brickColor;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        
        // Highlights & Shadows
        ctx.fillStyle = brickShadow;
        ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
        ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);

        ctx.fillStyle = brickHighlight;
        ctx.fillRect(x, y, TILE_SIZE, 2);
        ctx.fillRect(x, y, 2, TILE_SIZE);

        // Brick grout lines
        ctx.fillStyle = brickShadow;
        ctx.fillRect(x, y + 10, TILE_SIZE, 2);
        ctx.fillRect(x, y + 21, TILE_SIZE, 2);
        ctx.fillRect(x + 10, y, 2, 10);
        ctx.fillRect(x + 22, y + 10, 2, 11);
        ctx.fillRect(x + 8, y + 21, 2, 11);
        break;
      }
      case TileType.MYSTERY_COIN:
      case TileType.MYSTERY_MUSHROOM:
      case TileType.MYSTERY_FLOWER: {
        // Glowing gold/yellow mystery block with central "?"
        const cycle = Math.floor(stateRef.current.frameCounter / 10) % 3;
        const color = cycle === 0 ? '#ffae00' : (cycle === 1 ? '#ffcc00' : '#e09500');
        ctx.fillStyle = color;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // dark frame outline
        ctx.strokeStyle = '#634301';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

        // Screws in corners
        ctx.fillStyle = '#634301';
        ctx.fillRect(x + 3, y + 3, 2, 2);
        ctx.fillRect(x + TILE_SIZE - 5, y + 3, 2, 2);
        ctx.fillRect(x + 3, y + TILE_SIZE - 5, 2, 2);
        ctx.fillRect(x + TILE_SIZE - 5, y + TILE_SIZE - 5, 2, 2);

        // Central "?"
        ctx.font = 'bold 15px "Press Start 2P", monospace';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#432900';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText('?', x + 9, y + 23);
        break;
      }
      case TileType.EMPTY_MYSTERY: {
        // Flat grey hit block
        ctx.fillStyle = '#8395a7';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        // Screws
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(x + 3, y + 3, 2, 2);
        ctx.fillRect(x + TILE_SIZE - 5, y + 3, 2, 2);
        ctx.fillRect(x + 3, y + TILE_SIZE - 5, 2, 2);
        ctx.fillRect(x + TILE_SIZE - 5, y + TILE_SIZE - 5, 2, 2);
        break;
      }
      case TileType.SOLID_BLOCK: {
        // Pyramid/Solid block (looks like NES block)
        ctx.fillStyle = isUnder ? '#3c5a99' : '#d8a05c';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        // Shading lines
        ctx.beginPath();
        ctx.moveTo(x + 2, y + TILE_SIZE - 2);
        ctx.lineTo(x + TILE_SIZE - 2, y + TILE_SIZE - 2);
        ctx.lineTo(x + TILE_SIZE - 2, y + 2);
        ctx.strokeStyle = '#634401';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
      }
      case TileType.PIPE_TL: {
        // Metallic Green Pipe Top-Left lip
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#27ae60'; // darker shade right side
        ctx.fillRect(x + TILE_SIZE - 10, y, 10, TILE_SIZE);
        ctx.fillStyle = '#a3f7bf'; // shine stripe
        ctx.fillRect(x + 4, y, 4, TILE_SIZE);
        // Outline
        ctx.strokeStyle = '#1b4f32';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        break;
      }
      case TileType.PIPE_TR: {
        // Metallic Green Pipe Top-Right lip
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#1e7e43'; // even darker green shadow
        ctx.fillRect(x, y, 10, TILE_SIZE);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(x + 10, y, TILE_SIZE - 10, TILE_SIZE);
        // Outline
        ctx.strokeStyle = '#1b4f32';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        break;
      }
      case TileType.PIPE_L: {
        // Pipe Body Left
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(x + 4, y, TILE_SIZE - 4, TILE_SIZE);
        ctx.fillStyle = '#27ae60'; // shade
        ctx.fillRect(x + TILE_SIZE - 10, y, 10, TILE_SIZE);
        ctx.fillStyle = '#a3f7bf'; // shine
        ctx.fillRect(x + 8, y, 4, TILE_SIZE);
        // Vertical side borders
        ctx.fillStyle = '#1b4f32';
        ctx.fillRect(x + 4, y, 2.5, TILE_SIZE);
        break;
      }
      case TileType.PIPE_R: {
        // Pipe Body Right
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(x, y, TILE_SIZE - 4, TILE_SIZE);
        ctx.fillStyle = '#1e7e43'; // shadow
        ctx.fillRect(x, y, 8, TILE_SIZE);
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(x + 8, y, TILE_SIZE - 12, TILE_SIZE);
        // Right border
        ctx.fillStyle = '#1b4f32';
        ctx.fillRect(x + TILE_SIZE - 6, y, 2.5, TILE_SIZE);
        break;
      }
      case TileType.CASTLE_BRICK: {
        // Volcanic or grey solid castle brick
        ctx.fillStyle = isCastle ? '#2c3e50' : '#57606f';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#1e272e';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        // Slits
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(x + 8, y + 8, 16, 2);
        ctx.fillRect(x + 8, y + 20, 16, 2);
        break;
      }
      case TileType.CASTLE_DOOR: {
        // Retro brown door inside castle
        ctx.fillStyle = '#845c36';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#4f3317'; // side frame
        ctx.fillRect(x, y, 4, TILE_SIZE);
        ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);
        // gold handle
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(x + 8, y + 14, 4, 4);
        break;
      }
      case TileType.SPIKES: {
        // Metallic Spikes
        ctx.fillStyle = '#8395a7';
        ctx.fillRect(x, y + 24, TILE_SIZE, 8); // solid base
        
        // Spike points
        ctx.fillStyle = '#ced6e0';
        ctx.beginPath();
        for (let i = 0; i < TILE_SIZE; i += 8) {
          ctx.moveTo(x + i, y + 24);
          ctx.lineTo(x + i + 4, y + 6);
          ctx.lineTo(x + i + 8, y + 24);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case TileType.LAVA: {
        // Molten lava wave! Animates.
        const wave = Math.sin(stateRef.current.frameCounter * 0.1 + x * 0.1) * 3;
        ctx.fillStyle = '#ff3f34'; // hot red base
        ctx.fillRect(x, y + 8, TILE_SIZE, TILE_SIZE - 8);
        
        ctx.fillStyle = '#ffa801'; // bright orange top layer wave
        ctx.beginPath();
        ctx.moveTo(x, y + 8 + wave);
        ctx.lineTo(x + TILE_SIZE, y + 8 + wave);
        ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
        ctx.lineTo(x, y + TILE_SIZE);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case TileType.COIN_STILL: {
        // Air coin spinning!
        const cycle = Math.floor(stateRef.current.frameCounter / 8) % 4;
        const aspect = [1, 0.6, 0.2, 0.6][cycle];
        
        ctx.translate(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        ctx.scale(aspect, 1);
        
        ctx.fillStyle = '#ffd700'; // shiny gold
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff'; // glare point
        ctx.fillRect(-2, -5, 2, 2);
        break;
      }
      case TileType.FLAGPOLE: {
        // Flag pole green/grey steel
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(x + TILE_SIZE / 2 - 3, y, 6, TILE_SIZE);
        // steel details
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(x + TILE_SIZE / 2 - 1, y, 2, TILE_SIZE);
        break;
      }
      case TileType.FLAG: {
        // Solid green flagpole head or initial flag top
        ctx.fillStyle = '#27ae60';
        ctx.beginPath();
        ctx.arc(x + TILE_SIZE / 2, y + 8, 8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    ctx.restore();
  }

  function drawFlagMovement(ctx: CanvasRenderingContext2D) {
    const state = stateRef.current;
    
    // Find flagpole column to draw sliding flag
    const flagRow = 3;
    const flagColIndex = level.grid[flagRow].findIndex(t => t === TileType.FLAGPOLE);
    if (flagColIndex === -1) return;

    ctx.save();
    
    const flagX = flagColIndex * TILE_SIZE;
    // Flag slides down depending on victory sequence timer
    let flagY = flagRow * TILE_SIZE + 10;
    if (state.pVictorySeq) {
      const slideProgress = Math.min(1, state.pVictoryTimer / 90);
      flagY += slideProgress * 8 * TILE_SIZE;
    }

    // Draw triangle retro flag
    ctx.fillStyle = '#ff3f34'; // bright red flag
    ctx.beginPath();
    ctx.moveTo(flagX - 16, flagY);
    ctx.lineTo(flagX + TILE_SIZE / 2 - 3, flagY + 10);
    ctx.lineTo(flagX + TILE_SIZE / 2 - 3, flagY - 10);
    ctx.closePath();
    ctx.fill();

    // white circle inside flag
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(flagX - 6, flagY, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  function drawEntity(ctx: CanvasRenderingContext2D, ent: EntityState) {
    ctx.save();

    // If spawning, clip drawing to the region above the block top
    if (ent.isSpawning && ent.spawnTargetY !== undefined) {
      const blockTopY = ent.spawnTargetY + 24; // top of block is at spawnTargetY + powerup height (24)
      ctx.beginPath();
      ctx.rect(ent.x - 20, blockTopY - 200, ent.width + 40, 200); // 200px box above the block top
      ctx.clip();
    }

    const walkCycle = Math.floor(stateRef.current.frameCounter / 10) % 2;

    switch (ent.type) {
      case 'goomba': {
        // Stomped Goomba squished frame
        if (ent.isDead && ent.deadTimer > 0) {
          ctx.fillStyle = '#8b5a2b'; // squished brown dome
          ctx.fillRect(ent.x, ent.y + 16, ent.width, 8);
          ctx.fillStyle = '#ffddaa'; // eyes
          ctx.fillRect(ent.x + 4, ent.y + 16, 16, 4);
          break;
        }

        // Angry Goomba body
        ctx.fillStyle = '#8c593b'; // brown body dome
        ctx.beginPath();
        ctx.arc(ent.x + 12, ent.y + 10, 11, Math.PI, 0); // round head
        ctx.lineTo(ent.x + 24, ent.y + 16);
        ctx.lineTo(ent.x, ent.y + 16);
        ctx.closePath();
        ctx.fill();

        // tan face lower section
        ctx.fillStyle = '#fce2c4';
        ctx.fillRect(ent.x + 4, ent.y + 10, 16, 8);

        // Angry black eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(ent.x + 6, ent.y + 8, 3, 5);
        ctx.fillRect(ent.x + 15, ent.y + 8, 3, 5);

        // Angry brow lines
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ent.x + 4, ent.y + 6);
        ctx.lineTo(ent.x + 10, ent.y + 8);
        ctx.moveTo(ent.x + 20, ent.y + 6);
        ctx.lineTo(ent.x + 14, ent.y + 8);
        ctx.stroke();

        // Cute black fangs mouth
        ctx.fillStyle = '#000';
        ctx.fillRect(ent.x + 9, ent.y + 15, 6, 2);

        // Black walking feet
        ctx.fillStyle = '#2c3e50';
        if (walkCycle === 0) {
          ctx.fillRect(ent.x + 2, ent.y + 18, 7, 6); // left forward
          ctx.fillRect(ent.x + 14, ent.y + 18, 7, 6);
        } else {
          ctx.fillRect(ent.x + 4, ent.y + 18, 7, 6);
          ctx.fillRect(ent.x + 16, ent.y + 18, 7, 6); // right forward
        }
        break;
      }
      case 'koopa': {
        if (ent.state === 'shell') {
          // Koopa Green Shell form
          const spin = Math.floor(stateRef.current.frameCounter / 4) % 4;
          
          ctx.save();
          ctx.translate(ent.x + 12, ent.y + 10);
          if (ent.shellSpeed && ent.shellSpeed > 0) {
            ctx.rotate(spin * Math.PI / 2);
          }
          ctx.fillStyle = '#2ecc71'; // beautiful green shell
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          // shell lines
          ctx.strokeStyle = '#27ae60';
          ctx.lineWidth = 2;
          ctx.strokeRect(-6, -6, 12, 12);
          ctx.restore();
          break;
        }

        // Normal walking Koopa
        ctx.fillStyle = '#f1c40f'; // yellow face/neck
        ctx.fillRect(ent.x + 10, ent.y + 4, 12, 10);
        
        // Green Shell on back
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(ent.x + 10, ent.y + 18, 9, 0, Math.PI * 2);
        ctx.fill();

        // White beak eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(ent.x + 14, ent.y + 4, 8, 5);
        ctx.fillStyle = '#000';
        ctx.fillRect(ent.x + 18, ent.y + 5, 2, 3); // pupils

        // yellow belly
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(ent.x + 8, ent.y + 14, 6, 10);

        // Orange walking shoes/feet
        ctx.fillStyle = '#e67e22';
        if (walkCycle === 0) {
          ctx.fillRect(ent.x + 4, ent.y + 24, 7, 8);
          ctx.fillRect(ent.x + 13, ent.y + 24, 7, 8);
        } else {
          ctx.fillRect(ent.x + 7, ent.y + 24, 7, 8);
          ctx.fillRect(ent.x + 16, ent.y + 24, 7, 8);
        }
        break;
      }
      case 'mushroom': {
        // Super red powerup mushroom
        ctx.fillStyle = '#ff4757'; // red dome head
        ctx.beginPath();
        ctx.arc(ent.x + 12, ent.y + 12, 12, Math.PI, 0);
        ctx.lineTo(ent.x + 24, ent.y + 20);
        ctx.lineTo(ent.x, ent.y + 20);
        ctx.closePath();
        ctx.fill();

        // White spots on mushroom head
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ent.x + 12, ent.y + 5, 3, 0, Math.PI * 2);
        ctx.arc(ent.x + 4, ent.y + 11, 2.5, 0, Math.PI * 2);
        ctx.arc(ent.x + 20, ent.y + 11, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // white stalk stem
        ctx.fillStyle = '#f1f2f6';
        ctx.fillRect(ent.x + 7, ent.y + 14, 10, 10);
        // black eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(ent.x + 9, ent.y + 16, 1.5, 3);
        ctx.fillRect(ent.x + 13, ent.y + 16, 1.5, 3);
        break;
      }
      case 'flower': {
        // Fire flower with glowing animated stems & leaves
        const cycle = Math.floor(stateRef.current.frameCounter / 8) % 3;
        const color = ['#ff3f34', '#ffa801', '#ffea00'][cycle];

        // Orange/Yellow petals
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(ent.x + 12, ent.y + 10, 10, 0, Math.PI * 2);
        ctx.fill();

        // White face inside flower
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ent.x + 12, ent.y + 10, 7, 0, Math.PI * 2);
        ctx.fill();

        // Black eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(ent.x + 10, ent.y + 8, 1.5, 4);
        ctx.fillRect(ent.x + 12.5, ent.y + 8, 1.5, 4);

        // green vine stem & leaf
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ent.x + 12, ent.y + 18);
        ctx.lineTo(ent.x + 12, ent.y + 24);
        ctx.stroke();

        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(ent.x + 6, ent.y + 19, 12, 3); // leaves
        break;
      }
            case 'fireball': {
        // Bouncing fireball (red outer, yellow core)
        ctx.fillStyle = '#ff3f34';
        ctx.beginPath();
        ctx.arc(ent.x + 6, ent.y + 6, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(ent.x + 6, ent.y + 6, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'yoshi': {
        // Render Yoshi as a friendly green dinosaur!
        const hop = ent.vy < 0 ? -4 : 0; // draw shifted up if hopping
        const xOffset = ent.x;
        const yOffset = ent.y + hop;

        ctx.save();
        // Since Yoshi is friendly, let him face right if player is on his right
        const playerIsRight = stateRef.current.px > ent.x;
        if (playerIsRight) {
          ctx.translate(xOffset + 14, yOffset + 14);
          ctx.scale(-1, 1);
          ctx.translate(-(xOffset + 14), -(yOffset + 14));
        }

        // 1. Back boots (orange)
        ctx.fillStyle = '#e67e22'; // orange boot
        ctx.fillRect(xOffset + 4, yOffset + 22, 8, 6);
        ctx.fillRect(xOffset + 14, yOffset + 22, 8, 6);

        // 2. White legs / Green legs
        ctx.fillStyle = '#32cd32'; // green
        ctx.fillRect(xOffset + 6, yOffset + 16, 4, 6);
        ctx.fillRect(xOffset + 16, yOffset + 16, 4, 6);

        // 3. Round green body
        ctx.fillStyle = '#32cd32'; // body
        ctx.beginPath();
        ctx.arc(xOffset + 12, yOffset + 14, 8, 0, Math.PI * 2);
        ctx.fill();

        // 4. White belly
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(xOffset + 15, yOffset + 14, 5, 0, Math.PI * 2);
        ctx.fill();

        // 5. Red saddle on back
        ctx.fillStyle = '#e74c3c'; // red
        ctx.fillRect(xOffset + 5, yOffset + 10, 5, 5);

        // 6. Orange spikes (spines) on back of neck
        ctx.fillStyle = '#e67e22';
        ctx.fillRect(xOffset + 4, yOffset + 3, 3, 3);
        ctx.fillRect(xOffset + 4, yOffset + 6, 3, 3);

        // 7. Large green head
        ctx.fillStyle = '#32cd32';
        ctx.beginPath();
        ctx.arc(xOffset + 18, yOffset + 6, 6, 0, Math.PI * 2); // main head
        ctx.fill();

        // Large rounded snout (distinctive Yoshi nose!)
        ctx.beginPath();
        ctx.arc(xOffset + 22, yOffset + 8, 6, 0, Math.PI * 2);
        ctx.fill();

        // White cheeks/muzzle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(xOffset + 21, yOffset + 11, 4, 0, Math.PI * 2);
        ctx.fill();

        // 8. Eyes (white background with black pupil)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(xOffset + 13, yOffset + 1, 4, 7);
        ctx.fillStyle = '#000000';
        ctx.fillRect(xOffset + 14, yOffset + 2, 2, 4);

        ctx.restore();
        break;
      }
    }

    ctx.restore();
  }

  function drawPlayer(ctx: CanvasRenderingContext2D) {
    const state = stateRef.current;
    
    // Flickering during invulnerable frames
    if (state.pInvulnerableTimer > 0 && Math.floor(state.pInvulnerableTimer / 4) % 2 === 0) {
      return;
    }

    ctx.save();

    // Flip horizontally depending on facing
    ctx.translate(state.px + state.pWidth / 2, state.py + state.pHeight / 2);
    ctx.scale(state.pFacing, 1);

    // If riding Yoshi, shift player rendering slightly upward so they sit on the saddle
    if (state.hasYoshi) {
      ctx.translate(0, -10);
    }

    // Form color schemes
    let shirtColor = '#ff3838'; // Red small cap/shirt
    let overallColor = '#2f3542'; // Dark overall/pants
    let skinColor = '#fed330'; // Cute gold peach skin

    if (state.pForm === 'fire') {
      shirtColor = '#ffffff'; // White Cap/Shirt
      overallColor = '#ff2f2f'; // Red overalls
    }

    // Is running animated?
    const isMoving = Math.abs(state.pvx) > 0.2 && !state.pVictorySeq;
    const isJumping = !state.pGrounded;
    const runFrame = Math.floor(stateRef.current.frameCounter / (state.pvx ? Math.max(2, 6 - Math.abs(state.pvx)) : 6)) % 3;

    if (state.pForm === 'small') {
      // SMALL PLAYER SPRITE (20x24)
      ctx.translate(-10, -12);

      // Head: Red Cap (small block)
      ctx.fillStyle = shirtColor;
      ctx.fillRect(3, 0, 11, 4); // Cap dome
      ctx.fillRect(3, 3, 13, 2.5); // Visor brim

      // Face peach section
      ctx.fillStyle = skinColor;
      ctx.fillRect(5, 5.5, 9, 6.5);
      
      // Black eye & mustache
      ctx.fillStyle = '#000';
      ctx.fillRect(11, 6, 2.5, 3); // Eye
      ctx.fillStyle = '#4b5563'; // mustache
      ctx.fillRect(9, 9, 5, 2);

      // Shirt / Body
      ctx.fillStyle = shirtColor;
      ctx.fillRect(4, 12, 12, 6);

      // Overalls / Pants
      ctx.fillStyle = overallColor;
      ctx.fillRect(4, 16, 12, 5);

      // Animated Feet based on movement frame
      ctx.fillStyle = '#4b5563'; // black shoes
      if (isJumping) {
        ctx.fillRect(2, 21, 6, 3);
        ctx.fillRect(10, 19, 6, 3); // jumping offset shoes
      } else if (isMoving) {
        if (runFrame === 0) {
          ctx.fillRect(1, 21, 6, 3);
          ctx.fillRect(9, 21, 6, 3);
        } else if (runFrame === 1) {
          ctx.fillRect(3, 21, 6, 3);
          ctx.fillRect(12, 21, 6, 3);
        } else {
          ctx.fillRect(2, 21, 5, 3);
          ctx.fillRect(10, 21, 7, 3);
        }
      } else {
        // Static standing shoes
        ctx.fillRect(3, 21, 6, 3);
        ctx.fillRect(11, 21, 6, 3);
      }
    } else {
      // SUPER OR FIRE SPRITE (24x44)
      ctx.translate(-12, -22);

      // Tall Head Cap (red or white)
      ctx.fillStyle = shirtColor;
      ctx.fillRect(4, 0, 14, 6);
      ctx.fillRect(4, 5, 17, 3); // brim

      // Peach Face section
      ctx.fillStyle = skinColor;
      ctx.fillRect(6, 8, 12, 11);
      
      // Eye, mustache, beard side
      ctx.fillStyle = '#000';
      ctx.fillRect(14, 9, 3, 4); // eye
      ctx.fillStyle = '#5c3a21'; // brown mustache
      ctx.fillRect(12, 14, 7, 3.5);

      // Torso & Arm shirt sleeves
      ctx.fillStyle = shirtColor;
      ctx.fillRect(5, 19, 14, 14);

      // Big Overalls/Trousers with yellow buttons
      ctx.fillStyle = overallColor;
      ctx.fillRect(5, 27, 14, 12);
      
      // Buttons
      ctx.fillStyle = '#f1c40f';
      ctx.fillRect(7, 28, 2, 2.5);
      ctx.fillRect(12, 28, 2, 2.5);

      // Arms swing during run
      ctx.fillStyle = shirtColor;
      if (isJumping) {
        ctx.fillRect(1, 16, 5, 8); // raise hands up!
      } else if (isMoving) {
        if (runFrame === 0) {
          ctx.fillRect(0, 22, 5, 8);
          ctx.fillRect(19, 19, 5, 8);
        } else {
          ctx.fillRect(2, 19, 5, 8);
          ctx.fillRect(19, 22, 5, 8);
        }
      } else {
        ctx.fillRect(1, 21, 5, 8); // static relaxed arm
      }

      // Large brown/black boots
      ctx.fillStyle = '#1e272e';
      if (isJumping) {
        ctx.fillRect(2, 39, 7, 5);
        ctx.fillRect(13, 37, 7, 5);
      } else if (isMoving) {
        if (runFrame === 0) {
          ctx.fillRect(1, 39, 8, 5);
          ctx.fillRect(12, 39, 8, 5);
        } else if (runFrame === 1) {
          ctx.fillRect(3, 39, 7, 5);
          ctx.fillRect(14, 39, 8, 5);
        } else {
          ctx.fillRect(2, 39, 8, 5);
          ctx.fillRect(11, 39, 9, 5);
        }
      } else {
        ctx.fillRect(3, 39, 8, 5);
        ctx.fillRect(13, 39, 8, 5);
      }
    }

    // Draw Yoshi under player if hasYoshi is true!
    if (state.hasYoshi) {
      ctx.save();
      // Adjust Yoshi height relative to player form
      const yoshiY = state.pForm === 'small' ? 6 : 22;
      const yoshiX = -12;

      // 1. Yoshi feet (orange boots)
      ctx.fillStyle = '#e67e22';
      const feetWalk = !state.pGrounded ? -2 : (isMoving ? (runFrame % 2 === 0 ? 2 : -2) : 0);
      ctx.fillRect(yoshiX + 4, yoshiY + 20 + feetWalk, 7, 5);
      ctx.fillRect(yoshiX + 13, yoshiY + 20 - feetWalk, 7, 5);

      // 2. Yoshi legs
      ctx.fillStyle = '#32cd32'; // Green
      ctx.fillRect(yoshiX + 6, yoshiY + 14, 3, 6);
      ctx.fillRect(yoshiX + 15, yoshiY + 14, 3, 6);

      // 3. Green body (Yoshi round back/torso)
      ctx.beginPath();
      ctx.arc(yoshiX + 11, yoshiY + 11, 8, 0, Math.PI * 2);
      ctx.fill();

      // White belly
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(yoshiX + 15, yoshiY + 12, 5, 0, Math.PI * 2);
      ctx.fill();

      // 4. Red saddle (where Mario sits!)
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(yoshiX + 6, yoshiY + 4, 8, 4);

      // 5. Long green neck & head
      ctx.fillStyle = '#32cd32';
      ctx.fillRect(yoshiX + 12, yoshiY, 8, 8); // Neck
      
      // Head circle
      ctx.beginPath();
      ctx.arc(yoshiX + 18, yoshiY + 1, 6, 0, Math.PI * 2);
      ctx.fill();

      // Famous green snout!
      ctx.beginPath();
      ctx.arc(yoshiX + 22, yoshiY + 3, 5, 0, Math.PI * 2);
      ctx.fill();

      // White cheeks/muzzle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(yoshiX + 21, yoshiY + 6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 6. Orange spikes
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(yoshiX + 8, yoshiY - 3, 3, 3);
      ctx.fillRect(yoshiX + 8, yoshiY, 3, 3);

      // 7. Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(yoshiX + 13, yoshiY - 5, 3.5, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(yoshiX + 14, yoshiY - 4, 1.8, 3.5);

      ctx.restore();
    }

    ctx.restore();
  }

  return (
    <div className="relative overflow-hidden rounded bg-black shadow-inner border-4 border-slate-900" id="game_viewport">
      <canvas
        ref={canvasRef}
        width={600}
        height={480}
        className="block w-full h-auto aspect-[5/4]"
        style={{ imageRendering: 'pixelated' }}
        id="game_canvas"
      />
    </div>
  );
}
