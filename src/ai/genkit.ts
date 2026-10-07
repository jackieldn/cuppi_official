import {genkit, type GenkitErrorCode} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

type Error = {
  code: GenkitErrorCode;
  message: string;
};

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })],
  // Not a great idea to disable all telemetry, but we're doing it here
  // to prevent errors when NextJS hot-reloads.
  // In a real app, you would want to configure this properly.
  telemetry: {
    instrumentation: {
      // openTelemetry: {
      //   instrumentation: {
      //     // Disabling http instrumentation for NextJS compatibility.
      //     // This is probably not a good idea for other environments.
      //     '@opentelemetry/instrumentation-http': {
      //       enabled: false,
      //     },
      //   },
      // },
    },
  },
});
