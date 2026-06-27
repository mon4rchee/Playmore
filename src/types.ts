export interface InventoryItem {
  name: string;
  icon: string;
  tag?: string;
}

export interface StatusEffect {
  name: string;
  icon: string;
  isExpiring?: boolean;
}

export interface GameState {
  player: {
    name: string;
    emergedClass: string | null;
    stats: {
      strength: number;
      cunning: number;
      charisma: number;
      arcane: number;
    };
    inventory: InventoryItem[];
    statuses: StatusEffect[];
    gold: number;
    health: number;
    maxHealth: number;
    skills: {
      passive: { name: string; description: string; icon: string }[];
      active: { name: string; description: string; icon: string }[];
    };
  };
  world: {
    currentLocation: string;
    visitedLocations: string[];
    timeOfDay: "dawn" | "day" | "dusk" | "night";
    weather: string;
    activeEvents: string[];
  };
  factions: {
    [factionName: string]: number;
  };
  memory: {
    importantChoices: string[];
    knownRumors: string[];
    completedEvents: string[];
  };
  npcs: {
    [npcName: string]: {
      disposition: number;
      lastSeen: string;
      knowsAbout: string[];
    };
  };
}

export interface GameTurnResponse {
  narrative: string;
  messageType?: "good" | "bad" | "neutral";
  updatedState: GameState;
  options: string[];
  icon: string;
}
