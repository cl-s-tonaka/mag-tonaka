/**
 * バリデーターのユニットテスト
 */

import {
  validateCreateAgentRequest,
  validateUpdateAgentRequest,
} from '../../src/dynamic/api/validators';

describe('validators', () => {
  describe('validateCreateAgentRequest', () => {
    const validRequest = {
      agentId: 'test-agent',
      displayName: 'Test Agent',
      description: 'A test agent',
      instructions: 'Test instructions',
    };

    describe('required fields', () => {
      it('should accept valid request with all required fields', () => {
        const result = validateCreateAgentRequest(validRequest);

        expect(result.agentId).toBe('test-agent');
        expect(result.displayName).toBe('Test Agent');
        expect(result.description).toBe('A test agent');
        expect(result.instructions).toBe('Test instructions');
      });

      it('should throw when agentId is missing', () => {
        const request = { ...validRequest, agentId: undefined };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'agentId is required and must be a string'
        );
      });

      it('should throw when agentId is not a string', () => {
        const request = { ...validRequest, agentId: 123 };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'agentId is required and must be a string'
        );
      });

      it('should throw when agentId contains invalid characters', () => {
        const request = { ...validRequest, agentId: 'test agent!' };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'agentId must contain only alphanumeric characters, hyphens, and underscores'
        );
      });

      it('should accept agentId with hyphens and underscores', () => {
        const request = { ...validRequest, agentId: 'test-agent_123' };

        const result = validateCreateAgentRequest(request);

        expect(result.agentId).toBe('test-agent_123');
      });

      it('should throw when displayName is missing', () => {
        const request = { ...validRequest, displayName: undefined };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'displayName is required and must be a string'
        );
      });

      it('should throw when description is missing', () => {
        const request = { ...validRequest, description: undefined };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'description is required and must be a string'
        );
      });

      it('should throw when instructions is missing', () => {
        const request = { ...validRequest, instructions: undefined };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'instructions are required and must be a string'
        );
      });
    });

    describe('optional fields', () => {
      it('should accept request with model', () => {
        const request = { ...validRequest, model: 'gpt-4' };

        const result = validateCreateAgentRequest(request);

        expect(result.model).toBe('gpt-4');
      });

      it('should throw when model is not a string', () => {
        const request = { ...validRequest, model: 123 };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'model must be a string'
        );
      });

      it('should accept request with tools array', () => {
        const request = {
          ...validRequest,
          tools: [
            {
              name: 'test-tool',
              description: 'A test tool',
              parameters: [
                {
                  name: 'param1',
                  zodType: 'string',
                  description: 'A parameter',
                },
              ],
              implementation: 'return "hello"',
            },
          ],
        };

        const result = validateCreateAgentRequest(request);

        expect(result.tools).toHaveLength(1);
      });

      it('should throw when tools is not an array', () => {
        const request = { ...validRequest, tools: 'not-an-array' };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'tools must be an array'
        );
      });

      it('should throw when testExamples is not an array', () => {
        const request = { ...validRequest, testExamples: 'not-an-array' };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'testExamples must be an array'
        );
      });
    });

    describe('tool validation', () => {
      it('should throw when tool name is missing', () => {
        const request = {
          ...validRequest,
          tools: [
            {
              description: 'A test tool',
              parameters: [],
              implementation: 'return "hello"',
            },
          ],
        };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'Tool name is required and must be a string'
        );
      });

      it('should throw when tool description is missing', () => {
        const request = {
          ...validRequest,
          tools: [
            {
              name: 'test-tool',
              parameters: [],
              implementation: 'return "hello"',
            },
          ],
        };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'Tool description is required and must be a string'
        );
      });

      it('should throw when tool parameters is missing', () => {
        const request = {
          ...validRequest,
          tools: [
            {
              name: 'test-tool',
              description: 'A test tool',
              implementation: 'return "hello"',
            },
          ],
        };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'Tool parameters are required and must be an array'
        );
      });

      it('should throw when tool implementation is missing', () => {
        const request = {
          ...validRequest,
          tools: [
            {
              name: 'test-tool',
              description: 'A test tool',
              parameters: [],
            },
          ],
        };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'Tool implementation is required and must be a string'
        );
      });

      it('should throw when parameter zodType is invalid', () => {
        const request = {
          ...validRequest,
          tools: [
            {
              name: 'test-tool',
              description: 'A test tool',
              parameters: [
                {
                  name: 'param1',
                  zodType: 'invalid-type',
                  description: 'A parameter',
                },
              ],
              implementation: 'return "hello"',
            },
          ],
        };

        expect(() => validateCreateAgentRequest(request)).toThrow(
          'Invalid zodType: invalid-type'
        );
      });

      it('should accept all valid zodTypes', () => {
        const validTypes = ['string', 'number', 'boolean', 'enum', 'object', 'array'];

        for (const zodType of validTypes) {
          const request = {
            ...validRequest,
            tools: [
              {
                name: 'test-tool',
                description: 'A test tool',
                parameters: [
                  {
                    name: 'param1',
                    zodType,
                    description: 'A parameter',
                  },
                ],
                implementation: 'return "hello"',
              },
            ],
          };

          expect(() => validateCreateAgentRequest(request)).not.toThrow();
        }
      });
    });
  });

  describe('validateUpdateAgentRequest', () => {
    it('should return empty object when no fields provided', () => {
      const result = validateUpdateAgentRequest({});

      expect(result).toEqual({});
    });

    it('should accept partial updates', () => {
      const result = validateUpdateAgentRequest({
        displayName: 'Updated Name',
      });

      expect(result).toEqual({ displayName: 'Updated Name' });
    });

    it('should accept all updatable fields', () => {
      const request = {
        displayName: 'Updated Name',
        description: 'Updated description',
        instructions: 'Updated instructions',
        model: 'gpt-4',
        tools: [],
        testExamples: [],
      };

      const result = validateUpdateAgentRequest(request);

      expect(result.displayName).toBe('Updated Name');
      expect(result.description).toBe('Updated description');
      expect(result.instructions).toBe('Updated instructions');
      expect(result.model).toBe('gpt-4');
      expect(result.tools).toEqual([]);
      expect(result.testExamples).toEqual([]);
    });

    it('should throw when displayName is not a string', () => {
      expect(() => validateUpdateAgentRequest({ displayName: 123 })).toThrow(
        'displayName must be a string'
      );
    });

    it('should throw when description is not a string', () => {
      expect(() => validateUpdateAgentRequest({ description: 123 })).toThrow(
        'description must be a string'
      );
    });

    it('should throw when instructions is not a string', () => {
      expect(() => validateUpdateAgentRequest({ instructions: 123 })).toThrow(
        'instructions must be a string'
      );
    });

    it('should throw when model is not a string', () => {
      expect(() => validateUpdateAgentRequest({ model: 123 })).toThrow(
        'model must be a string'
      );
    });

    it('should throw when tools is not an array', () => {
      expect(() => validateUpdateAgentRequest({ tools: 'not-array' })).toThrow(
        'tools must be an array'
      );
    });

    it('should throw when testExamples is not an array', () => {
      expect(() =>
        validateUpdateAgentRequest({ testExamples: 'not-array' })
      ).toThrow('testExamples must be an array');
    });

    it('should validate tools when provided', () => {
      const request = {
        tools: [
          {
            name: 'test-tool',
            // missing required fields
          },
        ],
      };

      expect(() => validateUpdateAgentRequest(request)).toThrow();
    });
  });
});
