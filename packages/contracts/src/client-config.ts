import type { CreateClientConfig } from "./gen/client.gen";

// Every operation speaks JSON. Forcing the JSON parser makes an HTML fallback page
// fail the response validator instead of reaching the app as a successful string.
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  parseAs: "json",
});
