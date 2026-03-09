const MarqueeBanner = ({
  items,
  direction = "left",
}: {
  items: string[];
  direction?: "left" | "right";
}) => {
  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-x-clip bg-primary py-2 text-primary-foreground">
      <div className={`flex min-w-max whitespace-nowrap ${direction === "left" ? "animate-marquee-left" : ""}`}>
        {doubled.map((item, i) => (
          <span key={i} className="mx-8 text-xs font-medium uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-primary-foreground/50 shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeBanner;
