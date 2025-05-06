import { db } from '@/lib/firebase';
import { ref, get, set, update } from 'firebase/database';
import { GoldTrade, TradeItem } from '@/types/trade';
import { toast } from 'react-hot-toast';
import { DiscordService } from './discordService';

export class TradeService {
  // Gold Trading
  static async createGoldTrade(trade: Omit<GoldTrade, 'tradeId'>): Promise<string | null> {
    try {
      const tradeId = Date.now().toString();
      const tradeRef = ref(db, `trade/${tradeId}`);
      await set(tradeRef, {
        ...trade,
        createdAt: Date.now()
      });
      toast.success('สร้างรายการขาย Gold สำเร็จ');
      return tradeId;
    } catch (error) {
      console.error('Error creating gold trade:', error);
      toast.error('ไม่สามารถสร้างรายการขาย Gold ได้');
      return null;
    }
  }

  static async getGoldTrade(tradeId: string): Promise<GoldTrade | null> {
    try {
      const tradeRef = ref(db, `trade/${tradeId}`);
      const snapshot = await get(tradeRef);
      return snapshot.val();
    } catch (error) {
      console.error('Error getting gold trade:', error);
      toast.error('ไม่สามารถดึงข้อมูลการขาย Gold ได้');
      return null;
    }
  }

  static async updateGoldTrade(tradeId: string, updates: Partial<GoldTrade>): Promise<boolean> {
    try {
      const tradeRef = ref(db, `trade/${tradeId}`);
      await update(tradeRef, updates);
      return true;
    } catch (error) {
      console.error('Error updating gold trade:', error);
      toast.error('ไม่สามารถอัพเดทการขาย Gold ได้');
      return false;
    }
  }

  static async confirmGoldTrade(
    tradeId: string,
    buyerUid: string,
    amount: number
  ): Promise<boolean> {
    try {
      const tradeRef = ref(db, `trade/${tradeId}`);
      const trade = await this.getGoldTrade(tradeId);
      
      if (!trade || trade.amountLeft < amount) {
        toast.error('จำนวน Gold ไม่เพียงพอ');
        return false;
      }

      await update(tradeRef, {
        amountLeft: trade.amountLeft - amount,
        [`confirms/${buyerUid}`]: {
          amount,
          status: 'waiting',
          confirmedAt: Date.now()
        }
      });

      toast.success('ยืนยันการซื้อ Gold สำเร็จ');
      return true;
    } catch (error) {
      console.error('Error confirming gold trade:', error);
      toast.error('ไม่สามารถยืนยันการซื้อ Gold ได้');
      return false;
    }
  }

  // Item Trading
  static async createItem(item: Omit<TradeItem, 'itemId'>): Promise<string | null> {
    try {
      const itemId = Date.now().toString();
      const itemRef = ref(db, `tradeItems/${itemId}`);
      await set(itemRef, {
        ...item,
        createdAt: Date.now()
      });
      toast.success('สร้างรายการขายไอเทมสำเร็จ');
      return itemId;
    } catch (error) {
      console.error('Error creating trade item:', error);
      toast.error('ไม่สามารถสร้างรายการขายไอเทมได้');
      return null;
    }
  }

  static async getItem(itemId: string): Promise<TradeItem | null> {
    try {
      const itemRef = ref(db, `tradeItems/${itemId}`);
      const snapshot = await get(itemRef);
      return snapshot.val();
    } catch (error) {
      console.error('Error getting trade item:', error);
      toast.error('ไม่สามารถดึงข้อมูลไอเทมได้');
      return null;
    }
  }

  static async updateItem(itemId: string, updates: Partial<TradeItem>): Promise<boolean> {
    try {
      const itemRef = ref(db, `tradeItems/${itemId}`);
      await update(itemRef, updates);
      return true;
    } catch (error) {
      console.error('Error updating trade item:', error);
      toast.error('ไม่สามารถอัพเดทไอเทมได้');
      return false;
    }
  }

  static async markItemAsSold(itemId: string): Promise<boolean> {
    try {
      const itemRef = ref(db, `tradeItems/${itemId}`);
      await update(itemRef, {
        status: 'sold',
        updatedAt: Date.now()
      });
      toast.success('อัพเดทสถานะไอเทมสำเร็จ');
      return true;
    } catch (error) {
      console.error('Error marking item as sold:', error);
      toast.error('ไม่สามารถอัพเดทสถานะไอเทมได้');
      return false;
    }
  }
} 