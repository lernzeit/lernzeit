// Avatar library for secure profile customization
export interface Avatar {
  id: string;
  emoji: string;
  name: string;
  category: 'animals' | 'faces' | 'objects' | 'nature' | 'weihnachten';
  colors: string[];
}

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

  // Weihnachten (nur 1. Dezember bis 6. Januar freizuschalten, lib/federmaeppchen.ts)
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
  { id: 'weihnachten', name: 'Weihnachten', emoji: '🎄' },
] as const;

export function getAvatarById(id: string): Avatar | undefined {
  return AVATAR_LIBRARY.find(avatar => avatar.id === id);
}

export function getAvatarsByCategory(category: string): Avatar[] {
  return AVATAR_LIBRARY.filter(avatar => avatar.category === category);
}