export function AnimatedBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(oklch(1 0 0 / 4%) 1px, transparent 1px),
            linear-gradient(90deg, oklch(1 0 0 / 4%) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          animation: "grid-fade 8s ease-in-out infinite",
        }}
      />

      {/* Floating dots */}
      {[
        { left: "15%", top: "20%", delay: "0s", duration: "6s" },
        { left: "75%", top: "30%", delay: "2s", duration: "7s" },
        { left: "45%", top: "60%", delay: "1s", duration: "5s" },
        { left: "85%", top: "70%", delay: "3s", duration: "8s" },
        { left: "25%", top: "80%", delay: "1.5s", duration: "6.5s" },
      ].map((dot, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-muted-foreground/30"
          style={{
            left: dot.left,
            top: dot.top,
            animation: `pulse-dot ${dot.duration} ease-in-out ${dot.delay} infinite, float ${dot.duration} ease-in-out ${dot.delay} infinite`,
          }}
        />
      ))}

      {/* Gradient fade at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
