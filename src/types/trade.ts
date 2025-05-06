import { DiscordId } from './discord';

export interface GuildSettings {
  name: string;
  secretKey: string;
  leaders: {
    [uid: string]: boolean;
  };
  members: {
    [uid: string]: {
      discordName: string;
      joinedAt: string;
    }
  }
}

export type LoanStatus = 'waitingApproval' | 'active' | 'returned' | 'completed' | 'rejected';

export interface Loan {
  loanId: string;
  amount: number;
  status: LoanStatus;
  source: {
    type: 'guild' | 'merchant';
    guild?: string;
    merchantId?: string;
    tradeId?: string;
  };
  borrower: {
    discordId: string;
    name: string;
  };
  tradeId?: string;
  dueDate?: string; // Optional date in YYYY-MM-DD format
  createdAt: number;
  updatedAt: number;
}

export interface GuildLoan {
  id: string;
  type: 'guild' | 'merchant';
  borrowerUid: string;
  amount: number;
  reason: string;
  status: LoanStatus;
  createdAt: string;
  repaidAt?: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface Merchant {
  uid: string;
  discordId: string;
  name: string;
  goldAvailable: number;
  createdAt: number;
}

export interface GoldTrade {
  tradeId: string;
  merchantId: string;
  amount: number;
  amountLeft: number;
  price: number;
  status: 'active' | 'completed' | 'cancelled';
  confirms?: {
    [buyerUid: string]: {
      amount: number;
      status: 'waiting' | 'completed' | 'cancelled';
      confirmedAt: number;
    };
  };
  createdAt: number;
  updatedAt?: number;
}

export interface TradeItem {
  itemId: string;
  sellerId: string;
  name: string;
  description: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  createdAt: number;
  updatedAt?: number;
} 