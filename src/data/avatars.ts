// Avatar library for secure profile customization
export interface Avatar {
  id: string;
  emoji: string;
  name: string;
  category: 'animals' | 'faces' | 'objects' | 'nature';
  colors: string[];
}

export const AVATAR_LIBRARY: Avatar[] = [
  // Animals
  { id: 'cat', emoji: '🐱', name: 'Katze', category: 'animals', colors: ['#fbbf24', '#f59e0b', '#d97706'] },
  { id: 'dog', emoji: '🐶', name: 'Hund', category: 'animals', colors: ['#a78bfa', '#8b5cf6', '#7c3aed'] },
  { id: 'bear', emoji: '🐻', name: 'Bär', category: 'animals', colors: ['#fb7185', '#f43f5e', '#e11d48'] },
  { id: 'fox', emoji: '🦊', name: 'Fuchs', category: 'animals', colors: ['#fb923c', '#f97316', '#ea580c'] },
  { id: 'lion', emoji: '🦁', name: 'Löwe', category: 'animals', colors: ['#fbbf24', '#f59e0b', '#d97706'] },
  { id: 'panda', emoji: '🐼', name: 'Panda', category: 'animals', colors: ['#64748b', '#475569', '#334155'] },
  { id: 'rabbit', emoji: '🐰', name: 'Hase', category: 'animals', colors: ['#fb7185', '#f43f5e', '#e11d48'] },
  { id: 'monkey', emoji: '🐵', name: 'Affe', category: 'animals', colors: ['#a78bfa', '#8b5cf6', '#7c3aed'] },
  
  // Faces
  { id: 'happy', emoji: '😊', name: 'Fröhlich', category: 'faces', colors: ['#10b981', '#059669', '#047857'] },
  { id: 'cool', emoji: '😎', name: 'Cool', category: 'faces', colors: ['#3b82f6', '#2563eb', '#1d4ed8'] },
  { id: 'smart', emoji: '🤓', name: 'Schlau', category: 'faces', colors: ['#8b5cf6', '#7c3aed', '#6d28d9'] },
  { id: 'wink', emoji: '😉', name: 'Augenzwinkern', category: 'faces', colors: ['#f59e0b', '#d97706', '#b45309'] },
  { id: 'star_eyes', emoji: '🤩', name: 'Sterne-Augen', category: 'faces', colors: ['#fbbf24', '#f59e0b', '#d97706'] },
  { id: 'angel', emoji: '😇', name: 'Engel', category: 'faces', colors: ['#e5e7eb', '#d1d5db', '#9ca3af'] },
  
  // Objects & Fun
  { id: 'robot', emoji: '🤖', name: 'Roboter', category: 'objects', colors: ['#64748b', '#475569', '#334155'] },
  { id: 'unicorn', emoji: '🦄', name: 'Einhorn', category: 'objects', colors: ['#fb7185', '#f43f5e', '#e11d48'] },
  { id: 'wizard', emoji: '🧙‍♂️', name: 'Zauberer', category: 'objects', colors: ['#8b5cf6', '#7c3aed', '#6d28d9'] },
  { id: 'superhero', emoji: '🦸‍♂️', name: 'Superheld', category: 'objects', colors: ['#dc2626', '#b91c1c', '#991b1b'] },
  { id: 'pirate', emoji: '🏴‍☠️', name: 'Pirat', category: 'objects', colors: ['#64748b', '#475569', '#334155'] },
  { id: 'crown', emoji: '👑', name: 'Krone', category: 'objects', colors: ['#fbbf24', '#f59e0b', '#d97706'] },
  
  // Nature
  { id: 'star', emoji: '⭐', name: 'Stern', category: 'nature', colors: ['#fbbf24', '#f59e0b', '#d97706'] },
  { id: 'rainbow', emoji: '🌈', name: 'Regenbogen', category: 'nature', colors: ['#fb7185', '#f43f5e', '#e11d48'] },
  { id: 'sun', emoji: '☀️', name: 'Sonne', category: 'nature', colors: ['#fbbf24', '#f59e0b', '#d97706'] },
  { id: 'moon', emoji: '🌙', name: 'Mond', category: 'nature', colors: ['#e5e7eb', '#d1d5db', '#9ca3af'] },
  { id: 'flower', emoji: '🌸', name: 'Blume', category: 'nature', colors: ['#fb7185', '#f43f5e', '#e11d48'] },
  { id: 'tree', emoji: '🌳', name: 'Baum', category: 'nature', colors: ['#10b981', '#059669', '#047857'] },
];

export const AVATAR_CATEGORIES = [
  { id: 'animals', name: 'Tiere', emoji: '🐾' },
  { id: 'faces', name: 'Gesichter', emoji: '😊' },
  { id: 'objects', name: 'Objekte', emoji: '🎭' },
  { id: 'nature', name: 'Natur', emoji: '🌟' },
] as const;

export function getAvatarById(id: string): Avatar | undefined {
  return AVATAR_LIBRARY.find(avatar => avatar.id === id);
}

export function getAvatarsByCategory(category: string): Avatar[] {
  return AVATAR_LIBRARY.filter(avatar => avatar.category === category);
}