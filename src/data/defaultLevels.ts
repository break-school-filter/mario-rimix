/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TileType, LevelData, EntityType } from '../types';

// Helper to create an empty grid of height x width
function createEmptyGrid(width: number, height: number): TileType[][] {
  const grid: TileType[][] = [];
  for (let r = 0; r < height; r++) {
    const row: TileType[] = [];
    for (let c = 0; c < width; c++) {
      row.push(TileType.EMPTY);
    }
    grid.push(row);
  }
  return grid;
}

// Build Level 1: Grassland Adventure
function buildLevel1(): LevelData {
  const width = 180;
  const height = 15;
  const grid = createEmptyGrid(width, height);
  const entities: { type: EntityType; x: number; y: number }[] = [];

  // 1. Build Ground (Rows 13 and 14)
  for (let c = 0; c < width; c++) {
    // Leave some pits/gaps for jumping challenges
    const isPit = 
      (c >= 30 && c <= 32) || 
      (c >= 55 && c <= 57) || 
      (c >= 80 && c <= 83) ||
      (c >= 126 && c <= 129) || // New extended pits
      (c >= 146 && c <= 149);
    if (!isPit) {
      grid[13][c] = TileType.GROUND;
      grid[14][c] = TileType.GROUND;
    }
  }

  // 2. Build Pipes (optimized heights for smooth playability)
  const pipes = [
    { col: 18, h: 2 },
    { col: 38, h: 2 }, // Reduced from 3 to 2 for better game flow
    { col: 64, h: 2 },
    { col: 88, h: 3 }, // Reduced from 4 to 3 so it's challenging but fully jumpable
    { col: 135, h: 2 }, // New extended pipe
  ];
  pipes.forEach(({ col, h }) => {
    // Pipe top
    grid[13 - h][col] = TileType.PIPE_TL;
    grid[13 - h][col + 1] = TileType.PIPE_TR;
    // Pipe body
    for (let r = 14 - h; r < 13; r++) {
      grid[r][col] = TileType.PIPE_L;
      grid[r][col + 1] = TileType.PIPE_R;
    }
  });

  // 3. Bricks & Mystery Blocks
  // First cluster (cols 12 to 24, row 9)
  grid[9][12] = TileType.BRICK;
  grid[9][13] = TileType.MYSTERY_COIN;
  grid[9][14] = TileType.BRICK;
  grid[9][15] = TileType.MYSTERY_MUSHROOM;
  grid[9][16] = TileType.BRICK;

  // Air coins
  grid[5][13] = TileType.COIN_STILL;
  grid[5][14] = TileType.COIN_STILL;
  grid[5][15] = TileType.COIN_STILL;

  // Second cluster over first pit (cols 27 to 35, rows 9 and 5)
  grid[9][27] = TileType.BRICK;
  grid[9][28] = TileType.MYSTERY_COIN;
  grid[9][29] = TileType.BRICK;
  
  grid[9][34] = TileType.BRICK;
  grid[9][35] = TileType.MYSTERY_FLOWER;
  grid[9][36] = TileType.BRICK;

  // Third cluster (cols 42 to 52)
  for (let c = 42; c <= 50; c += 2) {
    grid[9][c] = TileType.BRICK;
  }
  grid[9][45] = TileType.MYSTERY_COIN;
  grid[9][47] = TileType.MYSTERY_COIN;

  // Staircases of Solid Blocks (Properly filled from ground up)
  // Col 70-74 (Right facing stair)
  for (let c = 70; c <= 74; c++) {
    const heightOfStair = Math.min(4, c - 70 + 1);
    for (let h = 0; h < heightOfStair; h++) {
      grid[12 - h][c] = TileType.SOLID_BLOCK;
    }
  }
  // Col 76-79 (Left facing stair, stops before the pit starting at col 80)
  for (let c = 76; c <= 79; c++) {
    const heightOfStair = 4 - (c - 76);
    for (let h = 0; h < heightOfStair; h++) {
      grid[12 - h][c] = TileType.SOLID_BLOCK;
    }
  }

  // --- Extended Area (Cols 120 to 180) ---
  // High-up coin floating rows & bricks
  for (let c = 120; c <= 124; c++) {
    grid[9][c] = TileType.BRICK;
    if (c === 122) {
      grid[9][c] = TileType.MYSTERY_FLOWER;
    }
  }

  // Floating platforms over extended pit 126-129
  grid[9][127] = TileType.BRICK;
  grid[9][128] = TileType.BRICK;

  // Staircase facing right
  for (let c = 140; c <= 144; c++) {
    const heightOfStair = Math.min(4, c - 140 + 1);
    for (let h = 0; h < heightOfStair; h++) {
      grid[12 - h][c] = TileType.SOLID_BLOCK;
    }
  }

  // Floating blocks over extended pit 146-149
  grid[9][147] = TileType.BRICK;
  grid[9][148] = TileType.MYSTERY_COIN;

  // Staircase facing left
  for (let c = 151; c <= 155; c++) {
    const heightOfStair = 5 - (c - 151);
    for (let h = 0; h < heightOfStair; h++) {
      grid[12 - h][c] = TileType.SOLID_BLOCK;
    }
  }

  // End flagpole & castle (Moved from 108 to 168)
  const flagCol = 168;
  grid[13][flagCol] = TileType.SOLID_BLOCK;
  for (let r = 3; r <= 12; r++) {
    grid[r][flagCol] = TileType.FLAGPOLE;
  }
  grid[3][flagCol] = TileType.FLAG; // Flag top

  // Castle wall
  for (let c = 173; c <= 179; c++) {
    for (let r = 9; r <= 12; r++) {
      grid[r][c] = TileType.CASTLE_BRICK;
    }
  }
  // Castle door
  grid[12][176] = TileType.CASTLE_DOOR;
  grid[11][176] = TileType.CASTLE_DOOR;

  // 4. Spawn Entities
  // Friendly Yoshi Mob!
  entities.push({ type: 'yoshi', x: 10 * 32, y: 12 * 32 }); // Spawn Yoshi near start
  entities.push({ type: 'yoshi', x: 115 * 32, y: 12 * 32 }); // Spawn Yoshi after stairs

  entities.push({ type: 'goomba', x: 14 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 22 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 35 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 44 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 48 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 68 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 84 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 92 * 32, y: 12 * 32 });
  
  // Extended area enemies
  entities.push({ type: 'goomba', x: 122 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 133 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 153 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 160 * 32, y: 12 * 32 });

  return {
    id: 'level_1',
    name: '1-1 Grassland Adventure',
    theme: 'overworld',
    width,
    height,
    grid,
    timeLimit: 300,
    initialEntities: entities,
    backgroundColor: '#5c94fc', // Sky blue
    musicType: 'overworld',
  };
}

// Build Level 2: Underground Cavern
function buildLevel2(): LevelData {
  const width = 180;
  const height = 15;
  const grid = createEmptyGrid(width, height);
  const entities: { type: EntityType; x: number; y: number }[] = [];

  // Underground theme background: Deep slate / dark blue
  // 1. Build Ground (Underground style, bricks instead of soil)
  for (let c = 0; c < width; c++) {
    // Slightly reduced widths for high playability & standard jump heights
    const isPit = 
      (c >= 23 && c <= 24) || 
      (c >= 51 && c <= 53) || 
      (c >= 79 && c <= 80) ||
      (c >= 125 && c <= 128) || // New extended pit
      (c >= 148 && c <= 151);   // New extended pit
    const isSpikePit = (c >= 41 && c <= 43) || (c >= 135 && c <= 138); // New extended spike pit

    if (!isPit && !isSpikePit) {
      grid[13][c] = TileType.CASTLE_BRICK;
      grid[14][c] = TileType.CASTLE_BRICK;
    } else if (isSpikePit) {
      grid[13][c] = TileType.SPIKES;
      grid[14][c] = TileType.CASTLE_BRICK;
    }
  }

  // Roof to make it feel like a cave
  for (let c = 0; c < width; c++) {
    grid[0][c] = TileType.CASTLE_BRICK;
    grid[1][c] = TileType.CASTLE_BRICK;
  }

  // 2. Pipes & Barriers
  grid[12][15] = TileType.CASTLE_BRICK;
  grid[11][15] = TileType.CASTLE_BRICK;

  // Ground Pipe
  grid[12][32] = TileType.PIPE_TL;
  grid[12][33] = TileType.PIPE_TR;

  // 3. Floating Platforms
  // Over first pit (22-25)
  grid[9][21] = TileType.BRICK;
  grid[9][23] = TileType.MYSTERY_COIN;
  grid[9][24] = TileType.MYSTERY_MUSHROOM;
  grid[9][26] = TileType.BRICK;

  // Floating rows (lowered to row 10 so the player can easily jump onto them and cross the spikes)
  for (let c = 40; c <= 45; c++) {
    grid[10][c] = TileType.BRICK;
    if (c % 2 === 0) {
      grid[7][c] = TileType.COIN_STILL;
    }
  }

  // Giant jump challenge (Lowered to floor-height y=12 for a comfortable stepping stone over the pit)
  for (let c = 51; c <= 53; c++) {
    grid[12][c] = TileType.BRICK; // middle floating brick bridge at ground height
  }

  // Coins in air
  for (let c = 60; c <= 70; c += 2) {
    grid[9][c] = TileType.COIN_STILL;
    grid[8][c] = TileType.COIN_STILL;
  }

  // Mystery block with flower
  grid[9][65] = TileType.MYSTERY_FLOWER;

  // Tricky stair jumps (Filled to the ground for classic scaling feel)
  grid[12][75] = TileType.SOLID_BLOCK;
  
  grid[12][76] = TileType.SOLID_BLOCK;
  grid[11][76] = TileType.SOLID_BLOCK;
  
  grid[12][77] = TileType.SOLID_BLOCK;
  grid[11][77] = TileType.SOLID_BLOCK;
  grid[10][77] = TileType.SOLID_BLOCK;

  grid[12][83] = TileType.SOLID_BLOCK;
  grid[11][83] = TileType.SOLID_BLOCK;
  grid[10][83] = TileType.SOLID_BLOCK;

  grid[12][84] = TileType.SOLID_BLOCK;
  grid[11][84] = TileType.SOLID_BLOCK;

  grid[12][85] = TileType.SOLID_BLOCK;

  // --- Extended Cavern Area (Cols 120 to 180) ---
  // Brick rows & mystery blocks
  for (let c = 120; c <= 124; c++) {
    grid[9][c] = TileType.BRICK;
    if (c === 122) {
      grid[9][c] = TileType.MYSTERY_FLOWER;
    }
  }

  // Floating rows over extended pit 125-128
  grid[9][126] = TileType.BRICK;
  grid[9][127] = TileType.BRICK;

  // Extended spike platforms over 135-138
  for (let c = 134; c <= 139; c++) {
    grid[10][c] = TileType.BRICK;
    if (c % 2 === 0) {
      grid[7][c] = TileType.COIN_STILL;
    }
  }

  // Staircase facing right
  for (let c = 142; c <= 145; c++) {
    const heightOfStair = Math.min(4, c - 142 + 1);
    for (let h = 0; h < heightOfStair; h++) {
      grid[12 - h][c] = TileType.SOLID_BLOCK;
    }
  }

  // Floating block over extended pit 148-151
  grid[10][149] = TileType.BRICK;
  grid[10][150] = TileType.BRICK;

  // Staircase facing left
  for (let c = 153; c <= 156; c++) {
    const heightOfStair = 4 - (c - 153);
    for (let h = 0; h < heightOfStair; h++) {
      grid[12 - h][c] = TileType.SOLID_BLOCK;
    }
  }

  // End Flagpole (Moved from 108 to 168)
  const flagCol = 168;
  grid[13][flagCol] = TileType.CASTLE_BRICK;
  for (let r = 3; r <= 12; r++) {
    grid[r][flagCol] = TileType.FLAGPOLE;
  }
  grid[3][flagCol] = TileType.FLAG;

  // Castle wall
  for (let c = 173; c <= 179; c++) {
    for (let r = 9; r <= 12; r++) {
      grid[r][c] = TileType.CASTLE_BRICK;
    }
  }
  grid[12][176] = TileType.CASTLE_DOOR;
  grid[11][176] = TileType.CASTLE_DOOR;

  // Spawn entities
  // Friendly Yoshi Mob!
  entities.push({ type: 'yoshi', x: 10 * 32, y: 12 * 32 }); // Spawn Yoshi near start
  entities.push({ type: 'yoshi', x: 115 * 32, y: 12 * 32 }); // Spawn Yoshi before extended area

  entities.push({ type: 'goomba', x: 10 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 18 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 28 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 48 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 67 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 72 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 90 * 32, y: 12 * 32 });

  // Extended area enemies
  entities.push({ type: 'goomba', x: 122 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 131 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 144 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 158 * 32, y: 12 * 32 });

  return {
    id: 'level_2',
    name: '1-2 Underground Cavern',
    theme: 'underworld',
    width,
    height,
    grid,
    timeLimit: 240,
    initialEntities: entities,
    backgroundColor: '#0d0d1e', // Dark cavern background
    musicType: 'underworld',
  };
}

// Build Level 3: Bowser's Castle
function buildLevel3(): LevelData {
  const width = 150;
  const height = 15;
  const grid = createEmptyGrid(width, height);
  const entities: { type: EntityType; x: number; y: number }[] = [];

  // Castle Theme: Lava pits and Castle walls
  for (let c = 0; c < width; c++) {
    const isLava = 
      (c >= 15 && c <= 18) || 
      (c >= 32 && c <= 36) || 
      (c >= 50 && c <= 55) || 
      (c >= 70 && c <= 75) ||
      (c >= 100 && c <= 104) || // New extended lava pit
      (c >= 122 && c <= 126);   // New extended lava pit
    if (!isLava) {
      grid[13][c] = TileType.CASTLE_BRICK;
      grid[14][c] = TileType.LAVA; // lava underneath
    } else {
      grid[13][c] = TileType.LAVA;
      grid[14][c] = TileType.LAVA;
    }
  }

  // Roof
  for (let c = 0; c < width; c++) {
    grid[0][c] = TileType.CASTLE_BRICK;
    grid[1][c] = TileType.CASTLE_BRICK;
  }

  // Fire hazards & stepping stones
  // Stepping stones over first lava pool (15-18)
  grid[10][16] = TileType.CASTLE_BRICK;
  grid[10][17] = TileType.CASTLE_BRICK;

  // Brick platforms
  grid[8][22] = TileType.BRICK;
  grid[8][23] = TileType.MYSTERY_FLOWER;
  grid[8][24] = TileType.BRICK;
  grid[8][25] = TileType.MYSTERY_MUSHROOM;
  grid[8][26] = TileType.BRICK;

  // Floating islands over second lava pool (32-36)
  grid[9][31] = TileType.CASTLE_BRICK;
  grid[7][34] = TileType.CASTLE_BRICK;
  grid[9][37] = TileType.CASTLE_BRICK;

  // Spike drop
  grid[2][42] = TileType.SPIKES;
  grid[2][43] = TileType.SPIKES;
  grid[2][44] = TileType.SPIKES;

  // Tricky jumping stairs over third lava pool (50-55)
  grid[10][49] = TileType.CASTLE_BRICK;
  grid[8][51] = TileType.CASTLE_BRICK;
  grid[8][52] = TileType.CASTLE_BRICK;
  grid[10][54] = TileType.CASTLE_BRICK;

  // Coins in castle
  for (let c = 58; c <= 66; c += 2) {
    grid[6][c] = TileType.COIN_STILL;
  }

  // Single-block jumps over fourth massive lava pool (70-75)
  grid[9][69] = TileType.CASTLE_BRICK;
  grid[8][71] = TileType.CASTLE_BRICK;
  grid[9][73] = TileType.CASTLE_BRICK;
  grid[10][75] = TileType.CASTLE_BRICK;

  // --- Extended Castle Area (Cols 90 to 150) ---
  // Platform over 100-104 lava pit
  grid[9][99] = TileType.CASTLE_BRICK;
  grid[8][101] = TileType.CASTLE_BRICK;
  grid[8][102] = TileType.CASTLE_BRICK;
  grid[9][104] = TileType.CASTLE_BRICK;

  // High bricks with mystery powerup
  grid[8][112] = TileType.BRICK;
  grid[8][113] = TileType.MYSTERY_FLOWER;
  grid[8][114] = TileType.BRICK;

  // Single-block jumps over 122-126 lava pit
  grid[10][121] = TileType.CASTLE_BRICK;
  grid[9][123] = TileType.CASTLE_BRICK;
  grid[8][125] = TileType.CASTLE_BRICK;

  // Floating gold coins
  for (let c = 110; c <= 120; c += 2) {
    grid[6][c] = TileType.COIN_STILL;
  }

  // End flagpole & grand castle gate (Moved from 82 to 140)
  const flagCol = 140;
  grid[13][flagCol] = TileType.CASTLE_BRICK;
  for (let r = 3; r <= 12; r++) {
    grid[r][flagCol] = TileType.FLAGPOLE;
  }
  grid[3][flagCol] = TileType.FLAG;

  // Ultimate victory door
  for (let c = 143; c <= 149; c++) {
    for (let r = 7; r <= 12; r++) {
      grid[r][c] = TileType.CASTLE_BRICK;
    }
  }
  grid[12][145] = TileType.CASTLE_DOOR;
  grid[11][145] = TileType.CASTLE_DOOR;

  // Entities
  // Friendly Yoshi Mob!
  entities.push({ type: 'yoshi', x: 8 * 32, y: 12 * 32 }); // Yoshi near start
  entities.push({ type: 'yoshi', x: 92 * 32, y: 12 * 32 }); // Yoshi near mid checkpoint

  entities.push({ type: 'koopa', x: 12 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 21 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 28 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 45 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 62 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 78 * 32, y: 12 * 32 });

  // Extended area enemies
  entities.push({ type: 'goomba', x: 95 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 108 * 32, y: 12 * 32 });
  entities.push({ type: 'goomba', x: 116 * 32, y: 12 * 32 });
  entities.push({ type: 'koopa', x: 130 * 32, y: 12 * 32 });

  return {
    id: 'level_3',
    name: '1-3 Bowser\'s Castle',
    theme: 'castle',
    width,
    height,
    grid,
    timeLimit: 180,
    initialEntities: entities,
    backgroundColor: '#1b0303', // Intense volcanic dark red
    musicType: 'castle',
  };
}

export const defaultLevels = [buildLevel1(), buildLevel2(), buildLevel3()];
