export type DiscordId = string;

export interface DiscordUser {
  id: DiscordId;
  name: string;
}

export interface DiscordMessage {
  type: 'trade' | 'announcement';
  sellerId: DiscordId;
  itemName: string;
  amount: number;
  price?: number;
  confirmUrl: string;
}

export type FeedType = 'gold' | 'item' | 'loan';
export type FeedSubType = 'create' | 'confirm' | 'complete';

export interface FeedMessage {
  type: FeedType;
  subType: FeedSubType;
  text: string;
  from: DiscordId;
  to: DiscordId;
  relatedId: string;
  timestamp: number;
} 