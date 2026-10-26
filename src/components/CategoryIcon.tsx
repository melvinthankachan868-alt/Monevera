import React from 'react';
import {
  Home,
  Utensils,
  Zap,
  Armchair,
  HeartPulse,
  GraduationCap,
  Car,
  ShieldCheck,
  ShoppingBag,
  Film,
  Coffee,
  Plane,
  CalendarCheck,
  Sparkles,
  Smartphone,
  Coins,
  PiggyBank,
  TrendingUp,
  Landmark,
  LineChart,
  Tag,
  CircleDollarSign,
  Receipt,
  Gift,
  HelpCircle,
} from 'lucide-react';
import { CategoryType } from '../types';

interface CategoryIconProps {
  name?: string;
  category?: CategoryType;
  size?: number;
  className?: string;
  withContainer?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  Home,
  Utensils,
  Zap,
  Armchair,
  HeartPulse,
  GraduationCap,
  Car,
  ShieldCheck,
  ShoppingBag,
  Film,
  Coffee,
  Plane,
  CalendarCheck,
  Sparkles,
  Smartphone,
  Coins,
  PiggyBank,
  TrendingUp,
  Landmark,
  LineChart,
  Tag,
  CircleDollarSign,
  Receipt,
  Gift,
};

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name = '',
  category = 'Needs',
  size = 20,
  className = '',
  withContainer = false,
}) => {
  let resolvedKey = name;
  const lower = name.toLowerCase();

  if (iconMap[name]) {
    resolvedKey = name;
  } else if (lower.includes('rent') || lower.includes('house') || lower.includes('home')) {
    resolvedKey = lower.includes('rent') ? 'Home' : 'Armchair';
  } else if (lower.includes('food') || lower.includes('grocer') || lower.includes('ration')) {
    resolvedKey = 'Utensils';
  } else if (lower.includes('util') || lower.includes('bill') || lower.includes('electric') || lower.includes('water')) {
    resolvedKey = 'Zap';
  } else if (lower.includes('health') || lower.includes('medic') || lower.includes('doctor')) {
    resolvedKey = 'HeartPulse';
  } else if (lower.includes('edu') || lower.includes('school') || lower.includes('college') || lower.includes('course')) {
    resolvedKey = 'GraduationCap';
  } else if (lower.includes('travel') || lower.includes('flight') || lower.includes('trip')) {
    resolvedKey = 'Plane';
  } else if (lower.includes('transp') || lower.includes('car') || lower.includes('fuel') || lower.includes('cab') || lower.includes('metro')) {
    resolvedKey = 'Car';
  } else if (lower.includes('insur')) {
    resolvedKey = 'ShieldCheck';
  } else if (lower.includes('shop') || lower.includes('cloth') || lower.includes('zudio') || lower.includes('mall')) {
    resolvedKey = 'ShoppingBag';
  } else if (lower.includes('movie') || lower.includes('entert') || lower.includes('cinema') || lower.includes('netflix')) {
    resolvedKey = 'Film';
  } else if (lower.includes('din') || lower.includes('cafe') || lower.includes('coffee') || lower.includes('restaur')) {
    resolvedKey = 'Coffee';
  } else if (lower.includes('sub') || lower.includes('recharg')) {
    resolvedKey = 'CalendarCheck';
  } else if (lower.includes('gadget') || lower.includes('electr') || lower.includes('phone')) {
    resolvedKey = 'Smartphone';
  } else if (lower.includes('sip') || lower.includes('mf') || lower.includes('mutual')) {
    resolvedKey = 'LineChart';
  } else if (lower.includes('invest') || lower.includes('stock')) {
    resolvedKey = 'TrendingUp';
  } else if (lower.includes('fd') || lower.includes('deposit') || lower.includes('bank')) {
    resolvedKey = 'Landmark';
  } else if (lower.includes('emerg')) {
    resolvedKey = 'PiggyBank';
  } else {
    if (category === 'Needs') resolvedKey = 'Home';
    else if (category === 'Wants') resolvedKey = 'ShoppingBag';
    else resolvedKey = 'Coins';
  }

  const IconComp = iconMap[resolvedKey] || HelpCircle;

  if (withContainer) {
    let bgStyle = 'bg-sky-500/15 text-sky-600 dark:text-[#64D8FF] border border-sky-500/30';
    if (category === 'Wants') bgStyle = 'bg-amber-500/15 text-amber-700 dark:text-[#FFB84D] border border-amber-500/30';
    if (category === 'Savings') bgStyle = 'bg-[var(--mv-income)]/15 text-[var(--mv-income)] border border-[var(--mv-income)]/30';
    return (
      <div
        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${bgStyle} ${className}`}
      >
        <IconComp size={size} strokeWidth={2.2} />
      </div>
    );
  }

  return <IconComp size={size} className={className} strokeWidth={2.2} />;
};
