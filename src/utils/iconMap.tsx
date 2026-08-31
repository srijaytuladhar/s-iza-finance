import React from 'react';
import { FontAwesome5 } from '@expo/vector-icons';

interface FinanceIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

// Maps fa-* and pi-* names to FontAwesome5 icon names
export const getFontAwesomeIconName = (name: string): string => {
  if (!name) return 'question-circle';

  // Strip prefixes
  const normalized = name.replace(/^(fa-|pi-|fa_)/, '');

  const map: Record<string, string> = {
    // Standard mapping
    'money': 'money-bill-wave',
    'money-bill': 'money-bill-wave',
    'credit-card': 'credit-card',
    'shopping-cart': 'shopping-cart',
    'home': 'home',
    'car': 'car',
    'plane': 'plane',
    'heart': 'heart',
    'gift': 'gift',
    'gamepad': 'gamepad',
    'briefcase': 'briefcase',
    'coffee': 'coffee',
    'utensils': 'utensils',
    'user': 'user',
    'tag': 'tag',
    'tags': 'tags',
    'wrench': 'wrench',
    'cog': 'cog',
    'cogs': 'cogs',
    'wallet': 'wallet',
    'phone': 'phone',
    'envelope': 'envelope',
    'bell': 'bell',
    'calendar': 'calendar',
    'chart-bar': 'chart-bar',
    'chart-pie': 'chart-pie',
    'dollar-sign': 'dollar-sign',
    'bank': 'university',
    'university': 'university',
    'cash': 'money-bill-wave',
    'mobile': 'mobile-alt',
    'key': 'key',
    'lock': 'lock',
    'unlock': 'unlock',
    'book': 'book',
    'camera': 'camera',
    'music': 'music',
    'film': 'film',
    'tv': 'tv',
    'graduation-cap': 'graduation-cap',
    'medkit': 'medkit',
    'heartbeat': 'heartbeat',
    'store': 'store',
    'star': 'star',
  };

  return map[normalized] || normalized || 'question-circle';
};

export const FinanceIcon: React.FC<FinanceIconProps> = ({
  name,
  size = 20,
  color = '#000',
  style,
}) => {
  const faName = getFontAwesomeIconName(name);
  
  // FontAwesome5 is type-safe but we cast to any to support dynamic strings safely
  return (
    <FontAwesome5
      name={faName as any}
      size={size}
      color={color}
      style={style}
    />
  );
};
