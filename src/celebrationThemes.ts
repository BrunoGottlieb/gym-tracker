export const celebrationThemes = [
  { id: 'knight', name: 'Cavaleiro', description: 'Opção 4 · descanso junto ao fogo' },
  { id: 'bonfire', name: 'Fogueira', description: 'Opção 1 · espada e chama' },
  { id: 'classic', name: 'Chama clássica', description: 'A animação original do app' },
  { id: 'realistic', name: 'Dark Souls', description: 'Cenário realista com cavaleiro' },
] as const;

export type CelebrationTheme = typeof celebrationThemes[number]['id'];
export const defaultCelebrationTheme: CelebrationTheme = 'knight';
export const isCelebrationTheme = (value: unknown): value is CelebrationTheme =>
  celebrationThemes.some(theme => theme.id === value);
