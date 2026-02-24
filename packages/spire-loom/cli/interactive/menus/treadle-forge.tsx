/**
 * Treadle Forge Menu
 * 
 * "Where new treadles are forged from the weaver's need."
 * 
 * A submenu for creating and editing custom treadles (generators).
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { type Dressing, type DiscoveredTreadle } from '../dressing/service.js';

type ForgeView = 
  | 'main'
  | 'platform-wrapper'
  | 'custom-treadle'
  | 'edit-treadle'
  | 'list-treadles';

interface TreadleForgeMenuProps {
  dressing: Dressing;
  onBack: () => void;
}

export function TreadleForgeMenu({ dressing, onBack }: TreadleForgeMenuProps) {
  const [view, setView] = useState<ForgeView>('main');
  const [selectedTreadle, setSelectedTreadle] = useState<DiscoveredTreadle | null>(null);

  // Handle global back navigation
  useInput((input, key) => {
    if (key.escape || key.backspace) {
      if (view === 'main') {
        onBack();
      } else {
        setView('main');
      }
    }
  });

  // Sub-views
  if (view === 'platform-wrapper') {
    return (
      <PlatformWrapperEditor
        dressing={dressing}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'custom-treadle') {
    return (
      <CustomTreadleEditor
        dressing={dressing}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'edit-treadle') {
    return (
      <EditTreadleEditor
        treadle={selectedTreadle!}
        onBack={() => setView('list-treadles')}
      />
    );
  }

  if (view === 'list-treadles') {
    return (
      <TreadleList
        treadles={dressing.treadles}
        onSelect={(treadle) => {
          setSelectedTreadle(treadle);
          setView('edit-treadle');
        }}
        onBack={() => setView('main')}
      />
    );
  }

  // Main forge menu
  const items = [
    {
      label: '📱 Forge Platform Wrapper Treadle',
      value: 'platform-wrapper'
    },
    {
      label: '⚒️  Forge Custom Treadle',
      value: 'custom-treadle'
    },
    {
      label: `📝 Edit Existing Treadles (${dressing.treadles.length})`,
      value: 'list-treadles'
    },
    {
      label: '↩️  Back to Main Menu',
      value: 'back'
    }
  ];

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">
          ⚒️  The Treadle Forge
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          Create custom generators for your loom.
        </Text>
      </Box>

      <SelectInput 
        items={items} 
        onSelect={(item) => {
          if (item.value === 'back') {
            onBack();
          } else {
            setView(item.value as ForgeView);
          }
        }} 
      />

      <Box marginTop={1}>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    </Box>
  );
}

/**
 * Platform Wrapper Treadle Editor.
 * 
 * Interactive form for creating a new platform wrapper treadle.
 */
function PlatformWrapperEditor({
  dressing,
  onBack
}: {
  dressing: Dressing;
  onBack: () => void;
}) {
  const [step, setStep] = useState<'name' | 'platform' | 'confirm'>('name');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState<'android' | 'ios' | 'desktop' | 'web'>('android');

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">📱 Platform Wrapper Treadle</Text>
      </Box>

      {step === 'name' && (
        <Box flexDirection="column">
          <Text>Enter treadle name:</Text>
          <Text dimColor>(e.g., MyApiWrapper)</Text>
          <Box marginTop={1}>
            <Text color="cyan">&gt; {name}</Text>
          </Box>
        </Box>
      )}

      {step === 'platform' && (
        <Box flexDirection="column">
          <Text>Select target platform:</Text>
          <SelectInput
            items={[
              { label: '🤖 Android', value: 'android' },
              { label: '🍎 iOS', value: 'ios' },
              { label: '🖥️  Desktop', value: 'desktop' },
              { label: '🌐 Web', value: 'web' }
            ]}
            onSelect={(item) => {
              setPlatform(item.value as typeof platform);
              setStep('confirm');
            }}
          />
        </Box>
      )}

      {step === 'confirm' && (
        <Box flexDirection="column">
          <Text bold>Preview:</Text>
          <Box borderStyle="single" padding={1} marginY={1}>
            <Text dimColor>
              {`// ${name}.ts
// Platform Wrapper Treadle for ${platform}

import { definePlatformWrapperTreadle } from 'spire-loom/machinery';

export default definePlatformWrapperTreadle({
  name: '${name}',
  platform: '${platform}',
  // Configuration will go here
});`}
            </Text>
          </Box>
          <Text>Write to loom/treadles/{name}.ts?</Text>
          <SelectInput
            items={[
              { label: '✅ Yes, forge it!', value: 'yes' },
              { label: '❌ Cancel', value: 'no' }
            ]}
            onSelect={(item) => {
              if (item.value === 'yes') {
                // TODO: Actually write the file
              }
              onBack();
            }}
          />
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>Press Esc to cancel</Text>
      </Box>
    </Box>
  );
}

/**
 * Custom Treadle Editor.
 * 
 * For creating completely custom treadles from scratch.
 */
function CustomTreadleEditor({
  dressing,
  onBack
}: {
  dressing: Dressing;
  onBack: () => void;
}) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">⚒️  Custom Treadle Editor</Text>
      </Box>

      <Text dimColor>
        Custom treadle creation coming soon...
      </Text>

      <Box marginTop={1}>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    </Box>
  );
}

/**
 * List of existing treadles.
 */
function TreadleList({
  treadles,
  onSelect,
  onBack
}: {
  treadles: DiscoveredTreadle[];
  onSelect: (treadle: DiscoveredTreadle) => void;
  onBack: () => void;
}) {
  if (treadles.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Text bold color="yellow">📝 Existing Treadles</Text>
        </Box>
        <Text color="yellow">
          No custom treadles found in loom/treadles/
        </Text>
        <Text dimColor>
          Forge a new treadle to get started.
        </Text>
        <Box marginTop={1}>
          <Text dimColor>Press Esc to go back</Text>
        </Box>
      </Box>
    );
  }

  // Create a map for looking up treadles by name
  const treadleMap = new Map(treadles.map(t => [t.name, t]));
  
  const items = treadles.map(t => ({
    label: `${t.name} (${t.phase})`,
    value: t.name
  }));

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">📝 Existing Treadles</Text>
      </Box>

      <SelectInput
        items={items}
        onSelect={(item) => {
          const treadle = treadleMap.get(item.value);
          if (treadle) onSelect(treadle);
        }}
      />

      <Box marginTop={1}>
        <Text dimColor>Press Esc to go back</Text>
      </Box>
    </Box>
  );
}

/**
 * Edit Treadle Editor.
 * 
 * For editing an existing treadle.
 */
function EditTreadleEditor({
  treadle,
  onBack
}: {
  treadle: DiscoveredTreadle;
  onBack: () => void;
}) {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">📝 Editing: {treadle.name}</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>Path: {treadle.path}</Text>
        <Text dimColor>Phase: {treadle.phase}</Text>
        <Text dimColor>Exports: {treadle.exports.join(', ') || 'none'}</Text>
      </Box>

      <Box borderStyle="single" padding={1}>
        <Text dimColor>
          {treadle.source.substring(0, 500)}
          {treadle.source.length > 500 ? '...' : ''}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Full editor coming soon... Press Esc to go back</Text>
      </Box>
    </Box>
  );
}

export default TreadleForgeMenu;
