/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { GameState, GameTurnResponse } from "./types";
import { Send, Loader2 } from "lucide-react";

const INITIAL_STATE: GameState = {
  player: {
    name: "Wanderer",
    emergedClass: null,
    stats: {
      strength: 10,
      cunning: 10,
      charisma: 10,
      arcane: 10,
    },
    inventory: [],
    statuses: [],
    gold: 0,
    health: 100,
    maxHealth: 100,
    skills: {
      passive: [],
      active: [],
    },
  },
  world: {
    currentLocation: "The Crossroads",
    visitedLocations: ["The Crossroads"],
    timeOfDay: "dawn",
    weather: "misty",
    activeEvents: [],
  },
  factions: {},
  memory: {
    importantChoices: [],
    knownRumors: [],
    completedEvents: [],
  },
  npcs: {},
};

type ChatEntry = {
  id: string;
  type: "narrative" | "action";
  text: string;
  icon?: string;
  messageType?: "good" | "bad" | "neutral";
};

function renderNarrative(text: string) {
  // Split by **text** and render as highlighted spans
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const content = part.slice(2, -2);
      return (
        <span key={index} className="text-amber-200 font-semibold drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
          {content}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function getClassColor(className: string): string {
  const colors = [
    "text-emerald-400 border-emerald-900/50 bg-emerald-950/30",
    "text-amber-400 border-amber-900/50 bg-amber-950/30",
    "text-purple-400 border-purple-900/50 bg-purple-950/30",
    "text-blue-400 border-blue-900/50 bg-blue-950/30",
    "text-rose-400 border-rose-900/50 bg-rose-950/30",
    "text-cyan-400 border-cyan-900/50 bg-cyan-950/30",
    "text-fuchsia-400 border-fuchsia-900/50 bg-fuchsia-950/30"
  ];
  let hash = 0;
  for (let i = 0; i < className.length; i++) {
    hash = className.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getLoadingPhrase(action: string): string {
  const lowerAction = action.toLowerCase();
  if (lowerAction.match(/\b(attack|hit|kill|fight|strike|stab|shoot|cast)\b/)) {
    const phrases = ["Preparing to strike...", "Engaging in combat...", "Focusing your energy..."];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  if (lowerAction.match(/\b(go|walk|run|head|enter|leave|move|travel)\b/)) {
    const phrases = ["Making your way...", "Traveling...", "Stepping forward..."];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  if (lowerAction.match(/\b(look|search|investigate|examine|inspect)\b/)) {
    const phrases = ["Searching the area...", "Looking closely...", "Examining your surroundings..."];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  if (lowerAction.match(/\b(take|pick|grab|loot|steal)\b/)) {
    const phrases = ["Reaching out...", "Gathering items...", "Sleight of hand..."];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  if (lowerAction.match(/\b(talk|speak|ask|tell|persuade|intimidate)\b/)) {
    const phrases = ["Choosing your words...", "Observing their reaction...", "Listening carefully..."];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  if (lowerAction.match(/\b(wait|rest|sleep|sit)\b/)) {
    const phrases = ["Time passes...", "Resting...", "Taking a moment..."];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
  const defaultPhrases = ["The world reacts...", "Fate unfolds...", "Considering your action..."];
  return defaultPhrases[Math.floor(Math.random() * defaultPhrases.length)];
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<string[]>([
    "Look around",
    "Check inventory",
    "Wait here",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingType, setLoadingType] = useState<"inline" | "fullscreen">("inline");
  const [loadingText, setLoadingText] = useState("Looking around...");
  const [currentIcon, setCurrentIcon] = useState("lucide:map");
  const [showSidebar, setShowSidebar] = useState(false);
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false);
  const [isLocationsExpanded, setIsLocationsExpanded] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isNamingHero, setIsNamingHero] = useState(false);
  const [heroName, setHeroName] = useState("");
  const [isSelectingTown, setIsSelectingTown] = useState(false);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; message: string; icon?: string; isRead: boolean }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasInitialized = useRef(false);

  const STARTING_TOWNS = [
    { name: "Oakhaven", description: "A quiet village nestled in ancient woods.", icon: "lucide:tree-pine" },
    { name: "Ironforge", description: "A bustling mountain town known for its smiths.", icon: "lucide:anvil" },
    { name: "Silvercove", description: "A coastal settlement with a thriving port.", icon: "lucide:anchor" },
    { name: "Eldoria", description: "A magically imbued city with floating towers.", icon: "lucide:sparkles" },
    { name: "Dustwind", description: "A harsh desert outpost for hardy traders.", icon: "lucide:sun" },
    { name: "Frostford", description: "A frozen village at the edge of the tundra.", icon: "lucide:snowflake" },
    { name: "Glimmerbrook", description: "A peaceful hamlet known for its glowing rivers.", icon: "lucide:droplet" },
    { name: "Ravenwatch", description: "A gloomy citadel overlooking the dark valleys.", icon: "lucide:eye" },
    { name: "Sunreach", description: "A high-altitude monastery town.", icon: "lucide:sun" },
    { name: "Thornbury", description: "A town surrounded by massive thorny vines.", icon: "lucide:leaf" },
    { name: "Stonehaven", description: "An impenetrable fortress city.", icon: "lucide:shield" },
    { name: "Mistwood", description: "A mysterious village hidden in eternal fog.", icon: "lucide:cloud-fog" },
    { name: "Ashbourne", description: "A settlement built near an active volcano.", icon: "lucide:flame" },
    { name: "Starfall", description: "A crater town where a meteor once struck.", icon: "lucide:star" },
    { name: "Windhelm", description: "A city known for its massive windmills.", icon: "lucide:wind" },
    { name: "Briarcliff", description: "A town clinging to the edge of a massive cliff.", icon: "lucide:mountain" },
    { name: "Deepwater", description: "An underground city built on a subterranean lake.", icon: "lucide:waves" },
    { name: "Highmount", description: "A sky-scraping city reachable only by griffon.", icon: "lucide:bird" },
    { name: "Kingswatch", description: "The ancient capital of a fallen empire.", icon: "lucide:crown" },
    { name: "Verdant Vale", description: "A lush, overgrown town bursting with life.", icon: "lucide:flower" }
  ];

  useEffect(() => {
    const savedState = localStorage.getItem("playmore_state");
    const savedHistory = localStorage.getItem("playmore_history");
    const savedNotifications = localStorage.getItem("playmore_notifications");
    if (savedState && savedHistory) {
      setHasSavedGame(true);
    }
  }, []);

  useEffect(() => {
    if (isGameStarted) {
      localStorage.setItem("playmore_state", JSON.stringify(gameState));
      localStorage.setItem("playmore_history", JSON.stringify(history));
      localStorage.setItem("playmore_notifications", JSON.stringify(notifications));
    }
  }, [gameState, history, notifications, isGameStarted]);

  // Initial prompt to start the game
  useEffect(() => {
    // Only handle initialization if we've successfully selected a town and the game has started
    // We pass the town in handleTownSelect now, so we don't automatically dispatch "look around" unless we need to.
  }, [isGameStarted]);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isLoading]);

  const handleAction = async (actionText: string, isInitial = false) => {
    if (!actionText.trim() || isLoading) return;

    const lowerAction = actionText.toLowerCase();
    const isMoving = lowerAction.match(/\b(go|walk|run|head|enter|leave|move|travel)\b/);
    setLoadingType(isMoving ? "fullscreen" : "inline");
    setLoadingText(getLoadingPhrase(actionText));
    setIsLoading(true);
    setInput("");
    
    if (!isInitial) {
      setHistory((prev) => [
        ...prev,
        { id: Date.now().toString(), type: "action", text: actionText },
      ]);
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          state: gameState,
          action: actionText,
          history: history.slice(-10),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data: GameTurnResponse = await response.json();
      
      const newNotes: { id: string; message: string; icon?: string; isRead: boolean }[] = [];
      const newTurnCount = (gameState.player.turnCount || 0) + (isInitial ? 0 : 1);
      
      setGameState(prev => {
        const newState = { ...prev };
        if (data.updatedState) {
          if (data.updatedState.player) {
            newState.player = { ...prev.player, ...data.updatedState.player };
            if (data.updatedState.player.stats) {
              newState.player.stats = { ...prev.player.stats, ...data.updatedState.player.stats };
            }
          }
          if (data.updatedState.world) {
            newState.world = { ...prev.world, ...data.updatedState.world };
          }
        }
        
        newState.player.turnCount = newTurnCount;

        if (newState.player.emergedClass && newState.player.emergedClass !== prev.player.emergedClass) {
          newNotes.push({ id: Date.now() + Math.random().toString(), message: `Class Evolved: ${newState.player.emergedClass}`, icon: "lucide:star", isRead: false });
        }
        const oldActive = prev.player.skills?.active?.length || 0;
        const newActive = newState.player.skills?.active?.length || 0;
        if (newActive > oldActive) {
          const added = newState.player.skills.active[newActive - 1];
          newNotes.push({ id: Date.now() + Math.random().toString(), message: `New Active Skill: ${added.name}`, icon: added.icon || "lucide:swords", isRead: false });
        }
        const oldPassive = prev.player.skills?.passive?.length || 0;
        const newPassive = newState.player.skills?.passive?.length || 0;
        if (newPassive > oldPassive) {
          const added = newState.player.skills.passive[newPassive - 1];
          newNotes.push({ id: Date.now() + Math.random().toString(), message: `New Passive Skill: ${added.name}`, icon: added.icon || "lucide:shield", isRead: false });
        }

        return newState;
      });

      if (newNotes.length > 0) {
        setNotifications(prev => [...prev, ...newNotes]);
      }

      setOptions(data.options || []);
      if (data.icon) setCurrentIcon(data.icon);

      setHistory((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "narrative",
          text: data.narrative,
          icon: data.icon || "lucide:circle",
          messageType: data.messageType || "neutral",
        },
      ]);
    } catch (error) {
      console.error(error);
      setHistory((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          type: "narrative",
          text: "The fabric of reality shimmers. Something went wrong (Server Error).",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    const savedState = localStorage.getItem("playmore_state");
    const savedHistory = localStorage.getItem("playmore_history");
    const savedNotifications = localStorage.getItem("playmore_notifications");
    if (savedState && savedHistory) {
      setGameState(JSON.parse(savedState));
      setHistory(JSON.parse(savedHistory));
      if (savedNotifications) {
        setNotifications(JSON.parse(savedNotifications));
      }
      setIsGameStarted(true);
    }
  };

  const handleNewJourney = () => {
    localStorage.removeItem("playmore_state");
    localStorage.removeItem("playmore_history");
    localStorage.removeItem("playmore_notifications");
    setGameState({
      ...INITIAL_STATE,
      player: {
        ...INITIAL_STATE.player,
        emergedClass: "Traveler",
        turnCount: 0
      }
    });
    setHistory([]);
    setNotifications([]);
    setIsNamingHero(true);
  };

  const handleTownSelect = (townName: string) => {
    setIsSelectingTown(false);
    setIsGameStarted(true);
    handleAction(`Start journey in ${townName}`, true);
  };

  if (!isGameStarted) {
    return (
      <div className="h-[100dvh] w-full bg-neutral-950 flex flex-col relative overflow-hidden font-sans">
        <div className="absolute inset-0 z-0 flex items-center justify-center">
           <div className="w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] rounded-full bg-neutral-900/40 blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        </div>
        
        {isNamingHero ? (
          <div className="z-10 flex flex-col h-full w-full px-4 pt-16 pb-4 max-w-lg mx-auto items-center justify-center">
            <div className="shrink-0 text-center mb-8">
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-100 mb-2">Name Your Hero</h2>
              <p className="text-sm text-neutral-400">Letters only. No numbers or symbols.</p>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const cleanName = heroName.replace(/[^a-zA-Z\s]/g, '').trim();
              if (cleanName.length > 0) {
                setGameState(prev => ({
                  ...prev,
                  player: {
                    ...prev.player,
                    name: cleanName
                  }
                }));
                setIsNamingHero(false);
                setIsSelectingTown(true);
              }
            }} className="w-full flex flex-col gap-4 items-center">
              <input
                type="text"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                placeholder="Enter name..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-6 py-4 text-center text-xl text-neutral-200 placeholder:text-neutral-600 outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700 transition-all"
                autoFocus
                maxLength={20}
              />
              <button
                type="submit"
                disabled={heroName.trim().length === 0}
                className="group px-8 py-3 rounded-full bg-neutral-100 text-neutral-950 font-medium hover:bg-white transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                Continue <Icon icon="lucide:arrow-right" className="group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        ) : isSelectingTown ? (
          <div className="z-10 flex flex-col h-full w-full px-4 pt-8 pb-4 max-w-2xl mx-auto">
            <div className="shrink-0 text-center mb-6">
              <h2 className="text-3xl font-semibold tracking-tight text-neutral-100 mb-2">Choose Origin</h2>
              <p className="text-sm text-neutral-400">Where does your story begin?</p>
            </div>
            
            <div className="flex-1 overflow-y-auto w-full pr-2 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTING_TOWNS.map((town) => (
                  <button
                    key={town.name}
                    onClick={() => handleTownSelect(town.name)}
                    className="bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 transition-all text-left p-4 rounded-2xl flex items-center gap-4 group shrink-0"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-800 group-hover:scale-110 transition-transform">
                      <Icon icon={town.icon} className="w-5 h-5 text-neutral-400 group-hover:text-neutral-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-neutral-200 truncate">{town.name}</h3>
                      <p className="text-xs text-neutral-500 leading-snug line-clamp-2 mt-0.5">{town.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="z-10 flex-1 flex flex-col items-center justify-center gap-12 px-6 text-center max-w-lg mx-auto">
            <div className="flex flex-col items-center gap-6">
              <div className="w-24 h-24 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl">
                <Icon icon="lucide:sparkles" className="w-10 h-10 text-neutral-300" />
              </div>
              <div>
                <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-neutral-100 mb-4">
                  Playmore
                </h1>
                <p className="text-neutral-400 text-lg md:text-xl leading-relaxed">
                  Step into a dynamic world forged by your words.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {hasSavedGame && (
                <button
                  onClick={handleContinue}
                  className="group px-8 py-4 rounded-full bg-neutral-100 text-neutral-950 font-medium hover:bg-white transition-all hover:scale-105 active:scale-95 flex items-center gap-3 text-lg"
                >
                  Continue Journey <Icon icon="lucide:play" className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}
              <button
                onClick={handleNewJourney}
                className={`group px-8 py-4 rounded-full font-medium transition-all hover:scale-105 active:scale-95 flex items-center gap-3 text-lg ${
                  hasSavedGame 
                    ? "bg-transparent text-neutral-400 border border-neutral-700 hover:text-neutral-200 hover:border-neutral-500"
                    : "bg-neutral-100 text-neutral-950 hover:bg-white"
                }`}
              >
                New Journey <Icon icon="lucide:arrow-right" className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-neutral-950 text-neutral-300 font-sans selection:bg-neutral-800 flex overflow-hidden relative">
      {/* Main Game Area */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        <header className="p-4 border-b border-neutral-900 bg-neutral-950/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 text-neutral-400">
              <Icon icon={currentIcon} width="20" height="20" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-widest uppercase text-neutral-200">
                Playmore
              </h1>
              <p className="text-xs text-neutral-500 font-sans uppercase tracking-wider">
                {gameState.world.currentLocation} • {gameState.world.timeOfDay}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative w-8 h-8 flex items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <Icon icon="lucide:bell" width="16" height="16" />
                {notifications.filter(n => !n.isRead).length > 0 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-neutral-950"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute top-full mt-2 right-0 w-72 max-h-96 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
                  <div className="p-3 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/95">
                    <h4 className="text-sm font-medium text-neutral-200">Notifications</h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setNotifications(prev => prev.map(n => ({...n, isRead: true})))}
                        title="Mark all as read"
                        className="text-neutral-500 hover:text-neutral-300"
                      >
                        <Icon icon="lucide:check-check" className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setShowNotifications(false)}
                        title="Close"
                        className="text-neutral-500 hover:text-neutral-300"
                      >
                        <Icon icon="lucide:x" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-neutral-500 text-center py-4">No notifications yet.</p>
                    ) : (
                      [...notifications].reverse().map(note => (
                        <div key={note.id} className={`p-3 rounded-lg text-sm flex gap-3 ${note.isRead ? 'opacity-60 bg-transparent' : 'bg-neutral-800/50 border border-neutral-700/50'}`}>
                          <Icon icon={note.icon || "lucide:info"} className="w-4 h-4 mt-0.5 shrink-0 text-neutral-400" />
                          <p className="text-neutral-300">{note.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowSidebar(true)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors relative"
            >
              <Icon icon="lucide:user" width="16" height="16" />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-neutral-950"></span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 relative">
          {history.map((entry) => (
            <div
              key={entry.id}
              className={`flex flex-col max-w-3xl ${
                entry.type === "action"
                  ? "self-end items-end ml-12"
                  : "self-start items-start mr-12"
              }`}
            >
              {entry.type === "action" ? (
                <div className="px-4 py-2 rounded-2xl rounded-tr-sm bg-neutral-900 text-neutral-300 text-sm md:text-base border border-neutral-800 flex items-center">
                  <span className="opacity-70 mr-2 text-base">👤</span>
                  {entry.text}
                </div>
              ) : (
                <div className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 text-neutral-500 mt-1">
                    <Icon icon={entry.icon || "lucide:message-square"} width="16" />
                  </div>
                  <div className={`prose prose-invert prose-p:leading-relaxed max-w-none text-sm md:text-base pt-1 ${
                    entry.messageType === 'good' ? 'prose-p:text-emerald-300/90' :
                    entry.messageType === 'bad' ? 'prose-p:text-rose-300/90' :
                    'prose-p:text-neutral-300'
                  }`}>
                    <p>{renderNarrative(entry.text)}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && loadingType === "fullscreen" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 text-neutral-400 mb-6 shadow-2xl relative">
                <Loader2 className="w-8 h-8 animate-spin opacity-50" />
                <div className="absolute inset-0 rounded-full border border-neutral-700 animate-ping opacity-20"></div>
              </div>
              <h2 className="text-xl font-medium tracking-widest uppercase text-neutral-200 mb-2 font-sans">
                {loadingText}
              </h2>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-pulse delay-150" />
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 animate-pulse delay-300" />
              </div>
            </div>
          )}
          {isLoading && loadingType === "inline" && (
            <div className="flex gap-4 max-w-3xl self-start">
              <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 text-neutral-500 mt-1">
                <Loader2 className="w-4 h-4 animate-spin opacity-50" />
              </div>
              <div className="flex items-center gap-2 pt-2.5">
                <div className="text-neutral-500 text-sm font-sans animate-pulse">{loadingText}</div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        <footer className="p-4 md:p-6 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent shrink-0">
          <div className="max-w-3xl mx-auto flex flex-col gap-4">
            {!isLoading && options.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(opt)}
                    className="px-4 py-2 rounded-full border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 hover:text-white transition-colors text-xs md:text-sm text-neutral-400"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAction(input);
              }}
              className="relative group flex w-full items-center"
            >
              <div className="absolute left-4 opacity-50 text-sm">👤</div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="What do you do next?"
                disabled={isLoading}
                className="w-full bg-neutral-900/80 border border-neutral-800 rounded-2xl py-4 pl-10 pr-14 outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all text-sm md:text-base placeholder:text-neutral-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 p-2 text-neutral-500 hover:text-white disabled:opacity-50 transition-colors bg-neutral-800 rounded-xl"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </footer>
      </div>

      {/* Mobile Backdrop */}
      {showSidebar && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Sidebar - State */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-4/5 max-w-sm md:w-80 border-l border-neutral-900 bg-neutral-950 p-6 flex flex-col gap-8 shrink-0 overflow-y-auto transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${showSidebar ? "translate-x-0" : "translate-x-full"}`}>
        <button 
          onClick={() => setShowSidebar(false)}
          className="md:hidden absolute top-6 right-6 text-neutral-500 hover:text-white"
        >
          <Icon icon="lucide:x" width="20" height="20" />
        </button>
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap pr-8">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-500 flex items-center gap-2">
              <Icon icon="lucide:user" /> {gameState.player.name}
            </h3>
            {gameState.player.emergedClass && (
              <div className={`px-2 py-0.5 rounded border text-[10px] tracking-wider uppercase font-sans ${getClassColor(gameState.player.emergedClass)}`}>
                {gameState.player.emergedClass}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3">
              <div className="text-neutral-500 text-xs mb-1 font-mono">HP</div>
              <div className="text-rose-400 font-mono">
                {gameState.player.health} / {gameState.player.maxHealth}
              </div>
            </div>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3">
              <div className="text-neutral-500 text-xs mb-1 font-mono">Gold</div>
              <div className="text-amber-400 font-mono flex items-center gap-1">
                <Icon icon="lucide:coins" width="14" /> {gameState.player.gold}
              </div>
            </div>
          </div>
          
          {gameState.player.statuses && gameState.player.statuses.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {gameState.player.statuses.map((status, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${
                    status.isExpiring 
                      ? "animate-pulse border-amber-500/50 bg-amber-950/40 text-amber-200" 
                      : "bg-neutral-900/80 border-neutral-800 text-neutral-300"
                  }`}
                  title={status.name}
                >
                  <Icon icon={status.icon || "lucide:activity"} className={`w-3.5 h-3.5 ${status.isExpiring ? "text-amber-400" : "text-neutral-400"}`} />
                  <span className="font-medium tracking-wide">{status.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-500 mb-4 flex items-center gap-2">
            <Icon icon="lucide:activity" /> Attributes
          </h3>
          <div className="space-y-3">
            {[
              { label: "STR", val: gameState.player.stats.strength },
              { label: "CUN", val: gameState.player.stats.cunning },
              { label: "CHA", val: gameState.player.stats.charisma },
              { label: "ARC", val: gameState.player.stats.arcane },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3 text-sm justify-start">
                <div className="w-8 font-mono text-neutral-500 text-left">{stat.label}</div>
                <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/50 flex justify-start">
                  <div
                    className="h-full bg-neutral-600 rounded-full"
                    style={{ width: `${Math.min((stat.val / 500) * 100, 100)}%` }}
                  />
                </div>
                <div className="w-8 text-right font-mono text-neutral-400">
                  {stat.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {gameState.player.skills && (gameState.player.skills.passive.length > 0 || gameState.player.skills.active.length > 0) && (
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-500 mb-4 flex items-center gap-2">
              <Icon icon="lucide:swords" /> Skills
            </h3>
            <div className="space-y-4">
              {gameState.player.skills.active.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase text-neutral-600 mb-2 font-semibold">Active</h4>
                  <ul className="space-y-2">
                    {gameState.player.skills.active.map((skill, i) => (
                      <li key={i} className="text-sm flex flex-col bg-neutral-900/40 p-2 rounded-md border border-neutral-800/50">
                        <div className="flex items-center gap-2 text-rose-300">
                          <Icon icon={skill.icon || "game-icons:pointy-sword"} className="w-4 h-4" />
                          <span className="font-medium">{skill.name}</span>
                        </div>
                        <span className="text-xs text-neutral-500 mt-1">{skill.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {gameState.player.skills.passive.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase text-neutral-600 mb-2 font-semibold">Passive</h4>
                  <ul className="space-y-2">
                    {gameState.player.skills.passive.map((skill, i) => (
                      <li key={i} className="text-sm flex flex-col bg-neutral-900/40 p-2 rounded-md border border-neutral-800/50">
                        <div className="flex items-center gap-2 text-emerald-300">
                          <Icon icon={skill.icon || "game-icons:armor-vest"} className="w-4 h-4" />
                          <span className="font-medium">{skill.name}</span>
                        </div>
                        <span className="text-xs text-neutral-500 mt-1">{skill.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState.player.inventory.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-500 mb-4 flex items-center gap-2">
              <Icon icon="lucide:backpack" /> Inventory
            </h3>
            <ul className="space-y-2">
              {(isInventoryExpanded ? gameState.player.inventory : gameState.player.inventory.slice(0, 5)).map((item, i) => (
                <li
                  key={i}
                  className="text-sm text-neutral-400 flex items-center justify-between bg-neutral-900/30 p-2 rounded-md border border-neutral-800/50"
                >
                  <div className="flex items-center gap-3">
                    <Icon icon={item.icon || "game-icons:swap-bag"} className="text-neutral-500 w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                  {item.tag && (
                    <span className="text-[10px] tracking-wider uppercase bg-neutral-900/80 px-1.5 py-0.5 rounded text-neutral-500 font-mono">
                      {item.tag}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {gameState.player.inventory.length > 5 && (
              <button
                onClick={() => setIsInventoryExpanded(!isInventoryExpanded)}
                className="mt-3 w-full py-2 text-xs font-medium tracking-wide uppercase text-neutral-500 hover:text-neutral-300 bg-neutral-900/30 hover:bg-neutral-900/50 rounded-md border border-neutral-800 transition-colors"
              >
                {isInventoryExpanded ? "Show Less" : `Show All (${gameState.player.inventory.length})`}
              </button>
            )}
          </div>
        )}

        {gameState.world.visitedLocations && gameState.world.visitedLocations.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-500 mb-4 flex items-center gap-2">
              <Icon icon="lucide:footprints" /> Journey
            </h3>
            <div className="relative pl-3 border-l border-neutral-800 space-y-4">
              {(isLocationsExpanded ? [...gameState.world.visitedLocations].reverse() : [...gameState.world.visitedLocations].reverse().slice(0, 5)).map((loc, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-[17px] top-1.5 w-2 h-2 rounded-full ${i === 0 ? "bg-neutral-200" : "bg-neutral-700"} ring-4 ring-neutral-950`} />
                  <div className={`text-sm ${i === 0 ? "text-neutral-200 font-medium" : "text-neutral-500"}`}>
                    {loc}
                  </div>
                </div>
              ))}
            </div>
            {gameState.world.visitedLocations.length > 5 && (
              <button
                onClick={() => setIsLocationsExpanded(!isLocationsExpanded)}
                className="mt-3 w-full py-2 text-xs font-medium tracking-wide uppercase text-neutral-500 hover:text-neutral-300 bg-neutral-900/30 hover:bg-neutral-900/50 rounded-md border border-neutral-800 transition-colors"
              >
                {isLocationsExpanded ? "Collapse Journey" : `View Full Journey (${gameState.world.visitedLocations.length})`}
              </button>
            )}
          </div>
        )}

        {Object.entries(gameState.factions).length > 0 && (
          <div>
            <h3 className="text-xs font-semibold tracking-widest uppercase text-neutral-500 mb-4 flex items-center gap-2">
              <Icon icon="lucide:flag" /> Factions
            </h3>
            <div className="space-y-3">
              {Object.entries(gameState.factions).map(([faction, rep]) => {
                const repVal = rep as number;
                return (
                  <div key={faction} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">{faction}</span>
                    <span
                      className={`font-mono ${
                        repVal > 0
                          ? "text-emerald-400"
                          : repVal < 0
                          ? "text-rose-400"
                          : "text-neutral-500"
                      }`}
                    >
                      {repVal > 0 ? "+" : ""}
                      {repVal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
