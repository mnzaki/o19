/**
 * Tests for task name generation in the loom
 * 
 * Task names are now computed by generators, not by heddles.
 * These tests verify that the plan contains the information needed
 * for generators to compute correct task names.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { Heddles } from '../machinery/heddles/pattern-matcher.js';
import { GeneratorMatrix } from '../machinery/heddles/pattern-matcher.js';
import loom from '../warp/index.js';

// Mock generator for testing
async function mockGenerator() {
  return [];
}

describe('task name generation', () => {
  it('provides SpiralOut info for task name computation', () => {
    const matrix = new GeneratorMatrix();
    matrix.setPair('RustAndroidSpiraler', 'RustCore', mockGenerator);
    
    const heddles = new Heddles(matrix);
    
    // Simulate: export const foundframe = loom.spiral(loom.rustCore())
    //           export const android = foundframe.android.foregroundService()
    const foundframeCore = loom.rustCore();
    const foundframe = loom.spiral(foundframeCore);
    const android = foundframe.android.foregroundService({
      gradleNamespace: 'ty.circulari.foundframe',
    });
    
    const warp = {
      foundframe: foundframe as any,
      android: android as any,
    };
    
    const plan = heddles.buildPlan(warp, []);
    
    // Verify there's a SpiralOut node with export name "foundframe"
    const spiralOutNodes = plan.nodesByType.get('SpiralOut') ?? [];
    const foundframeNode = spiralOutNodes.find(n => n.exportName === 'foundframe');
    assert.ok(foundframeNode, 'Should have SpiralOut node with exportName "foundframe"');
    
    // Verify the SpiralOut wraps the RustCore
    assert.strictEqual((foundframeNode.ring as any).inner, foundframeCore,
      'The SpiralOut should wrap the RustCore');
    
    // Find the Android -> RustCore task
    const androidTask = plan.tasks.find(t => 
      t.match[0] === 'RustAndroidSpiraler' && t.match[1] === 'RustCore'
    );
    
    assert.ok(androidTask, 'Should have Android -> RustCore task');
    
    // The task should provide access to the previous node (RustCore)
    // so the generator can look up the wrapping SpiralOut
    assert.strictEqual(androidTask!.previous.ring, foundframeCore,
      'Task previous node should be the RustCore');
  });

  it('handles multiple exports preserving Core identity', () => {
    const matrix = new GeneratorMatrix();
    matrix.setPair('RustAndroidSpiraler', 'RustCore', mockGenerator);
    
    const heddles = new Heddles(matrix);
    
    const foundframeCore = loom.rustCore();
    const foundframe = loom.spiral(foundframeCore);
    const android = foundframe.android.foregroundService({
      gradleNamespace: 'ty.circulari.foundframe',
    });
    
    // Export BOTH foundframe and android
    const warp = {
      foundframe: foundframe as any,
      android: android as any,
    };
    
    const plan = heddles.buildPlan(warp, []);
    
    // Should have exactly ONE task (deduplication should work)
    const androidTasks = plan.tasks.filter(t => 
      t.match[0] === 'RustAndroidSpiraler' && t.match[1] === 'RustCore'
    );
    assert.strictEqual(androidTasks.length, 1, 'Should have exactly one Android task');
    
    // The SpiralOut should have the Core export name, not the platform export name
    const spiralOutNodes = plan.nodesByType.get('SpiralOut') ?? [];
    const coreSpiralOut = spiralOutNodes.find(n => 
      n.exportName === 'foundframe' && (n.ring as any).inner === foundframeCore
    );
    assert.ok(coreSpiralOut, 'Should find Core SpiralOut with exportName "foundframe"');
  });
});
