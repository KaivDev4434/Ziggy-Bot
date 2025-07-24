import EntityService from '../../../src/services/entityService';
import TestFixtures from '../../fixtures';

describe('EntityService', () => {
  describe('extractEntities', () => {
    it('should extract date entities correctly', async () => {
      const text = "I need to finish this by tomorrow and next week";
      
      const result = await EntityService.extractEntities(text);
      
      expect(result.entities.length).toBeGreaterThan(0);
      
      const dateEntities = result.entities.filter(e => e.type === 'date');
      expect(dateEntities.length).toBeGreaterThanOrEqual(1);
      expect(dateEntities[0].value.toLowerCase()).toMatch(/tomorrow|next week/);
      expect(dateEntities[0].confidence).toBeGreaterThan(0.5);
    });

    it('should extract time entities correctly', async () => {
      const text = "Meeting at 3:30 PM in the morning";
      
      const result = await EntityService.extractEntities(text);
      
      const timeEntities = result.entities.filter(e => e.type === 'time');
      expect(timeEntities.length).toBeGreaterThan(0);
      expect(timeEntities[0].value).toMatch(/3:30|morning/i);
    });

    it('should extract priority entities correctly', async () => {
      const text = "This is urgent and critical for the project";
      
      const result = await EntityService.extractEntities(text);
      
      const priorityEntities = result.entities.filter(e => e.type === 'priority');
      expect(priorityEntities.length).toBeGreaterThan(0);
      expect(priorityEntities[0].value.toLowerCase()).toMatch(/urgent|critical/);
    });

    it('should extract duration entities correctly', async () => {
      const text = "This will take 2 hours or maybe 30 minutes to complete";
      
      const result = await EntityService.extractEntities(text);
      
      const durationEntities = result.entities.filter(e => e.type === 'duration');
      expect(durationEntities.length).toBeGreaterThan(0);
      expect(durationEntities[0].value).toMatch(/2 hours|30 minutes/i);
    });

    it('should extract action entities correctly', async () => {
      const text = "I need to call the client and send an email";
      
      const result = await EntityService.extractEntities(text);
      
      const actionEntities = result.entities.filter(e => e.type === 'task_title');
      expect(actionEntities.length).toBeGreaterThan(0);
      expect(actionEntities[0].value.toLowerCase()).toMatch(/call|send|email/);
    });

    it('should extract person entities correctly', async () => {
      const text = "Meet with John Smith and contact Dr. Johnson";
      
      const result = await EntityService.extractEntities(text);
      
      const personEntities = result.entities.filter(e => e.type === 'person');
      expect(personEntities.length).toBeGreaterThan(0);
      expect(personEntities[0].value).toMatch(/John|Smith|Johnson/);
    });

    it('should extract context entities correctly', async () => {
      const text = "Work on the project at the office for the client";
      
      const result = await EntityService.extractEntities(text);
      
      const contextEntities = result.entities.filter(e => e.type === 'context');
      expect(contextEntities.length).toBeGreaterThan(0);
    });

    it('should remove overlapping entities', async () => {
      const text = "urgent urgent task"; // Intentional duplicate
      
      const result = await EntityService.extractEntities(text);
      
      // Should not have overlapping entities
      const entities = result.entities;
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const entity1 = entities[i];
          const entity2 = entities[j];
          
          // Check for overlap
          const overlap = !(entity1.endIndex <= entity2.startIndex || entity2.endIndex <= entity1.startIndex);
          expect(overlap).toBe(false);
        }
      }
    });

    it('should normalize text by removing entity content', async () => {
      const text = "Call John tomorrow at 3 PM urgent";
      
      const result = await EntityService.extractEntities(text);
      
      expect(result.normalizedText).toBeTruthy();
      expect(result.normalizedText.length).toBeLessThanOrEqual(text.length);
    });

    it('should calculate overall confidence correctly', async () => {
      const text = "Definitely call John tomorrow at 3 PM urgently";
      
      const result = await EntityService.extractEntities(text);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      
      if (result.entities.length > 0) {
        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    it('should handle empty text gracefully', async () => {
      const text = "";
      
      const result = await EntityService.extractEntities(text);
      
      expect(result.entities.length).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.normalizedText).toBe("");
    });

    it('should handle text with no entities', async () => {
      const text = "random gibberish with no meaningful entities";
      
      const result = await EntityService.extractEntities(text);
      
      expect(result.entities.length).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.normalizedText).toBe(text);
    });
  });

  describe('parseDateTime', () => {
    it('should parse relative dates correctly', () => {
      const dateEntity = {
        type: 'date' as const,
        value: 'tomorrow',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 8
      };

      const result = EntityService.parseDateTime(dateEntity);
      
      expect(result).toBeInstanceOf(Date);
      expect(result!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should parse absolute dates correctly', () => {
      const today = new Date();
      const dateString = '2025-12-25';
      
      const dateEntity = {
        type: 'date' as const,
        value: dateString,
        confidence: 0.9,
        startIndex: 0,
        endIndex: dateString.length
      };

      const result = EntityService.parseDateTime(dateEntity);
      
      expect(result).toBeInstanceOf(Date);
      expect(result!.getFullYear()).toBe(2025);
      expect(result!.getMonth()).toBe(11); // December is month 11
      expect(result!.getDate()).toBe(25);
    });

    it('should parse date with time correctly', () => {
      const dateEntity = {
        type: 'date' as const,
        value: 'tomorrow',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 8
      };

      const timeEntity = {
        type: 'time' as const,
        value: '3:30 PM',
        confidence: 0.9,
        startIndex: 9,
        endIndex: 16
      };

      const result = EntityService.parseDateTime(dateEntity, timeEntity);
      
      expect(result).toBeInstanceOf(Date);
      expect(result!.getHours()).toBe(15); // 3 PM in 24-hour format
      expect(result!.getMinutes()).toBe(30);
    });

    it('should handle invalid date gracefully', () => {
      const dateEntity = {
        type: 'date' as const,
        value: 'invalid date string',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 19
      };

      const result = EntityService.parseDateTime(dateEntity);
      
      // Should either return null or a valid date (depending on implementation)
      if (result !== null) {
        expect(result).toBeInstanceOf(Date);
      }
    });

    it('should handle AM/PM time formats correctly', () => {
      const dateEntity = {
        type: 'date' as const,
        value: 'today',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 5
      };

      const timeEntityAM = {
        type: 'time' as const,
        value: '10:30 AM',
        confidence: 0.9,
        startIndex: 6,
        endIndex: 14
      };

      const timeEntityPM = {
        type: 'time' as const,
        value: '10:30 PM',
        confidence: 0.9,
        startIndex: 6,
        endIndex: 14
      };

      const resultAM = EntityService.parseDateTime(dateEntity, timeEntityAM);
      const resultPM = EntityService.parseDateTime(dateEntity, timeEntityPM);
      
      expect(resultAM!.getHours()).toBe(10);
      expect(resultPM!.getHours()).toBe(22);
    });
  });

  describe('parsePriority', () => {
    it('should parse high priority keywords correctly', () => {
      const priorityEntity = {
        type: 'priority' as const,
        value: 'critical',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 8
      };

      const result = EntityService.parsePriority(priorityEntity);
      
      expect(result).toBe(10);
    });

    it('should parse medium priority keywords correctly', () => {
      const priorityEntity = {
        type: 'priority' as const,
        value: 'important',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 9
      };

      const result = EntityService.parsePriority(priorityEntity);
      
      expect(result).toBe(7);
    });

    it('should parse low priority keywords correctly', () => {
      const priorityEntity = {
        type: 'priority' as const,
        value: 'low priority',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 12
      };

      const result = EntityService.parsePriority(priorityEntity);
      
      expect(result).toBe(3);
    });

    it('should return default priority for unknown keywords', () => {
      const priorityEntity = {
        type: 'priority' as const,
        value: 'unknown priority',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 16
      };

      const result = EntityService.parsePriority(priorityEntity);
      
      expect(result).toBe(5); // Default medium priority
    });
  });

  describe('parseDuration', () => {
    it('should parse hour durations correctly', () => {
      const durationEntity = {
        type: 'duration' as const,
        value: '2 hours',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 7
      };

      const result = EntityService.parseDuration(durationEntity);
      
      expect(result).toBe(120); // 2 hours = 120 minutes
    });

    it('should parse minute durations correctly', () => {
      const durationEntity = {
        type: 'duration' as const,
        value: '45 minutes',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 10
      };

      const result = EntityService.parseDuration(durationEntity);
      
      expect(result).toBe(45);
    });

    it('should parse qualitative durations correctly', () => {
      const quickEntity = {
        type: 'duration' as const,
        value: 'quick',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 5
      };

      const longEntity = {
        type: 'duration' as const,
        value: 'long',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 4
      };

      expect(EntityService.parseDuration(quickEntity)).toBe(15);
      expect(EntityService.parseDuration(longEntity)).toBe(120);
    });

    it('should return default duration for unknown values', () => {
      const durationEntity = {
        type: 'duration' as const,
        value: 'unknown duration',
        confidence: 0.9,
        startIndex: 0,
        endIndex: 16
      };

      const result = EntityService.parseDuration(durationEntity);
      
      expect(result).toBe(30); // Default 30 minutes
    });
  });

  describe('performance and edge cases', () => {
    it('should handle very long text efficiently', async () => {
      const longText = "Call John tomorrow at 3 PM urgent ".repeat(100);
      const startTime = Date.now();
      
      const result = await EntityService.extractEntities(longText);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBeLessThan(1000); // Should be reasonably fast
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('should handle special characters correctly', async () => {
      const text = "Call @John #urgent tomorrow at 3:30PM! 100% critical!!!";
      
      const result = await EntityService.extractEntities(text);
      
      expect(result.entities.length).toBeGreaterThan(0);
      // Should still extract entities despite special characters
    });

    it('should maintain entity position accuracy', async () => {
      const text = "Call John tomorrow at 3 PM";
      
      const result = await EntityService.extractEntities(text);
      
      result.entities.forEach(entity => {
        const extractedText = text.substring(entity.startIndex, entity.endIndex);
        expect(entity.value.toLowerCase()).toContain(extractedText.toLowerCase().trim());
      });
    });
  });
}); 