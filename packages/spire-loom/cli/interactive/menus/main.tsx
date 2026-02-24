/**
 * Main Menu for the spire-loom CLI
 * 
 * "The loom presents itself to the weaver."
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TreadleForgeMenu } from './treadle-forge.js';
import { DressingEditor } from '../dressing/editor.js';
import { DressingService, type Dressing } from '../dressing/service.js';
import { MudMode } from '../mud/mode.js';

type MainView = 
  | 'main'
  | 'dressing'
  | 'treadle-forge'
  | 'mud'
  | 'weave-all'
  | 'weave-package'
  | 'watch'
  | 'dependency-graph'
  | 'weaving';

interface MainMenuProps {
  /** Initial workspace root */
  workspaceRoot?: string;
}

export function MainMenu({ workspaceRoot = process.cwd() }: MainMenuProps) {
  const [view, setView] = useState<MainView>('main');
  const [dressing, setDressing] = useState<Dressing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { exit } = useApp();

  // Load the dressing on mount
  useEffect(() => {
    loadDressing();
  }, []);

  async function loadDressing() {
    try {
      const service = new DressingService();
      const loaded = await service.load(workspaceRoot, { mode: 'loose' });
      setDressing(loaded);
      setIsLoading(false);
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  }

  // Handle backspace to go back (must be before conditionals)
  useInput((input, key) => {
    if (key.backspace || key.escape) {
      if (view !== 'main') {
        setView('main');
      } else {
        exit();
      }
    }
  });

  // Loading state
  if (isLoading) {
    return (
      <Box flexDirection="column">
        <Text color="cyan">
          🧵 spire-loom is dressing the loom...
        </Text>
        <Text dimColor>
          Loading configuration from {workspaceRoot}/loom/
        </Text>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>✗ Failed to dress the loom</Text>
        <Box marginTop={1}>
          <Text>{error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press any key to exit</Text>
        </Box>
      </Box>
    );
  }

  // Sub-views
  if (view === 'weaving') {
    return (
      <WeaveView 
        dressing={dressing!}
        packageFilter={undefined}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'dressing') {
    return (
      <DressingEditor 
        workspaceRoot={workspaceRoot}
      />
    );
  }

  if (view === 'treadle-forge') {
    return (
      <TreadleForgeMenu 
        dressing={dressing!}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'mud') {
    return (
      <MudMode
        dressing={dressing!}
        onExit={() => setView('main')}
      />
    );
  }

  // Main menu
  return (
    <MainMenuView 
      dressing={dressing!}
      onSelect={(item) => {
        if (item.value === 'exit') {
          exit();
        } else if (item.value === 'weave-all') {
          setView('weaving');
        } else {
          setView(item.value as MainView);
        }
      }}
    />
  );
}

interface MainMenuViewProps {
  dressing: Dressing;
  onSelect: (item: { label: string; value: string }) => void;
}

function MainMenuView({ dressing, onSelect }: MainMenuViewProps) {
  const items = [
    { 
      label: `🧶 Weave All (${dressing.spirals.length} spirals)`, 
      value: 'weave-all' 
    },
    { 
      label: '📦 Weave Package', 
      value: 'weave-package' 
    },
    { 
      label: '👗 Inspect Dressing', 
      value: 'dressing' 
    },
    { 
      label: `🦶 Treadle Forge (${dressing.treadles.length} custom)`, 
      value: 'treadle-forge' 
    },
    { 
      label: '👁️  Watch Mode', 
      value: 'watch' 
    },
    { 
      label: '🕸️  Dependency Graph', 
      value: 'dependency-graph' 
    },
    { 
      label: '🎮 MUD Mode', 
      value: 'mud' 
    },
    { 
      label: '❌ Exit', 
      value: 'exit' 
    }
  ];

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ╔══════════════════════════════════════╗
        </Text>
      </Box>
      <Box marginBottom={1} justifyContent="center">
        <Text bold color="cyan">
          🧵  spire-loom
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ╚══════════════════════════════════════╝
        </Text>
      </Box>

      {/* Status */}
      <Box marginBottom={1} flexDirection="column">
        <Text dimColor>
          Workspace: <Text color="white">{dressing.workspaceRoot}</Text>
        </Text>
        <Text dimColor>
          Dressing loaded: <Text color="green">{dressing.loadedAt.toLocaleTimeString()}</Text>
        </Text>
      </Box>

      {/* Menu */}
      <Box marginTop={1}>
        <SelectInput items={items} onSelect={onSelect} />
      </Box>

      {/* Help */}
      <Box marginTop={2}>
        <Text dimColor>
          ↑↓ Navigate • Enter Select
        </Text>
      </Box>

      {/* The Dressing Summary */}
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          The Dressing: {' '}
          <Text color="yellow">{dressing.spirals.length}</Text> spirals •{' '}
          <Text color="yellow">{dressing.treadles.length}</Text> treadles •{' '}
          <Text color="yellow">{dressing.bobbins.length}</Text> bobbins
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Weave View Component
 * 
 * Runs the weaver on the loaded dressing.
 */
import { weave } from '../../machinery/weaver.js';

interface WeaveViewProps {
  dressing: Dressing;
  packageFilter?: string;
  onBack: () => void;
}

function WeaveView({ dressing, packageFilter, onBack }: WeaveViewProps) {
  const [status, setStatus] = useState<'running' | 'complete' | 'error'>('running');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle back navigation
  useInput((input, key) => {
    if (key.backspace || key.escape || key.return) {
      onBack();
    }
  });

  // Run weaver on mount
  useEffect(() => {
    async function runWeaver() {
      try {
        // Use the already-loaded WARP module from dressing
        const weaveResult = await weave(dressing.warpModule, {
          workspaceRoot: dressing.workspaceRoot,
          loomDir: dressing.loomPath,
          verbose: true,
          packageFilter,
        });
        
        setResult(weaveResult);
        setStatus('complete');
      } catch (err) {
        setError((err as Error).message);
        setStatus('error');
      }
    }
    runWeaver();
  }, []);

  if (status === 'running') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="cyan">🧵 Weaving...</Text>
        <Text dimColor>Processing {dressing.spirals.length} spirals</Text>
        <Box marginTop={1}>
          <Text color="yellow">⚡</Text>
        </Box>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>✗ Weaving failed</Text>
        <Box marginTop={1}>
          <Text>{error}</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Enter, Backspace, or Escape to go back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text color="green" bold>✅ Weaving complete!</Text>
      
      <Box marginTop={1} flexDirection="column">
        <Text>Files generated: <Text color="green">{result?.filesGenerated || 0}</Text></Text>
        <Text>Files modified: <Text color="yellow">{result?.filesModified || 0}</Text></Text>
        <Text>Files unchanged: <Text color="dim">{result?.filesUnchanged || 0}</Text></Text>
      </Box>

      {result?.errors && result.errors.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text color="red">Errors: {result.errors.length}</Text>
          {result.errors.map((e: any, i: number) => (
            <Text key={i} dimColor>  - {e.message}</Text>
          ))}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Press Enter, Backspace, or Escape to go back</Text>
      </Box>
    </Box>
  );
}

export default MainMenu;
