import { createFileRoute } from "@tanstack/react-router";
import { CakeSortGame } from "@/components/CakeSortGame";

const title = "Cake Sort — Deterministic Slice Puzzle";
const description =
  "A mobile-first cake sorting puzzle with fully predictable chain reactions: place plates, watch slices consolidate, and complete six-piece cakes.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <CakeSortGame />;
}
