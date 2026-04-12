export function HomePage() {
  return (
    <div className="hero">
      <div className="hero__overlay"></div>

      <div className="hero__content">
        <h1 className="hero__title">
          ODKRYJ SWOJĄ <br />
          NASTĘPNĄ <span>OBSESJĘ</span>
        </h1>

        <p className="hero__desc">
          Zaloguj się, aby połączyć swoje konto Steam i otrzymać spersonalizowane rekomendacje
          oparte na Twojej historii gier. Nasz algorytm znajdzie ukryte perełki idealnie dopasowane
          do Ciebie.
        </p>

        <button className="hero__btn">🎮 POŁĄCZ KONTO STEAM</button>

        <div className="hero__note">*Bezpieczne logowanie przez OpenID</div>
      </div>
    </div>
  );
}
