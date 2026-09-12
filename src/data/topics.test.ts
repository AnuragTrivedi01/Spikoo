import { describe, expect, it } from 'vitest';
import { chooseTopic, topics } from './topics';
describe('curated topics', () => {
  it.each(['beginner','intermediate','advanced'] as const)('chooses the requested %s level without AI', level => { expect(chooseTopic(level).level).toBe(level); });
  it('avoids a recently used topic while alternatives exist', () => { const available = topics.filter(t => t.level === 'beginner'); const excluded = available.slice(1).map(t => t.id); expect(chooseTopic('beginner', excluded).id).toBe(available[0].id); });
  it('chooses least recently used after exhausting a level', () => { const ids = topics.filter(t => t.level === 'advanced').map(t => t.id); expect(chooseTopic('advanced', ids).id).toBe(ids.at(-1)); });
});
