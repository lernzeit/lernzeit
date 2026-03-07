/**
 * Determines age-appropriate UI settings based on grade level.
 * Grades 1–4: "young" → big, colorful, emoji-heavy, simple text.
 * Grades 5–10: "teen" → sleek, modern, compact layout.
 */

export type AgeGroup = 'young' | 'teen';

export interface AgeGroupStyles {
  group: AgeGroup;
  /** Card padding class */
  cardPadding: string;
  /** Emoji / icon size class */
  emojiSize: string;
  /** Heading text size */
  headingSize: string;
  /** Body text size */
  bodySize: string;
  /** Grid columns for selectors */
  gridCols: string;
  /** Whether to show descriptive subtexts */
  showDescriptions: boolean;
  /** Extra card classes (rounded, shadow) */
  cardStyle: string;
  /** Button size variant */
  buttonSize: 'default' | 'lg';
  /** Progress bar height class */
  progressHeight: string;
}

export function useAgeGroup(grade: number): AgeGroupStyles {
  const group: AgeGroup = grade <= 4 ? 'young' : 'teen';

  if (group === 'young') {
    return {
      group,
      cardPadding: 'p-6',
      emojiSize: 'text-5xl',
      headingSize: 'text-2xl',
      bodySize: 'text-base',
      gridCols: 'grid-cols-2 md:grid-cols-3',
      showDescriptions: false,
      cardStyle: 'rounded-2xl shadow-lg border-2 hover:scale-105',
      buttonSize: 'lg',
      progressHeight: 'h-4',
    };
  }

  return {
    group,
    cardPadding: 'p-4',
    emojiSize: 'text-2xl',
    headingSize: 'text-lg',
    bodySize: 'text-sm',
    gridCols: 'grid-cols-1 md:grid-cols-2',
    showDescriptions: true,
    cardStyle: 'rounded-lg shadow-card hover:scale-[1.02]',
    buttonSize: 'default',
    progressHeight: 'h-2',
  };
}
