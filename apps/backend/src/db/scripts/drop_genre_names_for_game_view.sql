-- Porządek po eksploracji DB: widok był zdefiniowany z na stałe wpisaną
-- jedną grą (WHERE name = 'Shadow of the Tomb Raider: Definitive Edition'),
-- przez co zwracał wyniki tylko dla niej. Nie jest używany w kodzie aplikacji.
DROP VIEW IF EXISTS genre_names_for_game_view;
