// What crawlers may fetch on cuppi.co.uk. Everything public is open to everyone, AI crawlers
// included (so Cuppi can be quoted in answers and be part of training data). The one thing
// kept out is /admin.
//
// The AI crawlers are named on purpose. A crawler that finds a group with its own name ignores
// the "*" group, so every group has to repeat the Disallow. Naming them also keeps the intent
// visible: someone tightening the "*" group later will not shut these out by accident.

export const ADMIN_PATH = '/admin';

export const AI_CRAWLERS = [
  // OpenAI: training, search index, and fetches made when a person asks ChatGPT about a page
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic: training, search index, user-triggered fetches
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  // Google: Google-Extended is the control for Gemini training and grounding
  'Google-Extended',
  // Apple Intelligence training
  'Applebot-Extended',
  // Perplexity
  'PerplexityBot',
  'Perplexity-User',
  // Common Crawl, which many models are trained from
  'CCBot',
  // Meta
  'meta-externalagent',
  'FacebookBot',
  // Others
  'Amazonbot',
  'cohere-ai',
  'DuckAssistBot',
  'MistralAI-User',
  'YouBot',
  'Bytespider',
];

export function cuppiRobotsRules() {
  return [
    { userAgent: '*', allow: '/', disallow: ADMIN_PATH },
    { userAgent: AI_CRAWLERS, allow: '/', disallow: ADMIN_PATH },
  ];
}
