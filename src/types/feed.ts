export type FeedType = 'gold' | 'item' | 'loan';
export type FeedSubType = 'create' | 'confirm' | 'complete' | 'reject' | 'return' | 'active' | 'rejected';

export interface Feed {
  type: FeedType;
  subType: FeedSubType;
  text: string;
  from: string; // discordId
  to: string; // discordId
  relatedId: string; // tradeId or loanId
  timestamp: number;
  merchantName?: string;
  merchantDiscord?: string;
  source?: any;
  borrower?: any;
  amount?: number;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface FeedFilters {
  type?: FeedType;
  guild?: string;
  merchantId?: string;
  startDate?: number;
  endDate?: number;
} 