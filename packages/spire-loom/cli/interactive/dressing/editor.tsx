/**
 * Hybrid Dressing Editor
 * 
 * "The weaver sees the true form, edits with precision."
 * 
 * Uses runtime metadata from loaded WARP module,
 * shows diff before applying changes.
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import { 
  type Dressing, 
  type RuntimeSpiral,
  DressingService,
  type DressingChanges
} from './service.js';

type EditorView = 
  | 'loading'
  | 'main-menu'
  | 'inspect-spirals'
  | 'inspect-treadles'
  | 'inspect-bobbins'
  | 'review-changes'
  | 'error';

interface DressingEditorProps {
  workspaceRoot?: string;
}

export function DressingEditor({ workspaceRoot = process.cwd() }: DressingEditorProps) {
  const [view, setView] = useState<EditorView>('loading');
  const [dressing, setDressing] = useState<Dressing | undefined>();
  const [changes, setChanges] = useState<DressingChanges | undefined>();
  const [error, setError] = useState<string | null>(null);
  const { exit } = useApp();

  useEffect(() => {
    loadDressing();
  }, []);

  async function loadDressing() {
    try {
      const service = new DressingService();
      const loaded = await service.load(workspaceRoot, { mode: 'loose' });
      setDressing(loaded);
      
      // Calculate initial diff
      const diff = service.diff(loaded);
      setChanges(diff);
      
      setView('main-menu');
    } catch (err) {
      setError((err as Error).message);
      setView('error');
    }
  }

  useInput((input, key) => {
    if (key.escape || key.backspace) {
      if (view === 'main-menu') {
        exit();
      } else {
        setView('main-menu');
      }
    }
  });

  if (view === 'loading') {
    return (
      <Box flexDirection="column">
        <Text color="yellow">The loom is dressing itself...</Text>
        <Text dimColor>Loading WARP.ts as module...</Text>
      </Box>
    );
  }

  if (view === 'error') {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>✗ The dressing failed to load</Text>
        <Box marginTop={1}><Text>{error}</Text></Box>
        <Box marginTop={1}><Text dimColor>Press Escape to exit</Text></Box>
      </Box>
    );
  }

  if (view === 'main-menu') {
    return <MainMenuView dressing={dressing!} onSelect={setView} />;
  }

  if (view === 'inspect-spirals') {
    return <SpiralInspector dressing={dressing!} onBack={() => setView('main-menu')} />;
  }

  if (view === 'inspect-treadles') {
    return <TreadleInspector dressing={dressing!} onBack={() => setView('main-menu')} />;
  }

  if (view === 'review-changes') {
    return <ChangesReview dressing={dressing!} changes={changes!} onBack={() => setView('main-menu')} />;
  }

  return null;
}

function MainMenuView({ 
  dressing, 
  onSelect 
}: { 
  dressing: Dressing;
  onSelect: (view: EditorView) => void;
}) {
  const items = [
    { label: '🌀 Inspect Spirals', value: 'inspect-spirals' },
    { label: '🦶 Inspect Treadles', value: 'inspect-treadles' },
    { label: '🧶 Inspect Bobbins', value: 'inspect-bobbins' },
    { label: '📋 Review Changes', value: 'review-changes' },
    { label: '❌ Exit', value: 'exit' }
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">👗 The Dressing Editor (Hybrid)</Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text dimColor>Workspace: {dressing.workspaceRoot}</Text>
        <Text dimColor>WARP loaded with {Object.keys(dressing.warpModule).length} exports</Text>
      </Box>

      <Box marginBottom={1}>
        <Text>
          Spirals: <Text color="green">{dressing.spirals.length}</Text>
          {'  '}
          Treadles: <Text color="green">{dressing.treadles.length}</Text>
          {'  '}
          Bobbins: <Text color="green">{dressing.bobbins.length}</Text>
        </Text>
      </Box>

      <SelectInput 
        items={items} 
        onSelect={(item) => {
          if (item.value === 'exit') process.exit(0);
          else onSelect(item.value as EditorView);
        }} 
      />

      <Box marginTop={1}>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    </Box>
  );
}

function SpiralInspector({ 
  dressing, 
  onBack 
}: { 
  dressing: Dressing;
  onBack: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) setSelectedIndex(i => Math.max(0, i - 1));
    else if (key.downArrow) setSelectedIndex(i => Math.min(dressing.spirals.length - 1, i + 1));
    else if (key.escape || key.backspace) onBack();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">🌀 Runtime Spirals (from loaded WARP)</Text>
      </Box>

      {dressing.spirals.map((spiral, i) => (
        <Box key={spiral.exportName}>
          <Text color={i === selectedIndex ? 'green' : undefined}>
            {i === selectedIndex ? '▶ ' : '  '}
            {spiral.exportName}
            <Text dimColor>
              {'  '}integrations: {spiral.integrations.join(', ') || 'none'}
              {spiral.innerRings ? ` (wraps: ${spiral.innerRings.join(', ')})` : ''}
            </Text>
          </Text>
        </Box>
      ))}

      {dressing.spirals.length === 0 && (
        <Text color="yellow">No spirals found in WARP module</Text>
      )}

      <Box marginTop={1}><Text dimColor>Press Esc to go back</Text></Box>
    </Box>
  );
}

function TreadleInspector({ 
  dressing, 
  onBack 
}: { 
  dressing: Dressing;
  onBack: () => void;
}) {
  useInput((input, key) => {
    if (key.escape || key.backspace) onBack();
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">🦶 Treadles</Text>
      </Box>

      {dressing.treadles.map(t => (
        <Box key={t.name}>
          <Text>{t.name} <Text dimColor>({t.phase})</Text></Text>
        </Box>
      ))}

      {dressing.treadles.length === 0 && (
        <Text color="yellow">No custom treadles found</Text>
      )}

      <Box marginTop={1}><Text dimColor>Press Esc to go back</Text></Box>
    </Box>
  );
}

function ChangesReview({ 
  dressing, 
  changes,
  onBack 
}: { 
  dressing: Dressing;
  changes: DressingChanges;
  onBack: () => void;
}) {
  useInput((input, key) => {
    if (key.escape) onBack();
  });

  const hasChanges = 
    changes.spirals.added.length > 0 ||
    changes.spirals.modified.length > 0 ||
    changes.spirals.removed.length > 0;

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">📋 Changes (vs Original)</Text>
      </Box>

      {!hasChanges && (
        <Text color="green">No changes detected</Text>
      )}

      {changes.spirals.added.length > 0 && (
        <Box marginBottom={1}>
          <Text color="green">Added Spirals:</Text>
          {changes.spirals.added.map(s => (
            <Text key={s.exportName}>  + {s.exportName}</Text>
          ))}
        </Box>
      )}

      {changes.spirals.modified.length > 0 && (
        <Box marginBottom={1}>
          <Text color="yellow">Modified Spirals:</Text>
          {changes.spirals.modified.map(m => (
            <Text key={m.to.exportName}>  ~ {m.to.exportName}</Text>
          ))}
        </Box>
      )}

      {changes.spirals.removed.length > 0 && (
        <Box marginBottom={1}>
          <Text color="red">Removed Spirals:</Text>
          {changes.spirals.removed.map(s => (
            <Text key={s.exportName}>  - {s.exportName}</Text>
          ))}
        </Box>
      )}

      <Box marginTop={1}><Text dimColor>Press Esc to go back</Text></Box>
    </Box>
  );
}

export default DressingEditor;
