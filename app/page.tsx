export default function Home() {
  return (
    <main className="game-page">
      <iframe
        className="game-frame"
        src="/game/index.html"
        title="Verseborn: Episodic JRPG"
        allow="autoplay; fullscreen"
      />
      <noscript>
        <a className="game-fallback" href="/game/index.html">
          Open Verseborn: Episodic JRPG
        </a>
      </noscript>
    </main>
  );
}
