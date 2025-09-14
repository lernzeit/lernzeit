
import { QuestionTemplate } from '../questionTemplates';

export class OptionGenerator {
  
  static generateMultipleChoiceOptions(
    correctAnswer: string | number, 
    template: QuestionTemplate, 
    params: Record<string, any>
  ): string[] {
    const options = [correctAnswer.toString()];
    
    // Generate context-appropriate wrong answers
    if (template.id.includes('rhymes')) {
      const rhymeOptions = ['Maus', 'Klaus', 'Haus', 'raus', 'Ball', 'Fall', 'Wall', 'all'];
      rhymeOptions.forEach(option => {
        if (options.length < 4 && !options.includes(option)) {
          options.push(option);
        }
      });
    } else if (template.id.includes('reading')) {
      const readingOptions = ['Park', 'Schule', 'Haus', 'Garten', 'lesen', 'spielen', 'schlafen'];
      readingOptions.forEach(option => {
        if (options.length < 4 && !options.includes(option)) {
          options.push(option);
        }
      });
    } else if (template.id.includes('multiplication') || template.id.includes('addition')) {
      // Generate mathematically reasonable wrong answers
      const correctNum = typeof correctAnswer === 'number' ? correctAnswer : parseFloat(correctAnswer.toString());
      if (!isNaN(correctNum)) {
        const variations = [
          correctNum + 1,
          correctNum - 1,
          correctNum + Math.floor(Math.random() * 5) + 1,
          correctNum - Math.floor(Math.random() * 5) - 1
        ];
        
        variations.forEach(variation => {
          if (options.length < 4 && variation > 0 && !options.includes(variation.toString())) {
            options.push(variation.toString());
          }
        });
      }
    }
    
    // Fill remaining slots with generic variations
    while (options.length < 4) {
      let wrongAnswer;
      if (typeof correctAnswer === 'number') {
        const variation = Math.floor(Math.random() * 10) - 5;
        wrongAnswer = Math.max(0, (correctAnswer as number) + variation);
      } else {
        wrongAnswer = (Math.floor(Math.random() * 20) + 1).toString();
      }
      
      if (!options.includes(wrongAnswer.toString())) {
        options.push(wrongAnswer.toString());
      }
    }
    
    // Shuffle options to randomize correct answer position
    // Then ensure proper spacing for multi-word answers
    return options
      .sort(() => Math.random() - 0.5)
      .map(option => {
        // Add spacing between concatenated words (e.g., "BananenÄpfel" -> "Bananen, Äpfel")
        if (typeof option === 'string' && option.length > 5) {
          return option.replace(/([a-zäöüß])([A-ZÄÖÜ])/g, '$1, $2');
        }
        return option;
      });
  }

  static generateWordSelection(
    template: QuestionTemplate, 
    params: Record<string, any>
  ): Array<{word: string; isCorrect: boolean; index: number}> {
    if (template.id.includes('letter_recognition')) {
      const words = ['Maus', 'Auto', 'Haus', 'Baum', 'Mond', 'Sonne', 'Katze', 'Hund', 'Lampe', 'Tisch'];
      const targetLetter = params.vowel || params.consonant;
      
      return words.map((word, index) => ({
        word,
        isCorrect: word.toLowerCase().includes(targetLetter.toLowerCase()),
        index
      }));
    }
    
    // Default word selection
    const words = ['Wort1', 'Wort2', 'Wort3', 'Wort4', 'Wort5', 'Wort6'];
    return words.map((word, index) => ({
      word,
      isCorrect: index < 2,
      index
    }));
  }

  static generateMatchingQuestion(
    template: QuestionTemplate, 
    params: Record<string, any>
  ) {
    if (template.id.includes('categories_food')) {
      const foodCategories = [
        { food: 'Apfel', category: 'Obst' },
        { food: 'Brot', category: 'Getreide' },
        { food: 'Milch', category: 'Milchprodukt' },
        { food: 'Fleisch', category: 'Fleisch' },
        { food: 'Karotte', category: 'Gemüse' },
        { food: 'Käse', category: 'Milchprodukt' }
      ];
      
      const items = foodCategories.map((pair, index) => ({
        id: `food_${index}`,
        content: pair.food,
        category: pair.category.toLowerCase()
      }));
      
      const categories = [
        { id: 'obst', name: 'Obst', acceptsItems: items.filter(i => i.category === 'obst').map(i => i.id) },
        { id: 'getreide', name: 'Getreide', acceptsItems: items.filter(i => i.category === 'getreide').map(i => i.id) },
        { id: 'milchprodukt', name: 'Milchprodukt', acceptsItems: items.filter(i => i.category === 'milchprodukt').map(i => i.id) }
      ];
      
      return { items, categories };
    }
    
    // Default matching structure
    const items = [
      { id: 'item1', content: 'Item 1', category: 'category1' },
      { id: 'item2', content: 'Item 2', category: 'category2' }
    ];
    
    const categories = [
      { id: 'category1', name: 'Kategorie 1', acceptsItems: ['item1'] },
      { id: 'category2', name: 'Kategorie 2', acceptsItems: ['item2'] }
    ];
    
    return { items, categories };
  }
}
