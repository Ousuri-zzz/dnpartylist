import { db } from '@/lib/firebase';
import { ref, get, set, update } from 'firebase/database';
import { Merchant } from '@/types/trade';
import { toast } from 'react-hot-toast';

export class MerchantService {
  static async getMerchant(uid: string): Promise<Merchant | null> {
    try {
      const merchantRef = ref(db, `tradeMerchants/${uid}`);
      const snapshot = await get(merchantRef);
      return snapshot.val();
    } catch (error) {
      console.error('Error getting merchant:', error);
      toast.error('ไม่สามารถดึงข้อมูลพ่อค้าได้');
      return null;
    }
  }

  static async createMerchant(merchant: Omit<Merchant, 'uid'>): Promise<string | null> {
    try {
      const merchantRef = ref(db, `tradeMerchants/${merchant.discordId}`);
      await set(merchantRef, {
        ...merchant,
        createdAt: Date.now()
      });
      toast.success('สร้างร้านค้าสำเร็จ');
      return merchant.discordId;
    } catch (error) {
      console.error('Error creating merchant:', error);
      toast.error('ไม่สามารถสร้างร้านค้าได้');
      return null;
    }
  }

  static async updateMerchant(uid: string, updates: Partial<Merchant>): Promise<boolean> {
    try {
      const merchantRef = ref(db, `tradeMerchants/${uid}`);
      await update(merchantRef, updates);
      toast.success('อัพเดทร้านค้าสำเร็จ');
      return true;
    } catch (error) {
      console.error('Error updating merchant:', error);
      toast.error('ไม่สามารถอัพเดทร้านค้าได้');
      return false;
    }
  }

  static async updateGoldAvailable(uid: string, amount: number): Promise<boolean> {
    try {
      const merchantRef = ref(db, `tradeMerchants/${uid}/goldAvailable`);
      await set(merchantRef, amount);
      return true;
    } catch (error) {
      console.error('Error updating gold available:', error);
      toast.error('ไม่สามารถอัพเดทจำนวน Gold ได้');
      return false;
    }
  }
} 