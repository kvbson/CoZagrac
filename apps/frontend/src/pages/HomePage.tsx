import {
  AppShell,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconChartArcs,
  IconDeviceDesktop,
  IconGamepad2,
  IconSearch,
} from '@tabler/icons-react';

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
    <AppShell header={{ height: 76 }} className="homepage-shell" padding={0}>
      <AppShell.Header className="top-nav">
        <Container size="xl" h="100%" className="top-nav-inner">
          <Group justify="space-between" h="100%" wrap="nowrap" gap="xl">
            <Group gap="xs" wrap="nowrap" className="brand">
              <IconDeviceDesktop size={26} className="brand-icon" />
              <Text fw={800} fz="xl" className="brand-title">
                <span>co</span>ZAGRAĆ
              </Text>
            </Group>

            <Group gap="xl" wrap="nowrap" className="menu-links" visibleFrom="md">
              <Text component="a" href="#" fw={700} c="gray.2">
                SKLEP
              </Text>
              <Text component="a" href="#" fw={700} c="gray.2">
                SPOŁECZNOŚĆ
              </Text>
              <Text component="a" href="#" fw={700} c="gray.2">
                CZAT
              </Text>
              <Text component="a" href="#" fw={700} c="gray.2">
                POMOC
              </Text>
            </Group>

            <Group gap="sm" wrap="nowrap" className="top-actions">
              <TextInput
                className="search-input"
                leftSection={<IconSearch size={16} />}
                placeholder="szukaj"
                radius="md"
                w={260}
              />
              <Button radius="md" className="login-button" color="lime.9">
                ZALOGUJ SIĘ
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <section className="hero">
          <Container size="xl" className="hero-overlay">
            <Stack gap="md" maw={700}>
              <Title order={1} className="hero-title">
                ODKRYJ SWOJĄ
                <br />
                NASTĘPNĄ <span>OBSESJĘ</span>
              </Title>

              <Text className="hero-description">
                Zaloguj się, aby połączyć swoje konto Steam i otrzymać spersonalizowane rekomendacje oparte na
                Twojej historii gier. Nasz algorytm znajdzie ukryte perełki idealnie dopasowane do Ciebie.
              </Text>

              <Button
                leftSection={<IconGamepad2 size={18} />}
                className="steam-connect"
                size="lg"
                radius="md"
                w="fit-content"
              >
                POŁĄCZ KONTO STEAM
              </Button>

              <Text size="sm" c="dimmed">
                *Bezpieczne logowanie przez OpenID
              </Text>
            </Stack>
          </Container>
        </section>

        <section className="popular-section">
          <Container size="xl">
            <Group justify="space-between" className="popular-header" align="center">
              <Group gap="xs">
                <IconChartArcs size={20} />
                <Title order={2}>Popularne i polecane</Title>
              </Group>

              <Group gap="sm">
                <Button variant="filled" className="chip chip--active">
                  Wszystkie
                </Button>
                <Button variant="light" className="chip">
                  Wyprzedaż
                </Button>
                <Button variant="light" className="chip">
                  Top Sprzedaży
                </Button>
              </Group>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mt="xl" spacing="md">
              {featuredGames.map((game) => (
                <Card key={game.title} padding={0} className="game-card" radius="sm">
                  <Paper className={`game-card-art ${game.artClass}`}>
                    {game.discount && <Badge className="discount-tag">{game.discount}</Badge>}
                  </Paper>

                  <Stack gap="sm" p="sm">
                    <Text fw={700} fz="lg">
                      {game.title}
                    </Text>

                    <Group justify="space-between" align="flex-end" wrap="nowrap">
                      <Group gap={6}>
                        {game.genres.map((genre) => (
                          <Badge key={genre} variant="light" color="blue" className="game-genre">
                            {genre}
                          </Badge>
                        ))}
                      </Group>
                      <Text fw={700}>{game.price}</Text>
                    </Group>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Container>
        </section>
      </AppShell.Main>
    </AppShell>
  );
}
