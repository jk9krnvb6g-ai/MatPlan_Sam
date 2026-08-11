import React from 'react';
import { CategoryId } from '../types';
import { CATEGORY_LABELS, getItemCategory } from '../data/catalog';
import { CATEGORY_BUTTON_STYLES } from './TableControlPanel';

interface CategoryBadgeProps {
  category?: CategoryId;
  itemName?: string;
  customItems?: Record<string, string[]>;
  size?: 'sm' | 'md';
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  itemName,
  customItems,
  size = 'sm'
}) => {
  const catKey = category || (itemName ? getItemCategory(itemName, customItems) : 'office');
  const label = CATEGORY_LABELS[catKey] || catKey;
  const style = CATEGORY_BUTTON_STYLES[catKey] || CATEGORY_BUTTON_STYLES.office;

  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-sm' : 'px-2.5 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg font-bold border whitespace-nowrap shadow-2xs ${sizeCls} ${style.inactive}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span>{label}</span>
    </span>
  );
};
