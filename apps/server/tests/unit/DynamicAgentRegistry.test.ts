/**
 * DynamicAgentRegistry のユニットテスト
 */

import { DynamicAgentRegistry } from '../../src/dynamic/managers/DynamicAgentRegistry';

// loggerをモック
jest.mock('../../src/dynamic/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('DynamicAgentRegistry', () => {
  let registry: DynamicAgentRegistry;

  beforeEach(() => {
    registry = new DynamicAgentRegistry();
  });

  describe('register', () => {
    it('should register an agent', () => {
      const mockAgent = { id: 'test-agent', name: 'Test Agent' };

      registry.register('test-agent', mockAgent);

      expect(registry.has('test-agent')).toBe(true);
      expect(registry.get('test-agent')).toBe(mockAgent);
    });

    it('should overwrite existing agent with same id', () => {
      const agent1 = { id: 'test-agent', name: 'Agent 1' };
      const agent2 = { id: 'test-agent', name: 'Agent 2' };

      registry.register('test-agent', agent1);
      registry.register('test-agent', agent2);

      expect(registry.get('test-agent')).toBe(agent2);
      expect(registry.size()).toBe(1);
    });
  });

  describe('unregister', () => {
    it('should unregister an existing agent', () => {
      const mockAgent = { id: 'test-agent', name: 'Test Agent' };
      registry.register('test-agent', mockAgent);

      const result = registry.unregister('test-agent');

      expect(result).toBe(true);
      expect(registry.has('test-agent')).toBe(false);
    });

    it('should return false when unregistering non-existent agent', () => {
      const result = registry.unregister('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should return agent when exists', () => {
      const mockAgent = { id: 'test-agent', name: 'Test Agent' };
      registry.register('test-agent', mockAgent);

      const result = registry.get('test-agent');

      expect(result).toBe(mockAgent);
    });

    it('should return undefined when agent does not exist', () => {
      const result = registry.get('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return empty array when no agents registered', () => {
      const result = registry.getAll();

      expect(result).toEqual([]);
    });

    it('should return all registered agents', () => {
      const agent1 = { id: 'agent-1', name: 'Agent 1' };
      const agent2 = { id: 'agent-2', name: 'Agent 2' };
      registry.register('agent-1', agent1);
      registry.register('agent-2', agent2);

      const result = registry.getAll();

      expect(result).toHaveLength(2);
      expect(result).toContain(agent1);
      expect(result).toContain(agent2);
    });
  });

  describe('getAllIds', () => {
    it('should return empty array when no agents registered', () => {
      const result = registry.getAllIds();

      expect(result).toEqual([]);
    });

    it('should return all registered agent IDs', () => {
      registry.register('agent-1', { name: 'Agent 1' });
      registry.register('agent-2', { name: 'Agent 2' });

      const result = registry.getAllIds();

      expect(result).toHaveLength(2);
      expect(result).toContain('agent-1');
      expect(result).toContain('agent-2');
    });
  });

  describe('has', () => {
    it('should return true when agent exists', () => {
      registry.register('test-agent', { name: 'Test' });

      expect(registry.has('test-agent')).toBe(true);
    });

    it('should return false when agent does not exist', () => {
      expect(registry.has('non-existent')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all agents', () => {
      registry.register('agent-1', { name: 'Agent 1' });
      registry.register('agent-2', { name: 'Agent 2' });

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('size', () => {
    it('should return 0 when empty', () => {
      expect(registry.size()).toBe(0);
    });

    it('should return correct count', () => {
      registry.register('agent-1', { name: 'Agent 1' });
      registry.register('agent-2', { name: 'Agent 2' });
      registry.register('agent-3', { name: 'Agent 3' });

      expect(registry.size()).toBe(3);
    });

    it('should decrease after unregister', () => {
      registry.register('agent-1', { name: 'Agent 1' });
      registry.register('agent-2', { name: 'Agent 2' });
      registry.unregister('agent-1');

      expect(registry.size()).toBe(1);
    });
  });
});
