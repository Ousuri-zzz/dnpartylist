import { db } from '@/lib/firebase';
import { ref, get, set, update, remove } from 'firebase/database';
import { GuildSettings } from '@/types/trade';
import { toast } from 'react-hot-toast';

export class GuildService {
  static async getGuild(): Promise<GuildSettings | null> {
    try {
      const guildRef = ref(db, 'guild');
      const snapshot = await get(guildRef);
      return snapshot.val();
    } catch (error) {
      console.error('Error getting guild settings:', error);
      toast.error('ไม่สามารถดึงข้อมูลกิลด์ได้');
      return null;
    }
  }

  static async initializeGuild(secretKey: string, firstLeaderUid: string) {
    try {
      const guildRef = ref(db, 'guild');
      const snapshot = await get(guildRef);
      
      if (snapshot.exists()) {
        throw new Error('Guild already exists');
      }

      const guildData = {
        name: "GalaxyCat",
        secretKey,
        leaders: {
          [firstLeaderUid]: true
        },
        members: {
          [firstLeaderUid]: {
            discordName: "Leader",
            joinedAt: new Date().toISOString()
          }
        }
      };

      await set(guildRef, guildData);
      return guildData;
    } catch (error) {
      console.error('Error initializing guild:', error);
      throw error;
    }
  }

  static async verifySecretKey(secretKey: string): Promise<boolean> {
    try {
      const settings = await this.getGuild();
      return settings?.secretKey === secretKey;
    } catch (error) {
      console.error('Error verifying secret key:', error);
      return false;
    }
  }

  static async updateGuildSettings(updates: Partial<GuildSettings>): Promise<boolean> {
    try {
      const guildRef = ref(db, 'guild');
      await update(guildRef, updates);
      toast.success('อัพเดทข้อมูลกิลด์สำเร็จ');
      return true;
    } catch (error) {
      console.error('Error updating guild settings:', error);
      toast.error('ไม่สามารถอัพเดทข้อมูลกิลด์ได้');
      return false;
    }
  }

  static async addMember(uid: string, discordName: string) {
    try {
      const memberRef = ref(db, `guild/members/${uid}`);
      const memberData = {
        discordName,
        joinedAt: new Date().toISOString()
      };
      await set(memberRef, memberData);
      // sync ไปที่ users/{uid}/meta/discord ด้วย
      const userMetaRef = ref(db, `users/${uid}/meta`);
      await update(userMetaRef, { discord: discordName });
      return memberData;
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  }

  static async removeMember(uid: string) {
    try {
      // ตรวจสอบการมีอยู่ของข้อมูลก่อนลบ
      const [memberSnapshot, userSnapshot, characterSnapshot, merchantSnapshot] = await Promise.all([
        get(ref(db, `guild/members/${uid}`)),
        get(ref(db, `users/${uid}`)),
        get(ref(db, `characters/${uid}`)),
        get(ref(db, `tradeMerchants/${uid}`))
      ]);

      // สร้าง array ของ promises สำหรับการลบข้อมูลที่มีอยู่จริง
      const removePromises = [];
      
      if (memberSnapshot.exists()) {
        removePromises.push(remove(ref(db, `guild/members/${uid}`)));
      }
      if (userSnapshot.exists()) {
        removePromises.push(remove(ref(db, `users/${uid}`)));
      }
      if (characterSnapshot.exists()) {
        removePromises.push(remove(ref(db, `characters/${uid}`)));
      }
      if (merchantSnapshot.exists()) {
        removePromises.push(remove(ref(db, `tradeMerchants/${uid}`)));
      }

      // ลบข้อมูลที่มีอยู่จริง
      await Promise.all(removePromises);
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  }

  static async isGuildLeader(uid: string): Promise<boolean> {
    try {
      const leaderRef = ref(db, `guild/leaders/${uid}`);
      const snapshot = await get(leaderRef);
      return snapshot.exists() && snapshot.val() === true;
    } catch (error) {
      console.error('Error checking guild leader:', error);
      return false;
    }
  }

  static async addLeader(uid: string): Promise<void> {
    try {
      const leaderRef = ref(db, `guild/leaders/${uid}`);
      await set(leaderRef, true);
    } catch (error) {
      console.error('Error adding leader:', error);
      throw error;
    }
  }

  static async removeLeader(uid: string): Promise<void> {
    try {
      const leaderRef = ref(db, `guild/leaders/${uid}`);
      await remove(leaderRef);
    } catch (error) {
      console.error('Error removing leader:', error);
      throw error;
    }
  }

  static async changeSecretKey(newSecretKey: string, requesterUid: string): Promise<boolean> {
    try {
      const isLeader = await this.isGuildLeader(requesterUid);
      if (!isLeader) {
        toast.error('คุณไม่มีสิทธิ์เปลี่ยนรหัสกิลด์');
        return false;
      }

      const guildRef = ref(db, 'guild/secretKey');
      await set(guildRef, newSecretKey);
      toast.success('เปลี่ยนรหัสกิลด์สำเร็จ');
      return true;
    } catch (error) {
      console.error('Error changing secret key:', error);
      toast.error('ไม่สามารถเปลี่ยนรหัสกิลด์ได้');
      return false;
    }
  }
} 