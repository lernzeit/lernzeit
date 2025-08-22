import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AVATAR_LIBRARY, AVATAR_CATEGORIES, getAvatarById, type Avatar as AvatarType } from '@/data/avatars';

interface AvatarSelectorProps {
  selectedAvatarId?: string;
  selectedColor?: string;
  onAvatarChange: (avatarId: string, color: string) => void;
  onClose?: () => void;
}

export function AvatarSelector({ selectedAvatarId, selectedColor, onAvatarChange, onClose }: AvatarSelectorProps) {
  const [activeCategory, setActiveCategory] = useState('animals');
  const [tempAvatarId, setTempAvatarId] = useState(selectedAvatarId || 'cat');
  const [tempColor, setTempColor] = useState(selectedColor || '#3b82f6');

  const selectedAvatar: AvatarType | undefined = getAvatarById(tempAvatarId);
  const avatarsInCategory = AVATAR_LIBRARY.filter(avatar => avatar.category === activeCategory);

  const handleSave = () => {
    onAvatarChange(tempAvatarId, tempColor);
    onClose?.();
  };

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="text-center">
        <Avatar className="w-24 h-24 mx-auto mb-4" style={{ backgroundColor: tempColor }}>
          <AvatarFallback className="text-3xl bg-transparent text-white">
            {selectedAvatar?.emoji}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-lg">{selectedAvatar?.name}</h3>
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap justify-center">
        {AVATAR_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(category.id)}
            className="flex items-center gap-1"
          >
            <span>{category.emoji}</span>
            <span className="hidden sm:inline">{category.name}</span>
          </Button>
        ))}
      </div>

      {/* Avatar Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {avatarsInCategory.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => {
                  setTempAvatarId(avatar.id);
                  setTempColor(avatar.colors[0]); // Set default color
                }}
                className={`
                  p-3 rounded-lg border-2 transition-all hover:scale-105
                  ${tempAvatarId === avatar.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                  }
                `}
              >
                <div className="text-2xl mb-1">{avatar.emoji}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {avatar.name}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Selection */}
      {selectedAvatar && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-3 text-center">Wähle deine Lieblingsfarbe</h4>
            <div className="flex gap-3 justify-center flex-wrap">
              {selectedAvatar.colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setTempColor(color)}
                  className={`
                    w-10 h-10 rounded-full border-4 transition-all hover:scale-110
                    ${tempColor === color 
                      ? 'border-foreground shadow-lg' 
                      : 'border-white shadow-md'
                    }
                  `}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
        )}
        <Button onClick={handleSave} className="flex items-center gap-2">
          <span>✨</span>
          Avatar auswählen
        </Button>
      </div>
    </div>
  );
}