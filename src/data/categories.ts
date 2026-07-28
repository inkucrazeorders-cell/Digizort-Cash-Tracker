import { TransactionCategory } from '../types';

export interface CategoryInfo {
  id: TransactionCategory;
  label: string;
  iconName: string; // Lucide icon identifier
  color: string;    // Tailwind text color
  bgColor: string;  // Tailwind background badge color
  borderColor: string;
}

export const CATEGORIES: CategoryInfo[] = [
  {
    id: 'Recharge',
    label: 'Recharge',
    iconName: 'Smartphone',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
  },
  {
    id: 'Online Shopping',
    label: 'Online Shopping',
    iconName: 'ShoppingBag',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  {
    id: 'Food',
    label: 'Food & Dining',
    iconName: 'Utensils',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 'Movie',
    label: 'Movie',
    iconName: 'Film',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'Travel',
    label: 'Travel & Taxi',
    iconName: 'Car',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'Tickets',
    label: 'Event Tickets',
    iconName: 'Ticket',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
  {
    id: 'Games',
    label: 'Gaming & Apps',
    iconName: 'Gamepad2',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
  },
  {
    id: 'Borrowed Cash',
    label: 'Borrowed Cash',
    iconName: 'Banknote',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  {
    id: 'Gift',
    label: 'Gift & Treat',
    iconName: 'Gift',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
  },
  {
    id: 'Others',
    label: 'Others',
    iconName: 'MoreHorizontal',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/30',
  },
];

export function getCategoryInfo(categoryName: TransactionCategory): CategoryInfo {
  return (
    CATEGORIES.find((c) => c.id === categoryName) || {
      id: 'Others',
      label: categoryName,
      iconName: 'MoreHorizontal',
      color: 'text-zinc-400',
      bgColor: 'bg-zinc-500/10',
      borderColor: 'border-zinc-500/30',
    }
  );
}
