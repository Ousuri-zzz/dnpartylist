import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

// คืนไอคอนอาชีพ (RPG-Awesome)
export function getClassIcon(className: string) {
  let colorClass = '';
  switch (className) {
    case 'Sword Master':
    case 'Mercenary':
      colorClass = 'text-red-600';
      break;
    case 'Bowmaster':
    case 'Acrobat':
      colorClass = 'text-emerald-600';
      break;
    case 'Force User':
    case 'Elemental Lord':
      colorClass = 'text-purple-600';
      break;
    case 'Paladin':
    case 'Priest':
      colorClass = 'text-sky-600';
      break;
    case 'Engineer':
    case 'Alchemist':
      colorClass = 'text-amber-600';
      break;
    default:
      colorClass = 'text-gray-700';
  }
  switch (className) {
    case 'Sword Master':
      return <i className={`ra ra-sword ${colorClass}`} title="Sword Master" />;
    case 'Mercenary':
      return <i className={`ra ra-axe ${colorClass}`} title="Mercenary" />;
    case 'Bowmaster':
      return <i className={`ra ra-archer ${colorClass}`} title="Bowmaster" />;
    case 'Acrobat':
      return <i className={`ra ra-player-dodge ${colorClass}`} title="Acrobat" />;
    case 'Force User':
      return <i className={`ra ra-crystal-ball ${colorClass}`} title="Force User" />;
    case 'Elemental Lord':
      return <i className={`ra ra-fire-symbol ${colorClass}`} title="Elemental Lord" />;
    case 'Paladin':
      return <i className={`ra ra-shield ${colorClass}`} title="Paladin" />;
    case 'Priest':
      return <i className={`ra ra-hospital-cross ${colorClass}`} title="Priest" />;
    case 'Engineer':
      return <i className={`ra ra-gear-hammer ${colorClass}`} title="Engineer" />;
    case 'Alchemist':
      return <i className={`ra ra-flask ${colorClass}`} title="Alchemist" />;
    default:
      return <i className={`ra ra-player ${colorClass}`} title="Unknown" />;
  }
}
