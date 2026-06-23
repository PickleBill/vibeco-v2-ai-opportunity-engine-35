import { useSearchParams } from "react-router-dom";

const variants = ["a", "b", "c"] as const;

const VariantSwitcher = () => {
  const isDev =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("lovable.app") ||
      window.location.hostname === "localhost");

  const [searchParams] = useSearchParams();

  if (!isDev) return null;

  const current =
    localStorage.getItem("variant:hero") ??
    searchParams.get("variant") ??
    "a";

  const switchTo = (v: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", v);
    window.location.href = url.toString();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full bg-background/80 backdrop-blur border border-border/50 px-2 py-1 shadow-lg">
      <span className="text-[10px] text-muted-foreground mr-1 uppercase tracking-wider">
        Hero
      </span>
      {variants.map((v) => (
        <button
          key={v}
          onClick={() => switchTo(v)}
          className={`text-xs w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
            current === v
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

export default VariantSwitcher;
