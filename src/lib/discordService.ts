import { db } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';
import { toast } from 'react-hot-toast';
import { DiscordId, DiscordMessage, FeedMessage, FeedType, FeedSubType } from '@/types/discord';

export class DiscordService {
  private static readonly DISCORD_ID_REGEX = /^\d{17,19}$/;

  static isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  static validateDiscordId(id: DiscordId): boolean {
    return this.DISCORD_ID_REGEX.test(id);
  }

  static getDiscordDMUrl(discordId: DiscordId): string {
    if (!this.validateDiscordId(discordId)) {
      throw new Error('Invalid Discord ID');
    }
    return `https://discord.com/users/${discordId}`;
  }

  static async getUserDiscordId(uid: string): Promise<DiscordId | null> {
    try {
      const userRef = ref(db, `users/${uid}/meta/discord`);
      const snapshot = await get(userRef);
      const discordId = snapshot.val();
      
      if (discordId && this.validateDiscordId(discordId)) {
        return discordId;
      }
      return null;
    } catch (error) {
      console.error('Error getting user Discord ID:', error);
      return null;
    }
  }

  static generateMessage(message: DiscordMessage): string {
    if (!this.validateDiscordId(message.sellerId)) {
      throw new Error('Invalid Discord ID');
    }

    if (message.type === 'trade') {
      return `@${message.sellerId}\nผมสนใจซื้อ ${message.itemName} ${message.amount} จากร้านของคุณ\nลิงก์ยืนยัน: ${message.confirmUrl}`;
    } else {
      if (!message.price) {
        throw new Error('Price is required for announcement');
      }
      return `📢 ร้าน @${message.sellerId} เปิดขาย ${message.itemName}\nเหลือ ${message.amount} ราคา ${message.price}\nกดซื้อ: ${message.confirmUrl}`;
    }
  }

  static async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('คัดลอกข้อความเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error copying text:', error);
      toast.error('ไม่สามารถคัดลอกข้อความได้');
    }
  }

  static async createFeedMessage(
    type: FeedType,
    subType: FeedSubType,
    from: DiscordId,
    to: DiscordId,
    relatedId: string,
    text: string
  ): Promise<void> {
    try {
      if (!this.validateDiscordId(from) || !this.validateDiscordId(to)) {
        throw new Error('Invalid Discord ID');
      }

      const timestamp = Date.now();
      const feedMessage: FeedMessage = {
        type,
        subType,
        text,
        from,
        to,
        relatedId,
        timestamp
      };

      // บันทึกใน /feed/all
      const allFeedRef = ref(db, `feed/all/${timestamp}`);
      await set(allFeedRef, feedMessage);

      // บันทึกใน feed ของผู้ขาย (ถ้าเป็นประเภท trade)
      if (type === 'gold' || type === 'item') {
        const merchantFeedRef = ref(db, `feed/merchant/${to}/trade/${timestamp}`);
        await set(merchantFeedRef, feedMessage);
      }

      // บันทึกใน feed ของผู้กู้ (ถ้าเป็นประเภท loan)
      if (type === 'loan') {
        const loanFeedRef = ref(db, `feed/loan/${relatedId}/${timestamp}`);
        await set(loanFeedRef, feedMessage);
      }

      toast.success('สร้างข้อความ Feed เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error creating feed message:', error);
      toast.error('ไม่สามารถสร้างข้อความ Feed ได้');
    }
  }

  static generateFeedText(
    type: FeedType,
    subType: FeedSubType,
    from: string,
    to: string,
    amount?: number,
    itemName?: string,
    guildName?: string
  ): string {
    switch (type) {
      case 'gold':
        switch (subType) {
          case 'create':
            return `@${from} ลงประกาศขาย Gold ${amount}G`;
          case 'confirm':
            return `@${to} กดยืนยันซื้อ ${amount}G จาก @${from}`;
          case 'complete':
            return `@${from} ยืนยันว่าเทรด ${amount}G สำเร็จ ✅`;
        }
        break;
      case 'item':
        switch (subType) {
          case 'create':
            return `@${from} ลงขายไอเทม: ${itemName}`;
          case 'confirm':
            return `@${to} ขอซื้อ ${itemName} จาก @${from}`;
          case 'complete':
            return `@${from} ยืนยันว่า ${itemName} ถูกขายแล้ว ✅`;
        }
        break;
      case 'loan':
        switch (subType) {
          case 'create':
            return guildName
              ? `@${from} ขอยืม ${amount}G จากกิลด์ ${guildName}`
              : `@${from} ขอเงินกู้ ${amount}G จากร้าน @${to}`;
          case 'confirm':
            return guildName
              ? `@${to} (หัวกิลด์) อนุมัติคำขอ @${from} ✅`
              : `@${to} อนุมัติเงินกู้ให้ @${from} ✅`;
          case 'complete':
            return `@${from} แจ้งคืนเงิน ${amount}G แล้ว`;
        }
        break;
    }
    return '';
  }
} 