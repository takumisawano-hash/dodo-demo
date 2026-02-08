// Agent Registry - 全15体のエージェント
import * as DietCoach from './diet-coach.js';
import * as LanguageTutor from './language-tutor.js';
import * as HabitCoach from './habit-coach.js';
import * as MoneyCoach from './money-coach.js';
import * as SleepCoach from './sleep-coach.js';
import * as MentalCoach from './mental-coach.js';
import * as CareerCoach from './career-coach.js';
import * as StudyCoach from './study-coach.js';
import * as FitnessCoach from './fitness-coach.js';
import * as CookingCoach from './cooking-coach.js';
import * as ParentingCoach from './parenting-coach.js';
import * as RomanceCoach from './romance-coach.js';
import * as OrganizeCoach from './organize-coach.js';
import * as TimeCoach from './time-coach.js';
import * as DigitalCoach from './digital-coach.js';

export const AGENTS = {
  'diet-coach': DietCoach,
  'language-tutor': LanguageTutor,
  'habit-coach': HabitCoach,
  'money-coach': MoneyCoach,
  'sleep-coach': SleepCoach,
  'mental-coach': MentalCoach,
  'career-coach': CareerCoach,
  'study-coach': StudyCoach,
  'fitness-coach': FitnessCoach,
  'cooking-coach': CookingCoach,
  'parenting-coach': ParentingCoach,
  'romance-coach': RomanceCoach,
  'organize-coach': OrganizeCoach,
  'time-coach': TimeCoach,
  'digital-coach': DigitalCoach,
};

export function getAgent(agentType) {
  return AGENTS[agentType] || null;
}

export function getAgentList() {
  return Object.entries(AGENTS).map(([id, agent]) => ({
    id,
    name: agent.AGENT_NAME,
    emoji: agent.AGENT_EMOJI,
    description: agent.AGENT_DESCRIPTION,
  }));
}

export function isValidAgent(agentType) {
  return agentType in AGENTS;
}

export function getAgentCount() {
  return Object.keys(AGENTS).length;
}
