const featuredGames = [
  {
    title: 'Cyber City 2077',
    genres: ['RPG', 'Cyberpunk'],
    price: '199,99 zł',
    discount: '-50%',
    artClass: 'game-card-art--cyber',
  },
  {
    title: 'Elden Knights',
    genres: ['Souls-like', 'Dark Fantasy'],
    price: '249,00 zł',
    artClass: 'game-card-art--forest',
  },
  {
    title: 'Stellar Horizon',
    genres: ['Space', 'Sim'],
    price: '120,00 zł',
    discount: '-20%',
    artClass: 'game-card-art--stellar',
  },
  {
    title: 'Pixel Farm',
    genres: ['Cozy', 'Farming'],
    price: '59,99 zł',
    discount: '-10%',
    artClass: 'game-card-art--pixel',
  },
];

export function HomePage() {
  return (
    <div className="homepage">
      <header className="top-nav">
        <div className="brand">
          <span className="brand-icon">🖥</span>
          <span className="brand-title">
            <strong>co</strong>
            <span>ZAGRAĆ</span>
          </span>
        </div>

        <nav className="menu-links">
          <a href="#">SKLEP</a>
          <a href="#">SPOŁECZNOŚĆ</a>
          <a href="#">CZAT</a>
          <a href="#">POMOC</a>
        </nav>

        <div className="top-actions">
          <label className="search-box" aria-label="Szukaj">
            <input type="search" placeholder="szukaj" />
            <span>🔍</span>
          </label>
          <button type="button" className="login-button">
            ZALOGUJ SIĘ
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-overlay">
          <div className="hero-content">
            <h1>
              ODKRYJ SWOJĄ
              <br />
              NASTĘPNĄ <span>OBSESJĘ</span>
            </h1>
            <p>
              Zaloguj się, aby połączyć swoje konto Steam i otrzymać spersonalizowane rekomendacje
              oparte na Twojej historii gier. Nasz algorytm znajdzie ukryte perełki idealnie dopasowane do
              Ciebie.
            </p>
            <button type="button" className="steam-connect">
              🎮 POŁĄCZ KONTO STEAM
            </button>
            <small>*Bezpieczne logowanie przez OpenID</small>
          </div>
        </div>
      </section>

      <section className="popular-section">
        <div className="popular-header">
          <h2>↗ Popularne i polecane</h2>
          <div className="chips">
            <button type="button" className="chip chip--active">
              Wszystkie
            </button>
            <button type="button" className="chip">
              Wyprzedaż
            </button>
            <button type="button" className="chip">
              Top Sprzedaży
            </button>
          </div>
        </div>

        <div className="games-grid">
          {featuredGames.map((game) => (
            <article key={game.title} className="game-card">
              <div className={`game-card-art ${game.artClass}`}>
                {game.discount && <span className="discount-tag">{game.discount}</span>}
              </div>

              <div className="game-details">
                <h3>{game.title}</h3>
                <div className="game-meta">
                  <div className="game-tags">
                    {game.genres.map((genre) => (
                      <span key={genre}>{genre}</span>
                    ))}
                  </div>
                  <strong>{game.price}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
