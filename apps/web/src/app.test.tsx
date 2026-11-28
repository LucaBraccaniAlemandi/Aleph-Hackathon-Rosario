import { client } from "@repo/contracts/client";
import { createMemoryHistory } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import { App } from "./app";
import { createAppRouter } from "./router";

beforeAll(() => {
  // Node's Request rejects the relative "/api" base that browsers resolve against the page origin.
  client.setConfig({ baseUrl: "http://localhost/api" });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  const router = createAppRouter(
    undefined,
    createMemoryHistory({ initialEntries: [path] }),
  );
  render(<App router={router} />);
}

function stubHealthResponse(response: Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response),
  );
}

test("home shows the API health status", async () => {
  stubHealthResponse(Response.json({ status: "ok" }));
  renderAt("/");
  expect(await screen.findByText("ok")).toBeTruthy();
});

test("home reports an unreachable API when the response breaks the contract", async () => {
  stubHealthResponse(
    new Response("<!doctype html>", {
      headers: { "content-type": "text/html" },
    }),
  );
  renderAt("/");
  expect(await screen.findByText("unreachable")).toBeTruthy();
});
