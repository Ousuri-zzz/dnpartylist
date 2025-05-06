import { db } from '@/lib/firebase';
import { ref, get, set, update } from 'firebase/database';
import { Loan } from '@/types/trade';
import { toast } from 'react-hot-toast';
import { DiscordService } from './discordService';
import { GuildService } from './guildService';
import { FeedService } from './feedService';

export class LoanService {
  static async createLoan(loan: Omit<Loan, 'loanId'>): Promise<string | null> {
    try {
      const loanId = Date.now().toString();
      const loanPath = loan.source.type === 'guild' ? 'guildLoans' : 'merchantLoans';
      const loanRef = ref(db, `${loanPath}/${loanId}`);
      const newLoan = {
        ...loan,
        type: loan.source.type,
        loanId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await set(loanRef, newLoan);
      
      // Create feed message
      await FeedService.addLoanFeed(newLoan, 'create', loan.borrower.discordId);
      
      return loanId;
    } catch (error) {
      console.error('Error creating loan:', error);
      toast.error('ไม่สามารถสร้างคำขอกู้ยืมได้');
      return null;
    }
  }

  static async getLoan(loanId: string): Promise<Loan | null> {
    try {
      const loanRef = ref(db, `guildLoans/${loanId}`);
      const snapshot = await get(loanRef);
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error('Error getting loan:', error);
      toast.error('ไม่สามารถดึงข้อมูลกู้ยืมได้');
      return null;
    }
  }

  static async updateLoan(loanId: string, updates: Partial<Loan>): Promise<boolean> {
    try {
      const loanRef = ref(db, `merchantLoans/${loanId}`);
      await update(loanRef, {
        ...updates,
        updatedAt: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error updating loan:', error);
      toast.error('ไม่สามารถอัพเดทข้อมูลกู้ยืมได้');
      return false;
    }
  }

  static async approveLoan(
    loanId: string,
    approverDiscordId: string
  ): Promise<boolean> {
    try {
      const loan = await this.getLoan(loanId);
      if (!loan) {
        toast.error('ไม่พบข้อมูลการกู้ยืม');
        return false;
      }

      // ตรวจสอบว่าเป็นกู้ยืมจากกิลด์หรือไม่
      if (loan.source.type === 'guild' && loan.source.guild) {
        // ตรวจสอบสิทธิ์หัวกิลด์
        const isLeader = await GuildService.isGuildLeader(approverDiscordId);
        if (!isLeader) {
          toast.error('คุณไม่มีสิทธิ์อนุมัติการกู้ยืม');
          return false;
        }
      }

      const prevStatus = loan.status;
      const loanPath = loan.source.type === 'guild' ? 'guildLoans' : 'merchantLoans';
      const loanRef = ref(db, `${loanPath}/${loanId}`);
      await update(loanRef, {
        status: 'active',
        updatedAt: Date.now()
      });

      // Create feed message เฉพาะถ้าเดิมเป็น waitingApproval
      if (prevStatus === 'waitingApproval') {
        await FeedService.addLoanFeed({ ...loan, status: 'active' }, 'approve', approverDiscordId);
      }

      // หัก Gold ออกจาก trade เมื่ออนุมัติ loan (เฉพาะ merchant loan)
      const tradeId = loan.tradeId || loan.source?.tradeId;
      if (loan.source.type === 'merchant' && tradeId) {
        const tradeRef = ref(db, `trade/${tradeId}`);
        const tradeSnap = await get(tradeRef);
        const tradeData = tradeSnap.val();
        if (tradeData) {
          const newAmountLeft = (tradeData.amountLeft || 0) - loan.amount;
          await update(tradeRef, {
            amountLeft: newAmountLeft,
            status: newAmountLeft <= 0 ? 'closed' : 'open'
          });
        }
      }

      toast.success('อนุมัติคำขอกู้ยืมสำเร็จ');
      return true;
    } catch (error) {
      console.error('Error approving loan:', error);
      toast.error('ไม่สามารถอนุมัติคำขอกู้ยืมได้');
      return false;
    }
  }

  static async markLoanAsReturned(loanId: string): Promise<boolean> {
    try {
      const loan = await this.getLoan(loanId);
      if (!loan) {
        toast.error('ไม่พบข้อมูลการกู้ยืม');
        return false;
      }
      const loanPath = loan.source.type === 'guild' ? 'guildLoans' : 'merchantLoans';
      const loanRef = ref(db, `${loanPath}/${loanId}`);
      await update(loanRef, {
        status: 'returned',
        updatedAt: Date.now()
      });
      await FeedService.addLoanFeed(loan, 'return', loan.borrower.discordId);
      toast.success('อัพเดทสถานะการคืนเงินสำเร็จ');
      return true;
    } catch (error) {
      console.error('Error marking loan as returned:', error);
      toast.error('ไม่สามารถอัพเดทสถานะการคืนเงินได้');
      return false;
    }
  }

  static async completeLoan(
    loanId: string,
    approverDiscordId: string
  ): Promise<boolean> {
    try {
      const loan = await this.getLoan(loanId);
      if (!loan) {
        toast.error('ไม่พบข้อมูลการกู้ยืม');
        return false;
      }

      // ตรวจสอบว่าเป็นกู้ยืมจากกิลด์หรือไม่
      if (loan.source.type === 'guild' && loan.source.guild) {
        // ตรวจสอบสิทธิ์หัวกิลด์
        const isLeader = await GuildService.isGuildLeader(approverDiscordId);
        if (!isLeader) {
          toast.error('คุณไม่มีสิทธิ์ยืนยันการคืนเงิน');
          return false;
        }
      }

      const loanPath = loan.source.type === 'guild' ? 'guildLoans' : 'merchantLoans';
      const loanRef = ref(db, `${loanPath}/${loanId}`);
      await update(loanRef, {
        status: 'completed',
        updatedAt: Date.now()
      });

      // Create feed message
      await FeedService.addLoanFeed(loan, 'complete', approverDiscordId);

      toast.success('ยืนยันการคืนเงินสำเร็จ');
      return true;
    } catch (error) {
      console.error('Error completing loan:', error);
      toast.error('ไม่สามารถยืนยันการคืนเงินได้');
      return false;
    }
  }

  static async rejectLoan(
    loanId: string,
    approverDiscordId: string
  ): Promise<boolean> {
    try {
      const loan = await this.getLoan(loanId);
      if (!loan) {
        toast.error('ไม่พบข้อมูลการกู้ยืม');
        return false;
      }

      // ตรวจสอบว่าเป็นกู้ยืมจากกิลด์หรือไม่
      if (loan.source.type === 'guild' && loan.source.guild) {
        // ตรวจสอบสิทธิ์หัวกิลด์
        const isLeader = await GuildService.isGuildLeader(approverDiscordId);
        if (!isLeader) {
          toast.error('คุณไม่มีสิทธิ์ปฏิเสธการกู้ยืม');
          return false;
        }
      }

      const loanPath = loan.source.type === 'guild' ? 'guildLoans' : 'merchantLoans';
      const loanRef = ref(db, `${loanPath}/${loanId}`);
      await update(loanRef, {
        status: 'rejected',
        updatedAt: Date.now()
      });

      // Create feed message
      await FeedService.addLoanFeed(loan, 'reject', approverDiscordId);

      toast.success('ปฏิเสธคำขอกู้ยืมสำเร็จ');
      return true;
    } catch (error) {
      console.error('Error rejecting loan:', error);
      toast.error('ไม่สามารถปฏิเสธคำขอกู้ยืมได้');
      return false;
    }
  }
} 