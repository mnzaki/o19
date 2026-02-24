/**
 * MUD Mode
 * 
 * "The weaver speaks, and the loom obeys."
 * 
 * A text-based command interface for spire-loom, inspired by
 * Multi-User Dungeon (MUD) text adventures.
 * 
 * Commands are parsed with fuzzy matching via Fuse.js.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import Fuse from 'fuse.js';
import { type Dressing } from '../dressing/service.js';
import { SpiralMudMode } from './spiral-mud-mode.js';

interface MudModeProps {
  dressing: Dressing;
  onExit: () => void;
}

type SubMode = 'main' | 'spiral-explorer';

interface Command {
  name: string;
  aliases: string[];
  description: string;
  handler: (args: string[], context: MudContext) => string | React.ReactNode;
}

interface MudContext {
  dressing: Dressing;
  history: string[];
}

interface HistoryEntry {
  type: 'input' | 'output' | 'error' | 'system';
  content: string | React.ReactNode;
  timestamp: Date;
}

/**
 * MUD Mode Component.
 * 
 * A text-based command interface for the loom.
 */
export function MudMode({ dressing, onExit }: MudModeProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      type: 'system',
      content: '🎮 MUD Mode — Type "help" for commands or "exit" to leave',
      timestamp: new Date()
    }
  ]);
  const [subMode, setSubMode] = useState<SubMode>('main');
  const { exit } = useApp();

  // Available commands
  const commands: Command[] = [
    {
      name: 'help',
      aliases: ['h', '?', 'commands'],
      description: 'Show available commands',
      handler: () => {
        return `Available commands:
  weave [all|spiral <name>] — Start weaving
  dress [inspect|reload]    — Manage the dressing
  forge treadle [type]      — Create a new treadle
  list [spirals|treadles|bobbins] — List components
  inspect <name>            — Inspect a spiral or treadle
  status                    — Show loom status
  clear                     — Clear the screen
  exit                      — Exit MUD mode
  
You can use fuzzy matching — "w" for "weave", "f t" for "forge treadle", etc.
  
  explore, nav, dungeon     — Enter spiral explorer (text adventure!)`;
      }
    },
    {
      name: 'weave',
      aliases: ['w', 'start', 'begin'],
      description: 'Start the weaving process',
      handler: (args, ctx) => {
        if (args.length === 0 || args[0] === 'all') {
          return `🧵 Starting weave of all ${ctx.dressing.spirals.length} spirals...`;
        }
        if (args[0] === 'spiral' && args[1]) {
          const spiral = ctx.dressing.spirals.find(s => 
            s.exportName.toLowerCase() === args[1].toLowerCase()
          );
          if (spiral) {
            return `🧵 Weaving spiral: ${spiral.exportName}`;
          }
          return `✗ Spiral "${args[1]}" not found`;
        }
        return 'Usage: weave [all|spiral <name>]';
      }
    },
    {
      name: 'dress',
      aliases: ['d', 'config', 'setup'],
      description: 'Manage the dressing',
      handler: (args, ctx) => {
        if (args[0] === 'inspect' || args.length === 0) {
          return `👗 The Dressing:
  Workspace: ${ctx.dressing.workspaceRoot}
  Spirals: ${ctx.dressing.spirals.length}
  Treadles: ${ctx.dressing.treadles.length}
  Bobbins: ${ctx.dressing.bobbins.length}
  Loaded: ${ctx.dressing.loadedAt.toLocaleTimeString()}`;
        }
        if (args[0] === 'reload') {
          return '🔄 Reloading dressing... (not implemented)';
        }
        return 'Usage: dress [inspect|reload]';
      }
    },
    {
      name: 'forge',
      aliases: ['f', 'create', 'make'],
      description: 'Create new loom components',
      handler: (args, ctx) => {
        if (args[0] === 'treadle' || args[0] === 't') {
          const type = args[1] || 'custom';
          return `⚒️  Forging new ${type} treadle... (interactive editor coming soon)`;
        }
        return 'Usage: forge treadle [platform-wrapper|custom]';
      }
    },
    {
      name: 'list',
      aliases: ['ls', 'show', 'dir'],
      description: 'List loom components',
      handler: (args, ctx) => {
        const what = args[0] || 'spirals';
        switch (what) {
          case 'spirals':
          case 'sp':
            return `Spirals:\n${ctx.dressing.spirals.map(s => `  • ${s.exportName} (${(s.metadata ? Object.keys(s.metadata).length : 0)} fields)`).join('\n') || '  (none)'}`;
          case 'treadles':
          case 'tr':
            return `Treadles:\n${ctx.dressing.treadles.map(t => `  • ${t.name} (${t.phase})`).join('\n') || '  (none)'}`;
          case 'bobbins':
          case 'bob':
            return `Bobbins:\n${ctx.dressing.bobbins.map(b => `  • ${b.name} (${b.type})`).join('\n') || '  (none)'}`;
          default:
            return `Unknown list target: ${what}`;
        }
      }
    },
    {
      name: 'inspect',
      aliases: ['i', 'view', 'cat'],
      description: 'Inspect a component',
      handler: (args, ctx) => {
        if (!args[0]) {
          return 'Usage: inspect <spiral-name|treadle-name>';
        }
        const name = args[0];
        const spiral = ctx.dressing.spirals.find(s => s.exportName === name);
        if (spiral) {
          return `📜 Spiral: ${spiral.exportName}
  Core Struct: ${spiral.coreStruct?.name || 'N/A'}
  Integrations: ${spiral.integrations.join(', ') || 'none'}
  Location: ${spiral.location.file}:${spiral.location.line}`;
        }
        const treadle = ctx.dressing.treadles.find(t => t.name === name);
        if (treadle) {
          return `🦶 Treadle: ${treadle.name}
  Phase: ${treadle.phase}
  Path: ${treadle.path}
  Exports: ${treadle.exports.join(', ') || '(none)'}`;
        }
        return `✗ Nothing found with name: ${name}`;
      }
    },
    {
      name: 'status',
      aliases: ['st', 'info'],
      description: 'Show loom status',
      handler: (_args, ctx) => {
        return `🧵 spire-loom status:
  Workspace: ${ctx.dressing.workspaceRoot}
  Dressing: ${ctx.dressing.loomPath}
  Loaded: ${ctx.dressing.loadedAt.toLocaleString()}
  
  Spirals: ${ctx.dressing.spirals.length}
  Links: ${ctx.dressing.links.length}
  Reaches: ${ctx.dressing.reaches.length}
  
  Treadles: ${ctx.dressing.treadles.length}
  Bobbins: ${ctx.dressing.bobbins.length}`;
      }
    },
    {
      name: 'clear',
      aliases: ['cls', 'reset'],
      description: 'Clear the screen',
      handler: () => {
        return { clear: true } as any;
      }
    },
    {
      name: 'explore',
      aliases: ['nav', 'n', 'spiral', 'dungeon'],
      description: 'Enter spiral explorer (text adventure)',
      handler: () => {
        return { explore: true } as any;
      }
    },
    {
      name: 'exit',
      aliases: ['quit', 'q', 'leave', 'back'],
      description: 'Exit MUD mode',
      handler: () => {
        return { exit: true } as any;
      }
    }
  ];

  // Set up fuzzy search
  const fuse = new Fuse(commands, {
    keys: ['name', 'aliases'],
    threshold: 0.4,
    includeScore: true
  });

  function processCommand(input: string) {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Add input to history
    setHistory(prev => [...prev, {
      type: 'input',
      content: `> ${trimmed}`,
      timestamp: new Date()
    }]);

    // Parse command
    const parts = trimmed.split(/\s+/);
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Special case: clear
    if (cmdName === 'clear' || cmdName === 'cls') {
      setHistory([{
        type: 'system',
        content: '🎮 MUD Mode — Type "help" for commands or "exit" to leave',
        timestamp: new Date()
      }]);
      return;
    }

    // Special case: exit
    if (cmdName === 'exit' || cmdName === 'quit' || cmdName === 'q') {
      onExit();
      return;
    }

    // Find command with fuzzy matching
    const results = fuse.search(cmdName);
    
    if (results.length > 0 && results[0].score! < 0.4) {
      const command = results[0].item;
      const context: MudContext = {
        dressing,
        history: history.map(h => h.content as string)
      };

      try {
        const result = command.handler(args, context);
        
        if (typeof result === 'string') {
          setHistory(prev => [...prev, {
            type: 'output',
            content: result,
            timestamp: new Date()
          }]);
        } else if (result && (result as any).exit) {
          onExit();
          return;
        } else if (result && (result as any).explore) {
          setSubMode('spiral-explorer');
          return;
        } else {
          setHistory(prev => [...prev, {
            type: 'output',
            content: result,
            timestamp: new Date()
          }]);
        }
      } catch (err) {
        setHistory(prev => [...prev, {
          type: 'error',
          content: `Error: ${(err as Error).message}`,
          timestamp: new Date()
        }]);
      }
    } else {
      // No matching command
      setHistory(prev => [...prev, {
        type: 'error',
        content: `Unknown command: "${cmdName}". Type "help" for available commands.`,
        timestamp: new Date()
      }]);
    }
  }

  useInput((input, key) => {
    if (key.return) {
      processCommand(input);
      setInput('');
    } else if (key.escape) {
      onExit();
    }
  });

  // Scroll to bottom on history update
  useEffect(() => {
    // In a real terminal, we'd scroll here
  }, [history]);

  // Render sub-mode
  if (subMode === 'spiral-explorer') {
    return (
      <SpiralMudMode 
        dressing={dressing} 
        onExit={() => setSubMode('main')} 
      />
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* History */}
      <Box flexDirection="column" flexGrow={1}>
        {history.slice(-20).map((entry, i) => (
          <Box key={i}>
            {entry.type === 'input' && (
              <Text color="cyan">{entry.content}</Text>
            )}
            {entry.type === 'output' && (
              <Text>{entry.content}</Text>
            )}
            {entry.type === 'error' && (
              <Text color="red">{entry.content}</Text>
            )}
            {entry.type === 'system' && (
              <Text color="yellow" dimColor>{entry.content}</Text>
            )}
          </Box>
        ))}
      </Box>

      {/* Input prompt */}
      <Box marginTop={1}>
        <Text color="green">&gt; </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={(value) => {
            processCommand(value);
            setInput('');
          }}
        />
      </Box>
    </Box>
  );
}

export default MudMode;
