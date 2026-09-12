import type { EnglishLevel, Topic } from '../types';
const entries: [EnglishLevel, string, string, string[]][] = [
  ['beginner', 'Tell me about your family.', 'Everyday life', ['Who is in your family?', 'What do you enjoy doing together?', 'Describe someone you are close to.']],
  ['beginner', 'Describe your normal day.', 'Everyday life', ['How does your morning begin?', 'What do you do during the day?', 'How do you spend your evening?']],
  ['beginner', 'What is your favourite food?', 'Food & culture', ['What does it taste like?', 'When do you usually eat it?', 'Who makes it for you?']],
  ['beginner', 'Tell me about your hometown.', 'Places', ['What is your town like?', 'What place should a visitor see?', 'What do you like about living there?']],
  ['beginner', 'What did you do yesterday?', 'Personal experience', ['How did your day start?', 'What was one thing you did?', 'How did you feel at the end?']],
  ['beginner', 'What do you like doing on weekends?', 'Everyday life', ['How do you relax?', 'Who do you spend time with?', 'Describe your ideal weekend.']],
  ['beginner', 'Describe a friend you enjoy spending time with.', 'People', ['How did you meet?', 'What is your friend like?', 'What do you do together?']],
  ['beginner', 'Tell me about something you want to learn.', 'Goals', ['What would you like to learn?', 'Why does it interest you?', 'How could you start?']],
  ['intermediate', 'Describe a memorable trip and explain why it was special.', 'Personal experience', ['Where did you go, and with whom?', 'What happened that you still remember?', 'Would you go back? Why?']],
  ['intermediate', 'Would you rather work from home or from an office? Why?', 'Work & life', ['Which setting suits you?', 'What are the challenges?', 'Give a real example.']],
  ['intermediate', 'Tell me about a difficult decision you made.', 'Personal experience', ['What were your options?', 'How did you decide?', 'What did the experience teach you?']],
  ['intermediate', 'Is social media useful or harmful?', 'Ideas & opinions', ['What benefits do you see?', 'What concerns you?', 'How do you use it thoughtfully?']],
  ['intermediate', 'What makes someone a good leader?', 'People', ['Name a quality you value.', 'Describe a leader you admire.', 'How do they help other people?']],
  ['intermediate', 'What skill would you like to learn?', 'Goals', ['Why is this skill useful to you?', 'What might be difficult?', 'What is your first step?']],
  ['intermediate', 'Describe a time you helped someone.', 'Personal experience', ['What did they need?', 'What did you do?', 'How did it turn out?']],
  ['intermediate', 'What makes a city a good place to live?', 'Places', ['What services matter most?', 'How important is community?', 'Use a city you know as an example.']],
  ['advanced', 'Will artificial intelligence create more jobs than it replaces?', 'Technology', ['Explain your position.', 'Consider a different perspective.', 'Give examples and a balanced conclusion.']],
  ['advanced', 'Should social media companies be regulated?', 'Society', ['What problem would regulation address?', 'What are the trade-offs?', 'Propose a practical approach.']],
  ['advanced', 'Is remote work better for society?', 'Work & society', ['Consider workers and employers.', 'Discuss wider social effects.', 'Acknowledge a counterargument.']],
  ['advanced', 'Is technology reducing human interaction?', 'Technology', ['Distinguish quantity from quality.', 'Offer evidence or examples.', 'Suggest how we could find balance.']],
  ['advanced', 'Should university education be free?', 'Education', ['Who benefits?', 'How could it be funded?', 'Address a competing priority.']],
  ['advanced', 'How should cities balance growth and sustainability?', 'Society', ['Name a difficult trade-off.', 'Suggest a realistic policy.', 'Explain how to measure success.']],
];
export const topics: Topic[] = entries.map(([level, text, category, prompts], i) => ({ id: `topic-${i + 1}`, level, text, category, prompts }));
export function chooseTopic(level: EnglishLevel, recentIds: string[] = []): Topic {
  const levelTopics = topics.filter(t => t.level === level);
  const candidates = levelTopics.filter(t => !recentIds.includes(t.id));
  if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
  return [...levelTopics].sort((a, b) => recentIds.indexOf(b.id) - recentIds.indexOf(a.id))[0];
}
