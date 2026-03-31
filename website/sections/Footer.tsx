export function Footer() {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="font-bold text-foreground">0ma</span>
          <span>Open-source container management for macOS</span>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/chenhunghan/0ma"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://github.com/chenhunghan/0ma/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Download
          </a>
          <span className="text-muted-foreground/50">MIT / Apache-2.0</span>
        </div>
      </div>
    </footer>
  );
}
