import { ref, query, orderByKey, limitToLast, get, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import { Feed, FeedFilters } from '@/types/feed';
import { Loan } from '@/types/trade';

export class FeedService {
  private static readonly FEED_PATH = 'feed';
  private static readonly ALL_FEED_PATH = `${FeedService.FEED_PATH}/all`;
  private static readonly MERCHANT_FEED_PATH = `${FeedService.FEED_PATH}/merchant`;
  private static readonly LOAN_FEED_PATH = `${FeedService.FEED_PATH}/loan`;

  static async addFeed(feed: Omit<Feed, 'timestamp'>) {
    const timestamp = Date.now();
    const feedRef = ref(db, `${FeedService.ALL_FEED_PATH}/${timestamp}`);
    await set(feedRef, { ...feed, timestamp });

    // Add to merchant feed if applicable
    if (feed.type === 'gold' || feed.type === 'item') {
      const merchantFeedRef = ref(db, `${FeedService.MERCHANT_FEED_PATH}/${feed.to}/trade/${timestamp}`);
      await set(merchantFeedRef, { ...feed, timestamp });
    }

    // Add to merchant loan feed if applicable
    if (feed.type === 'loan') {
      // feed.to คือ merchantId
      const merchantLoanFeedRef = ref(db, `${FeedService.MERCHANT_FEED_PATH}/${feed.to}/loan/${timestamp}`);
      await set(merchantLoanFeedRef, { ...feed, timestamp });
    }
  }

  static async getFeeds(filters?: FeedFilters, limit: number = 50) {
    const feedsRef = ref(db, FeedService.ALL_FEED_PATH);
    let feedsQuery = query(feedsRef, orderByKey(), limitToLast(limit));

    const snapshot = await get(feedsQuery);
    if (!snapshot.exists()) return [];

    const feeds: Feed[] = [];
    snapshot.forEach((childSnapshot) => {
      const feed = childSnapshot.val();
      if (this.matchesFilters(feed, filters)) {
        feeds.push(feed);
      }
    });

    return feeds.sort((a, b) => b.timestamp - a.timestamp);
  }

  private static matchesFilters(feed: Feed, filters?: FeedFilters): boolean {
    if (!filters) return true;

    if (filters.type && feed.type !== filters.type) return false;
    if (filters.startDate && feed.timestamp < filters.startDate) return false;
    if (filters.endDate && feed.timestamp > filters.endDate) return false;

    return true;
  }

  static async addLoanFeed(
    loan: Loan,
    action: 'create' | 'approve' | 'reject' | 'return' | 'complete' | 'active' | 'rejected',
    actorDiscordId: string
  ) {
    let merchantName = '';
    let merchantDiscord = '';
    const merchantId = loan.source?.merchantId;
    if (merchantId) {
      try {
        const merchantRef = ref(db, `tradeMerchants/${merchantId}`);
        const merchantSnap = await get(merchantRef);
        if (merchantSnap.exists()) {
          const merchantData = merchantSnap.val();
          merchantName = merchantData.discord || '';
          merchantDiscord = merchantData.discord || '';
        }
      } catch (e) {}
    }
    const feed: Omit<Feed, 'timestamp'> = {
      type: 'loan',
      subType:
        action === 'create' ? 'create' :
        action === 'approve' ? 'active' :
        action === 'reject' ? 'rejected' :
        action === 'return' ? 'return' :
        action === 'complete' ? 'complete' :
        action,
      text: this.generateLoanFeedText(loan, action, actorDiscordId),
      from: loan.borrower.discordId,
      to: merchantId || actorDiscordId,
      relatedId: loan.loanId,
      merchantName,
      merchantDiscord,
      source: loan.source,
      borrower: loan.borrower,
      amount: loan.amount,
      status: loan.status,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    };
    await this.addFeed(feed);
  }

  private static generateLoanFeedText(
    loan: Loan,
    action: 'create' | 'approve' | 'reject' | 'return' | 'complete' | 'active' | 'rejected',
    actorDiscordId: string
  ): string {
    const borrowerName = loan.borrower.name;
    const amount = loan.amount;
    const guildName = loan.source.guild;
    switch (action) {
      case 'create':
        return guildName
          ? `@${borrowerName} ขอยืม ${amount}G จากกิลด์ ${guildName}`
          : `@${borrowerName} ขอเงินกู้ ${amount}G จากร้าน @${actorDiscordId}`;
      case 'approve':
      case 'active':
        return guildName
          ? `@${actorDiscordId} (หัวกิลด์) อนุมัติคำขอ @${borrowerName} ✅`
          : `@${actorDiscordId} อนุมัติเงินกู้ให้ @${borrowerName} ✅`;
      case 'reject':
      case 'rejected':
        return guildName
          ? `@${actorDiscordId} (หัวกิลด์) ปฏิเสธคำขอ @${borrowerName}`
          : `@${actorDiscordId} ปฏิเสธเงินกู้ให้ @${borrowerName}`;
      case 'return':
        return `@${borrowerName} แจ้งคืนเงิน ${amount}G แล้ว`;
      case 'complete':
        return guildName
          ? `@${actorDiscordId} ยืนยันว่าได้รับคืนจาก @${borrowerName} ✅`
          : `@${actorDiscordId} ยืนยันว่าได้รับคืนจาก @${borrowerName} ✅`;
    }
  }

  static async addTradeFeed(merchantId: string, buyerName: string, amount: number, merchantName: string, buyerDiscord: string, merchantDiscord: string) {
    const feedRef = ref(db, 'feed/all');
    const merchantFeedRef = ref(db, `feed/merchant/${merchantId}/trade`);
    const buyerDisplay = buyerDiscord || buyerName;
    const merchantDisplay = merchantDiscord || merchantName;
    const message = `@${buyerDisplay} กดยืนยันซื้อ ${amount}G จากร้าน @${merchantDisplay}`;
    await Promise.all([
      push(feedRef, {
        text: message,
        message,
        timestamp: Date.now(),
        type: 'gold',
        subType: 'confirm',
        merchantId,
        merchantName,
        merchantDiscord,
        buyerName,
        buyerDiscord,
        amount
      }),
      push(merchantFeedRef, {
        text: message,
        message,
        timestamp: Date.now(),
        type: 'gold',
        subType: 'confirm',
        merchantName,
        merchantDiscord,
        buyerName,
        buyerDiscord,
        amount
      })
    ]);
  }

  static async addTradeCompleteFeed(merchantId: string, buyerName: string, amount: number, merchantName: string, buyerDiscord: string, merchantDiscord: string) {
    const feedRef = ref(db, 'feed/all');
    const merchantFeedRef = ref(db, `feed/merchant/${merchantId}/trade`);
    const buyerDisplay = buyerDiscord || buyerName;
    const merchantDisplay = merchantDiscord || merchantName;
    const message = `@${merchantDisplay} ยืนยันว่าเทรด ${amount}G กับ @${buyerDisplay} สำเร็จแล้ว ✅`;
    await Promise.all([
      push(feedRef, {
        text: message,
        message,
        timestamp: Date.now(),
        type: 'gold',
        subType: 'complete',
        merchantId,
        merchantName,
        merchantDiscord,
        buyerName,
        buyerDiscord,
        amount
      }),
      push(merchantFeedRef, {
        text: message,
        message,
        timestamp: Date.now(),
        type: 'gold',
        subType: 'complete',
        merchantName,
        merchantDiscord,
        buyerName,
        buyerDiscord,
        amount
      })
    ]);
  }
} 