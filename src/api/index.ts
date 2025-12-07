import { User, LeaderboardEntry, ActivePlayer, ApiResponse, GameMode } from '@/types/game';
import { mockUsers, mockLeaderboard, mockActivePlayers, generateRandomFood } from './mockData';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Session storage key
const SESSION_KEY = 'snake_game_session';

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// ============ AUTH API ============

export const authApi = {
  async login(email: string, password: string): Promise<ApiResponse<User>> {
    await delay(500);
    
    const user = Array.from(mockUsers.values()).find(
      u => u.email === email && u.password === password
    );
    
    if (!user) {
      return { data: null, error: 'Invalid email or password', success: false };
    }
    
    const { password: _, ...userData } = user;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    
    return { data: userData, error: null, success: true };
  },

  async signup(username: string, email: string, password: string): Promise<ApiResponse<User>> {
    await delay(500);
    
    const existingUser = Array.from(mockUsers.values()).find(u => u.email === email);
    if (existingUser) {
      return { data: null, error: 'Email already registered', success: false };
    }
    
    const existingUsername = Array.from(mockUsers.values()).find(u => u.username === username);
    if (existingUsername) {
      return { data: null, error: 'Username already taken', success: false };
    }
    
    const newUser: User & { password: string } = {
      id: generateId(),
      username,
      email,
      password,
      createdAt: new Date().toISOString(),
    };
    
    mockUsers.set(newUser.id, newUser);
    
    const { password: _, ...userData } = newUser;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    
    return { data: userData, error: null, success: true };
  },

  async logout(): Promise<ApiResponse<null>> {
    await delay(200);
    sessionStorage.removeItem(SESSION_KEY);
    return { data: null, error: null, success: true };
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    await delay(100);
    
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!session) {
      return { data: null, error: 'Not authenticated', success: false };
    }
    
    try {
      const user = JSON.parse(session) as User;
      return { data: user, error: null, success: true };
    } catch {
      return { data: null, error: 'Invalid session', success: false };
    }
  },
};

// ============ LEADERBOARD API ============

export const leaderboardApi = {
  async getLeaderboard(mode?: GameMode): Promise<ApiResponse<LeaderboardEntry[]>> {
    await delay(300);
    
    let entries = [...mockLeaderboard];
    
    if (mode) {
      entries = entries.filter(e => e.mode === mode);
    }
    
    entries.sort((a, b) => b.score - a.score);
    
    return { data: entries, error: null, success: true };
  },

  async submitScore(username: string, score: number, mode: GameMode): Promise<ApiResponse<LeaderboardEntry>> {
    await delay(400);
    
    const newEntry: LeaderboardEntry = {
      id: generateId(),
      username,
      score,
      mode,
      createdAt: new Date().toISOString(),
    };
    
    mockLeaderboard.push(newEntry);
    mockLeaderboard.sort((a, b) => b.score - a.score);
    
    return { data: newEntry, error: null, success: true };
  },
};

// ============ WATCH API (Live Players) ============

// Store for simulated active players
let activePlayersState = JSON.parse(JSON.stringify(mockActivePlayers)) as ActivePlayer[];

// Simulate player movements
const simulatePlayerMove = (player: ActivePlayer): ActivePlayer => {
  const gridSize = 20;
  const head = player.snake[0];
  let newHead = { ...head };
  
  // Random direction change (10% chance)
  if (Math.random() < 0.1) {
    const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const;
    const currentIdx = directions.indexOf(player.direction as typeof directions[number]);
    const validDirections = directions.filter((_, idx) => Math.abs(idx - currentIdx) !== 2);
    player.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
  }
  
  // Move based on direction
  switch (player.direction) {
    case 'UP':
      newHead.y = player.mode === 'pass-through' 
        ? (head.y - 1 + gridSize) % gridSize 
        : head.y - 1;
      break;
    case 'DOWN':
      newHead.y = player.mode === 'pass-through' 
        ? (head.y + 1) % gridSize 
        : head.y + 1;
      break;
    case 'LEFT':
      newHead.x = player.mode === 'pass-through' 
        ? (head.x - 1 + gridSize) % gridSize 
        : head.x - 1;
      break;
    case 'RIGHT':
      newHead.x = player.mode === 'pass-through' 
        ? (head.x + 1) % gridSize 
        : head.x + 1;
      break;
  }
  
  // Check wall collision in walls mode
  if (player.mode === 'walls' && (newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize)) {
    // Reset player
    return {
      ...player,
      snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
      score: 0,
      food: generateRandomFood(gridSize, []),
      direction: 'RIGHT',
    };
  }
  
  // Check self collision
  if (player.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
    // Reset player
    return {
      ...player,
      snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
      score: 0,
      food: generateRandomFood(gridSize, []),
      direction: 'RIGHT',
    };
  }
  
  const newSnake = [newHead, ...player.snake];
  
  // Check food collision
  if (newHead.x === player.food.x && newHead.y === player.food.y) {
    return {
      ...player,
      snake: newSnake,
      score: player.score + 10,
      food: generateRandomFood(gridSize, newSnake),
    };
  }
  
  newSnake.pop();
  return { ...player, snake: newSnake };
};

export const watchApi = {
  async getActivePlayers(): Promise<ApiResponse<ActivePlayer[]>> {
    await delay(200);
    return { data: activePlayersState, error: null, success: true };
  },

  async getPlayerById(playerId: string): Promise<ApiResponse<ActivePlayer>> {
    await delay(100);
    
    const player = activePlayersState.find(p => p.id === playerId);
    if (!player) {
      return { data: null, error: 'Player not found', success: false };
    }
    
    return { data: player, error: null, success: true };
  },

  // Call this to simulate game ticks for active players
  simulateTick(): void {
    activePlayersState = activePlayersState.map(simulatePlayerMove);
  },

  // Subscribe to player updates (returns unsubscribe function)
  subscribeToPlayer(playerId: string, callback: (player: ActivePlayer) => void): () => void {
    const intervalId = setInterval(() => {
      const player = activePlayersState.find(p => p.id === playerId);
      if (player) {
        callback(player);
      }
    }, 150);
    
    return () => clearInterval(intervalId);
  },
};

// Start simulation
setInterval(() => {
  watchApi.simulateTick();
}, 150);
