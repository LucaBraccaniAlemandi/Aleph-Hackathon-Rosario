import { getHealthOptions } from "@repo/contracts/query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(getHealthOptions()),
  component: Home,
  errorComponent: () => <HomeLayout status="unreachable" />,
});

function Home() {
  const { data } = useSuspenseQuery(getHealthOptions());
  return <HomeLayout status={data.status} />;
}

function HomeLayout({ status }: { status: string }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-2 px-6 py-16">
      <h1 className="font-semibold text-3xl">Hackathon App</h1>
      <p className="text-muted">
        API status: <output className="text-primary">{status}</output>
      </p>
    </main>
  );
}
