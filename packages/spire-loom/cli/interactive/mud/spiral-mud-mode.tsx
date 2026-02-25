/**
 * Spiral Navigator MUD Sub-Mode
 * 
 * "Explore the spiral architecture like a dungeon."
 * 
 * A text adventure interface for navigating the spiral graph.
 */

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import type { Dressing } from '../dressing/service.js';
import type { SpiralRing } from '../../../warp/spiral/pattern.js';

interface SpiralMudModeProps {
  dressing: Dressing;
  onExit: () => void;
}

interface HistoryEntry {
  type: 'command' | 'description' | 'error' | 'system' | 'movement';
  content: string;
}

type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down' | 'in' | 'out' | 'n' | 's' | 'e' | 'w' | 'u' | 'd' | 'i' | 'o';

const DIRECTIONS: Record<Direction, { name: string; description: string }> = {
  north: { name: 'North', description: 'spiral outward' },
  n: { name: 'North', description: 'spiral outward' },
  up: { name: 'Up', description: 'spiral outward' },
  u: { name: 'Up', description: 'spiral outward' },
  south: { name: 'South', description: 'spiral inward' },
  s: { name: 'South', description: 'spiral inward' },
  down: { name: 'Down', description: 'spiral inward' },
  d: { name: 'Down', description: 'spiral inward' },
  east: { name: 'East', description: 'next spiraler' },
  e: { name: 'East', description: 'next spiraler' },
  west: { name: 'West', description: 'previous spiraler' },
  w: { name: 'West', description: 'previous spiraler' },
  in: { name: 'In', description: 'enter multiplex' },
  i: { name: 'In', description: 'enter multiplex' },
  out: { name: 'Out', description: 'exit multiplex' },
  o: { name: 'Out', description: 'exit multiplex' },
};

export function SpiralMudMode({ dressing, onExit }: SpiralMudModeProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([
    { type: 'system', content: '🌀 SPIRAL EXPLORER MUD' },
    { type: 'system', content: 'Navigate the architecture like a dungeon.' },
    { type: 'system', content: 'Type "help" for commands or "exit" to leave.' },
    { type: 'description', content: generateOpeningScene(dressing) },
  ]);
  const [location, setLocation] = useState({
    spirals: dressing.spirals.map(s => s.exportName),
    currentIndex: 0,
    depth: 0,
  });

  const addToHistory = useCallback((type: HistoryEntry['type'], content: string) => {
    setHistory(prev => [...prev, { type, content }]);
  }, []);

  const handleNavigation = useCallback((direction: Direction) => {
    const dir = DIRECTIONS[direction];
    
    // Generate movement description
    const movementDesc = generateMovementDescription(direction, location);
    addToHistory('movement', movementDesc);
    
    // Try to navigate
    const newLocation = attemptNavigation(direction, location, dressing);
    
    if (newLocation) {
      setLocation(newLocation);
      const description = generateLocationDescription(newLocation, dressing);
      addToHistory('description', description);
    } else {
      addToHistory('error', `You can't go ${dir.name.toLowerCase()} from here.`);
    }
  }, [location, dressing, addToHistory]);

  const handleCommand = useCallback((cmd: string) => {
    const parts = cmd.toLowerCase().trim().split(/\s+/);
    const verb = parts[0];
    const arg = parts[1];

    if (['go', 'move', 'walk'].includes(verb) && arg && arg in DIRECTIONS) {
      handleNavigation(arg as Direction);
      return;
    }

    if (verb in DIRECTIONS) {
      handleNavigation(verb as Direction);
      return;
    }

    switch (verb) {
      case 'look':
      case 'l':
        addToHistory('description', generateLocationDescription(location, dressing));
        break;
      case 'map':
      case 'm':
        addToHistory('system', generateMap(location, dressing));
        break;
      case 'where':
      case 'location':
        addToHistory('system', `Current: ${location.spirals[location.currentIndex]} (depth: ${location.depth})`);
        break;
      case 'help':
      case 'h':
      case '?':
        addToHistory('system', generateHelp());
        break;
      case 'exit':
      case 'quit':
      case 'q':
      case 'back':
        onExit();
        break;
      default:
        addToHistory('error', `I don't understand "${cmd}". Type "help" for available commands.`);
    }
  }, [location, dressing, handleNavigation, addToHistory, onExit]);

  useInput((value, key) => {
    if (key.return && input.trim()) {
      addToHistory('command', `> ${input}`);
      handleCommand(input);
      setInput('');
    } else if (key.escape) {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Box borderStyle="single" paddingX={1}>
        <Text bold color="cyan">
          🌀 {location.spirals[location.currentIndex] || 'The Void'} | Depth: {location.depth}
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} padding={1} overflow="hidden">
        {history.slice(-15).map((entry, i) => (
          <HistoryLine key={i} entry={entry} />
        ))}
      </Box>

      <Box borderStyle="single" paddingX={1}>
        <Text color="green">{'>'} </Text>
        <TextInput value={input} onChange={setInput} onSubmit={() => {}} />
      </Box>
    </Box>
  );
}

function HistoryLine({ entry }: { entry: HistoryEntry }) {
  const colors: Record<HistoryEntry['type'], string> = {
    command: 'yellow',
    description: 'white',
    error: 'red',
    system: 'dim',
    movement: 'green',
  };

  return (
    <Box>
      <Text color={colors[entry.type]}>{entry.content}</Text>
    </Box>
  );
}

// ============================================================================
// Generative Text Functions
// ============================================================================

function generateOpeningScene(dressing: Dressing): string {
  const spiralCount = dressing.spirals.length;
  
  return `
You stand at the entrance to a vast architectural spiral.
Around you, ${spiralCount} spiral${spiralCount !== 1 ? 's' : ''} twist${spiralCount === 1 ? 's' : ''} upward into the mist,
each one a pathway to generated code.

The air hums with potential. The loom awaits.

Exits: up, in
`;
}

function generateMovementDescription(direction: Direction, location: ReturnType<typeof useState>[0]): string {
  const verbs: Record<string, string[]> = {
    north: ['ascend', 'climb upward', 'rise through the spiral'],
    up: ['ascend', 'climb upward', 'rise through the spiral'],
    south: ['descend', 'climb downward', 'delve deeper'],
    down: ['descend', 'climb downward', 'delve deeper'],
    east: ['walk east', 'move rightward', 'shift across'],
    west: ['walk west', 'move leftward', 'shift across'],
    in: ['step inside', 'enter', 'pass into'],
    out: ['step outside', 'exit', 'emerge from'],
  };

  const dir = DIRECTIONS[direction].name.toLowerCase();
  const verbList = verbs[dir] || ['move'];
  const verb = verbList[Math.floor(Math.random() * verbList.length)];

  const transitions = [
    `You ${verb}...`,
    `Carefully, you ${verb}...`,
    `With determination, you ${verb}...`,
    `The weave shifts as you ${verb}...`,
  ];

  return transitions[Math.floor(Math.random() * transitions.length)];
}

function attemptNavigation(
  direction: Direction,
  location: { spirals: string[]; currentIndex: number; depth: number },
  dressing: Dressing
): { spirals: string[]; currentIndex: number; depth: number } | null {
  const dir = DIRECTIONS[direction];
  
  switch (dir.description) {
    case 'spiral outward':
      if (location.depth < 3) {
        return { ...location, depth: location.depth + 1 };
      }
      return null;
      
    case 'spiral inward':
      if (location.depth > 0) {
        return { ...location, depth: location.depth - 1 };
      }
      return null;
      
    case 'next spiraler':
      if (location.currentIndex < location.spirals.length - 1) {
        return { ...location, currentIndex: location.currentIndex + 1 };
      }
      return null;
      
    case 'previous spiraler':
      if (location.currentIndex > 0) {
        return { ...location, currentIndex: location.currentIndex - 1 };
      }
      return null;
      
    case 'enter multiplex':
      // Would need actual mux detection
      return { ...location, depth: location.depth + 1 };
      
    case 'exit multiplex':
      if (location.depth > 0) {
        return { ...location, depth: location.depth - 1 };
      }
      return null;
      
    default:
      return null;
  }
}

function generateLocationDescription(
  location: { spirals: string[]; currentIndex: number; depth: number },
  dressing: Dressing
): string {
  const spiralName = location.spirals[location.currentIndex] || 'Unknown';
  
  if (location.depth === 0) {
    return `
You stand at the **${spiralName} Core**.
The foundation of the architecture pulses beneath your feet.
Raw ${spiralName.toLowerCase()} energy flows through crystalline structures.

Exits: up, east${location.currentIndex > 0 ? ', west' : ''}
`;
  }
  
  if (location.depth === 1) {
    return `
You ascend to a **wrapping ring** of ${spiralName}.
The patterns here are more abstract, translating core concepts
into platform-ready forms.

Spiralers shimmer around you: android, desktop, tauri...

Exits: up, down, east${location.currentIndex > 0 ? ', west' : ''}
`;
  }
  
  if (location.depth >= 2) {
    return `
You reach the **outer rings** of ${spiralName}.
Here the code is almost fully formed, ready to bloom
into generated files.

The air crackles with compilation energy.

Exits: down, east${location.currentIndex > 0 ? ', west' : ''}
`;
  }
  
  return 'You float in the void between spirals...';
}

function generateMap(location: { spirals: string[]; currentIndex: number; depth: number }, dressing: Dressing): string {
  let map = '🗺️  SPIRAL MAP\n\n';
  
  dressing.spirals.forEach((spiral, i) => {
    const isCurrent = i === location.currentIndex;
    const marker = isCurrent ? '[X]' : '[ ]';
    const depthIndicator = isCurrent ? '←'.repeat(location.depth + 1) : '';
    map += `${marker} ${spiral.exportName} ${depthIndicator}\n`;
  });
  
  map += `\nCurrent depth: ${location.depth}`;
  return map;
}

function generateHelp(): string {
  return `
🌀 SPIRAL EXPLORER HELP

NAVIGATION:
  go north, go up, n, u    - Spiral outward (to wrapping rings)
  go south, go down, s, d  - Spiral inward (to core)
  go east, e               - Next spiraler
  go west, w               - Previous spiraler
  in, i                    - Enter multiplexed spiral
  out, o                   - Exit multiplexed spiral

COMMANDS:
  look, l                  - Examine current location
  map, m                   - Show discovered spiral map
  where                    - Show current position
  help, h, ?               - Show this help
  exit, quit, q            - Exit spiral explorer

The spiral metaphor:
  • UP/NORTH moves to wrapping rings (more abstract)
  • DOWN/SOUTH moves to core (more concrete)
  • The Core is at depth 0 (innermost)
  • Spiralers generate platform-specific code
`;
}
