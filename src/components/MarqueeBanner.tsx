const MarqueeBanner = ({
  items,
  direction = "left",
}: {
  items: string[];
  direction?: "left" | "right";
}) => {
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden bg-primary text-primary-foreground py-2">
      <div className={`flex whitespace-nowrap ${direction === "left" ? "animate-marquee-left" : ""}`}>
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
