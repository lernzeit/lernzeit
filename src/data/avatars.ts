// Avatar library for secure profile customization
export interface Avatar {
  id: string;
  emoji: string;
  name: string;
  category: 'animals' | 'faces' | 'objects' | 'nature' | 'fantasie' | 'sport' | 'weihnachten';
  colors: string[];
}

const FARBEN = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b'];

export const AVATAR_LIBRARY: Avatar[] = [
  // Animals
  { id: 'cat', emoji: '🐱', name: 'Katze', category: 'animals', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#f59e0b', '#64748b', '#ec4899', '#06b6d4'] },
  { id: 'dog', emoji: '🐶', name: 'Hund', category: 'animals', colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b'] },
  { id: 'bear', emoji: '🐻', name: 'Bär', category: 'animals', colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444', '#64748b'] },
  { id: 'fox', emoji: '🦊', name: 'Fuchs', category: 'animals', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#64748b', '#ec4899', '#06b6d4', '#f59e0b'] },
  { id: 'lion', emoji: '🦁', name: 'Löwe', category: 'animals', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#64748b', '#06b6d4', '#f59e0b'] },
  { id: 'panda', emoji: '🐼', name: 'Panda', category: 'animals', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b'] },
  { id: 'rabbit', emoji: '🐰', name: 'Hase', category: 'animals', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#64748b', '#06b6d4', '#ef4444', '#ec4899'] },
  { id: 'monkey', emoji: '🐵', name: 'Affe', category: 'animals', colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b', '#8b5cf6'] },
  
  // Faces
  { id: 'happy', emoji: '😊', name: 'Fröhlich', category: 'faces', colors: ['#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#64748b', '#06b6d4', '#10b981'] },
  { id: 'cool', emoji: '😎', name: 'Cool', category: 'faces', colors: ['#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#64748b', '#06b6d4', '#3b82f6'] },
  { id: 'smart', emoji: '🤓', name: 'Schlau', category: 'faces', colors: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#ec4899', '#64748b', '#06b6d4', '#8b5cf6'] },
  { id: 'wink', emoji: '😉', name: 'Augenzwinkern', category: 'faces', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#64748b', '#06b6d4', '#f59e0b'] },
  { id: 'star_eyes', emoji: '🤩', name: 'Sterne-Augen', category: 'faces', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#64748b', '#06b6d4', '#f59e0b'] },
  { id: 'angel', emoji: '😇', name: 'Engel', category: 'faces', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b'] },
  
  // Objects & Fun
  { id: 'robot', emoji: '🤖', name: 'Roboter', category: 'objects', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b'] },
  { id: 'unicorn', emoji: '🦄', name: 'Einhorn', category: 'objects', colors: ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#64748b', '#ec4899'] },
  { id: 'wizard', emoji: '🧙‍♂️', name: 'Zauberer', category: 'objects', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#64748b', '#06b6d4', '#8b5cf6'] },
  { id: 'superhero', emoji: '🦸‍♂️', name: 'Superheld', category: 'objects', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b', '#06b6d4', '#ef4444'] },
  { id: 'pirate', emoji: '🏴‍☠️', name: 'Pirat', category: 'objects', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b'] },
  { id: 'crown', emoji: '👑', name: 'Krone', category: 'objects', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#64748b', '#06b6d4', '#f59e0b'] },
  
  // Nature
  { id: 'star', emoji: '⭐', name: 'Stern', category: 'nature', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#64748b', '#06b6d4', '#f59e0b'] },
  { id: 'rainbow', emoji: '🌈', name: 'Regenbogen', category: 'nature', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#06b6d4', '#ec4899'] },
  { id: 'sun', emoji: '☀️', name: 'Sonne', category: 'nature', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#ec4899', '#64748b', '#06b6d4', '#f59e0b'] },
  { id: 'moon', emoji: '🌙', name: 'Mond', category: 'nature', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#64748b'] },
  { id: 'flower', emoji: '🌸', name: 'Blume', category: 'nature', colors: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#06b6d4', '#ec4899'] },
  { id: 'tree', emoji: '🌳', name: 'Baum', category: 'nature', colors: ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#64748b', '#06b6d4', '#10b981'] },

  // 50 weitere Figuren gegen Tinte (22.10.2026), Preise in lib/federmaeppchen.ts = avatar_preis()
  { id: 'tiger', emoji: '🐯', name: 'Tiger', category: 'animals', colors: FARBEN },
  { id: 'koala', emoji: '🐨', name: 'Koala', category: 'animals', colors: FARBEN },
  { id: 'frog', emoji: '🐸', name: 'Frosch', category: 'animals', colors: FARBEN },
  { id: 'penguin', emoji: '🐧', name: 'Pinguin', category: 'animals', colors: FARBEN },
  { id: 'owl', emoji: '🦉', name: 'Eule', category: 'animals', colors: FARBEN },
  { id: 'turtle', emoji: '🐢', name: 'Schildkröte', category: 'animals', colors: FARBEN },
  { id: 'hedgehog', emoji: '🦔', name: 'Igel', category: 'animals', colors: FARBEN },
  { id: 'dolphin', emoji: '🐬', name: 'Delfin', category: 'animals', colors: FARBEN },
  { id: 'octopus', emoji: '🐙', name: 'Krake', category: 'animals', colors: FARBEN },
  { id: 'giraffe', emoji: '🦒', name: 'Giraffe', category: 'animals', colors: FARBEN },
  { id: 'elephant', emoji: '🐘', name: 'Elefant', category: 'animals', colors: FARBEN },
  { id: 'zebra', emoji: '🦓', name: 'Zebra', category: 'animals', colors: FARBEN },
  { id: 'butterfly', emoji: '🦋', name: 'Schmetterling', category: 'animals', colors: FARBEN },
  { id: 'parrot', emoji: '🦜', name: 'Papagei', category: 'animals', colors: FARBEN },
  { id: 'otter', emoji: '🦦', name: 'Otter', category: 'animals', colors: FARBEN },
  { id: 'sloth', emoji: '🦥', name: 'Faultier', category: 'animals', colors: FARBEN },
  { id: 'party', emoji: '🥳', name: 'Party', category: 'faces', colors: FARBEN },
  { id: 'thinking', emoji: '🤔', name: 'Nachdenklich', category: 'faces', colors: FARBEN },
  { id: 'hug', emoji: '🤗', name: 'Umarmung', category: 'faces', colors: FARBEN },
  { id: 'laugh', emoji: '😂', name: 'Lachtränen', category: 'faces', colors: FARBEN },
  { id: 'ghost', emoji: '👻', name: 'Gespenst', category: 'fantasie', colors: FARBEN },
  { id: 'alien', emoji: '👽', name: 'Außerirdischer', category: 'fantasie', colors: FARBEN },
  { id: 'rocket', emoji: '🚀', name: 'Rakete', category: 'fantasie', colors: FARBEN },
  { id: 'ufo', emoji: '🛸', name: 'Ufo', category: 'fantasie', colors: FARBEN },
  { id: 'crystal_ball', emoji: '🔮', name: 'Glaskugel', category: 'fantasie', colors: FARBEN },
  { id: 'magic_wand', emoji: '🪄', name: 'Zauberstab', category: 'fantasie', colors: FARBEN },
  { id: 'fairy', emoji: '🧚', name: 'Fee', category: 'fantasie', colors: FARBEN },
  { id: 'mermaid', emoji: '🧜‍♀️', name: 'Meerjungfrau', category: 'fantasie', colors: FARBEN },
  { id: 'ninja', emoji: '🥷', name: 'Ninja', category: 'fantasie', colors: FARBEN },
  { id: 'astronaut', emoji: '🧑‍🚀', name: 'Astronaut', category: 'fantasie', colors: FARBEN },
  { id: 'dino', emoji: '🦖', name: 'Dino', category: 'fantasie', colors: FARBEN },
  { id: 'dragon', emoji: '🐉', name: 'Drache', category: 'fantasie', colors: FARBEN },
  { id: 'soccer', emoji: '⚽', name: 'Fußball', category: 'sport', colors: FARBEN },
  { id: 'basketball', emoji: '🏀', name: 'Basketball', category: 'sport', colors: FARBEN },
  { id: 'tennis', emoji: '🎾', name: 'Tennis', category: 'sport', colors: FARBEN },
  { id: 'kite', emoji: '🪁', name: 'Drachen', category: 'sport', colors: FARBEN },
  { id: 'puzzle', emoji: '🧩', name: 'Puzzle', category: 'sport', colors: FARBEN },
  { id: 'palette', emoji: '🎨', name: 'Malkasten', category: 'sport', colors: FARBEN },
  { id: 'skateboard', emoji: '🛹', name: 'Skateboard', category: 'sport', colors: FARBEN },
  { id: 'drum', emoji: '🥁', name: 'Trommel', category: 'sport', colors: FARBEN },
  { id: 'guitar', emoji: '🎸', name: 'Gitarre', category: 'sport', colors: FARBEN },
  { id: 'trophy', emoji: '🏆', name: 'Pokal', category: 'sport', colors: FARBEN },
  { id: 'cactus', emoji: '🌵', name: 'Kaktus', category: 'nature', colors: FARBEN },
  { id: 'sunflower', emoji: '🌻', name: 'Sonnenblume', category: 'nature', colors: FARBEN },
  { id: 'mushroom', emoji: '🍄', name: 'Pilz', category: 'nature', colors: FARBEN },
  { id: 'snowflake', emoji: '❄️', name: 'Schneeflocke', category: 'nature', colors: FARBEN },
  { id: 'lightning', emoji: '⚡', name: 'Blitz', category: 'nature', colors: FARBEN },
  { id: 'earth', emoji: '🌍', name: 'Erde', category: 'nature', colors: FARBEN },
  { id: 'comet', emoji: '☄️', name: 'Komet', category: 'nature', colors: FARBEN },
  { id: 'volcano', emoji: '🌋', name: 'Vulkan', category: 'nature', colors: FARBEN },

  // Weihnachten (nur 1. bis 26. Dezember freizuschalten, lib/federmaeppchen.ts)
  { id: 'weihnachtsmann', emoji: '🎅', name: 'Weihnachtsmann', category: 'weihnachten', colors: ['#d4483b', '#15a05a', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b', '#06b6d4', '#ec4899'] },
  { id: 'rentier', emoji: '🦌', name: 'Rentier', category: 'weihnachten', colors: ['#15a05a', '#d4483b', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b', '#06b6d4', '#ec4899'] },
  { id: 'schneemann', emoji: '⛄', name: 'Schneemann', category: 'weihnachten', colors: ['#3b82f6', '#06b6d4', '#8b5cf6', '#15a05a', '#d4483b', '#64748b', '#f59e0b', '#ec4899'] },
  { id: 'elf', emoji: '🧝', name: 'Wichtel', category: 'weihnachten', colors: ['#15a05a', '#d4483b', '#3b82f6', '#8b5cf6', '#f59e0b', '#64748b', '#06b6d4', '#ec4899'] },
  { id: 'tannenbaum', emoji: '🎄', name: 'Tannenbaum', category: 'weihnachten', colors: ['#d4483b', '#3b82f6', '#8b5cf6', '#f59e0b', '#15a05a', '#64748b', '#06b6d4', '#ec4899'] },
];

export const AVATAR_CATEGORIES = [
  { id: 'animals', name: 'Tiere', emoji: '🐾' },
  { id: 'faces', name: 'Gesichter', emoji: '😊' },
  { id: 'objects', name: 'Objekte', emoji: '🎭' },
  { id: 'nature', name: 'Natur', emoji: '🌟' },
  { id: 'fantasie', name: 'Fantasie', emoji: '🐉' },
  { id: 'sport', name: 'Sport & Spiel', emoji: '⚽' },
  { id: 'weihnachten', name: 'Weihnachten', emoji: '🎄' },
] as const;

export function getAvatarById(id: string): Avatar | undefined {
  return AVATAR_LIBRARY.find(avatar => avatar.id === id);
}

export function getAvatarsByCategory(category: string): Avatar[] {
  return AVATAR_LIBRARY.filter(avatar => avatar.category === category);
}