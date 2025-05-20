import { Item } from './useSplitBills';

export function calculateSplit(items: Item[], fee: number, count: number): number {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const net = Math.max(total - fee, 0);
  return count > 0 ? Math.floor(net / count) : 0;
}

export function formatGold(amount: number): string {
  return amount.toLocaleString('th-TH');
}

export function getTimeRemaining(expiresAt: number): {
  days: number;
  hours: number;
  minutes: number;
} {
  const now = Date.now();
  const diff = expiresAt - now;
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
}

export function isExpiringSoon(expiresAt: number): boolean {
  const { days, hours } = getTimeRemaining(expiresAt);
  return days === 0 && hours < 24;
} 