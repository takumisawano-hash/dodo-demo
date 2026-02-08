// エージェントキャラクター画像マッピング
// GitHub Pages URL直接参照（Expo Web対応）

const BASE_URL = 'https://takumisawano-hash.github.io/dodo-demo/characters';

export const AGENT_IMAGES: Record<string, string> = {
  'diet-coach': `${BASE_URL}/dodo.png`,
  'language-tutor': `${BASE_URL}/polly.png`,
  'habit-coach': `${BASE_URL}/owl.png`,
  'money-coach': `${BASE_URL}/finch.png`,
  'sleep-coach': `${BASE_URL}/koala.png`,
  'mental-coach': `${BASE_URL}/swan.png`,
  'career-coach': `${BASE_URL}/eagle.png`,
  'study-coach': `${BASE_URL}/hawk.png`,
  'fitness-coach': `${BASE_URL}/gorilla.png`,
  'cooking-coach': `${BASE_URL}/chicken.png`,
  'parenting-coach': `${BASE_URL}/pelican.png`,
  'romance-coach': `${BASE_URL}/flamingo.png`,
  'organize-coach': `${BASE_URL}/beaver.png`,
  'time-coach': `${BASE_URL}/hummingbird.png`,
  'digital-coach': `${BASE_URL}/panda.png`,
};

export const getAgentImage = (agentId: string): string | null => {
  return AGENT_IMAGES[agentId] || null;
};
