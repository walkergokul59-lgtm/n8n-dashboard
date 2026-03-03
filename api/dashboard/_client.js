import { loadEnv } from '../../server/env.js';
import { N8nClient } from '../../server/n8nClient.js';

export function getN8nClient() {
  const env = loadEnv();
  return new N8nClient(env);
}

