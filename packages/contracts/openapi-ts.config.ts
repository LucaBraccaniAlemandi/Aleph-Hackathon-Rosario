import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi.yaml",
  output: "./src/gen",
  plugins: [
    {
      name: "@hey-api/client-fetch",
      runtimeConfigPath: "./src/client-config.ts",
    },
    "zod",
    { name: "@hey-api/sdk", validator: true },
    "@tanstack/react-query",
  ],
});
