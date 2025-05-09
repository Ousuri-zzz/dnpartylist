import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ref, push, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { QRCodeCanvas } from 'qrcode.react';
import { useGuild } from '@/hooks/useGuild';

interface QRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SettingsData {
  base64Code: string;
  updatedAt: number;
  updatedBy: string;
}

export default function QRPaymentModal({ isOpen, onClose, onSuccess }: QRPaymentModalProps) {
  const { user } = useAuth();
  const { isGuildLeader } = useGuild();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrImage, setQrImage] = useState<string>('');
  const [base64Code, setBase64Code] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [savedBase64Code, setSavedBase64Code] = useState<string>('');
  const qrRef = useRef<HTMLDivElement>(null);

  // PromptPay number - replace with your actual PromptPay number
  const promptPayNumber = '0612319777';
  
  // โหลด base64 code ที่บันทึกไว้
  useEffect(() => {
    const loadSavedBase64Code = async () => {
      try {
        const snapshot = await get(ref(db, 'guilddonatecash/settings'));
        if (snapshot.exists()) {
          const data = snapshot.val() as Record<string, SettingsData>;
          const settings = Object.values(data).sort((a, b) => b.updatedAt - a.updatedAt);
          if (settings.length > 0) {
            const latestCode = settings[0].base64Code;
            setSavedBase64Code(latestCode);
            if (!isGuildLeader) {
              setPreviewImage(latestCode);
            }
          }
        }
      } catch (error) {
        console.error('Error loading saved base64 code:', error);
      }
    };

    loadSavedBase64Code();
  }, [isGuildLeader]);

  // Generate PromptPay payload
  const generatePromptPayPayload = (amount: number) => {
    // Remove any non-numeric characters from the PromptPay number
    const accountNumber = promptPayNumber.replace(/\D/g, '');
    
    // Format amount to 2 decimal places
    const formattedAmount = amount.toFixed(2);
    
    // Create the payload
    const payload = [
      '000201010212', // Header
      '29370016A000000677010111', // PromptPay ID
      accountNumber, // Account number
      '5802TH', // Currency code (THB)
      '5303764', // Transaction type (Transfer)
      '6304', // CRC
    ].join('');

    return payload;
  };

  const generateQRImage = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      if (canvas) {
        const imageData = canvas.toDataURL('image/png');
        setQrImage(imageData);
      }
    }
  };

  const handleBase64Input = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const code = e.target.value;
    setBase64Code(code);
    
    // ตรวจสอบว่าเป็น base64 ที่ถูกต้อง
    if (code.startsWith('data:image/')) {
      setPreviewImage(code);
    } else {
      setPreviewImage('');
      toast.error('กรุณาใส่ base64 code ที่ถูกต้อง (ต้องขึ้นต้นด้วย data:image/)');
    }
  };

  const handleSaveBase64Code = async () => {
    if (!base64Code) {
      toast.error('กรุณาใส่ base64 code');
      return;
    }

    try {
      await push(ref(db, 'guilddonatecash/settings'), {
        base64Code: base64Code,
        updatedAt: Date.now(),
        updatedBy: user?.uid
      });
      setSavedBase64Code(base64Code);
      toast.success('บันทึก base64 code สำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก base64 code');
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('กรุณาเข้าสู่ระบบ');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error('กรุณากรอกจำนวนเงินให้ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const donateData = {
        userId: user.uid,
        amount: Number(amount),
        status: 'waiting',
        createdAt: Date.now(),
        type: 'cash',
        paymentMethod: 'promptpay'
      };

      await push(ref(db, 'guilddonatecash'), donateData);
      toast.success('บันทึกการบริจาคสำเร็จ! รอการยืนยันจากหัวกิลด์');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Donation error:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกการบริจาค');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับบีบอัดข้อมูล base64
  const compressBase64 = (base64: string) => {
    // จำกัดความยาวของข้อมูล
    const maxLength = 2000; // ปรับตามความเหมาะสม
    if (base64.length <= maxLength) {
      return base64;
    }
    
    // ตัดข้อมูลส่วนเกิน
    return base64.substring(0, maxLength);
  };

  // จำกัดความยาวของข้อความสำหรับ QR Code
  const getQRValue = () => {
    if (isGuildLeader && base64Code) {
      return compressBase64(base64Code);
    }
    if (savedBase64Code) {
      return compressBase64(savedBase64Code);
    }
    return generatePromptPayPayload(Number(amount));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-pink-700 flex items-center gap-2">
            <span className="text-2xl">💖</span>
            บริจาคเงินสดผ่าน PromptPay
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="กรอกจำนวนเงิน"
              className="text-lg"
            />
          </div>

          {isGuildLeader && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="base64Code">Base64 Code จาก base64-image.de</Label>
                <Textarea
                  id="base64Code"
                  value={base64Code}
                  onChange={handleBase64Input}
                  placeholder="วาง base64 code ที่ได้จากเว็บ base64-image.de"
                  className="min-h-[100px] font-mono text-sm"
                />
                <Button
                  onClick={handleSaveBase64Code}
                  className="mt-2"
                >
                  บันทึก Base64 Code
                </Button>
              </div>

              {amount && !isNaN(Number(amount)) && Number(amount) > 0 && previewImage && (
                <div className="mt-4 flex flex-col items-center justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="w-[350px] h-[350px] object-contain"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBase64Code('');
                      setPreviewImage('');
                    }}
                    className="mt-4"
                  >
                    ลบรูปภาพ
                  </Button>
                </div>
              )}
              {amount && !isNaN(Number(amount)) && Number(amount) > 0 && !previewImage && savedBase64Code && (
                <div className="flex flex-col items-center gap-6 p-6">
                  <img 
                    src={savedBase64Code} 
                    alt="Saved QR" 
                    className="w-[350px] h-[350px] object-contain" 
                  />
                  <div className="text-center">
                    <p className="font-medium text-gray-700 text-lg">
                      สแกน QR Code เพื่อชำระเงิน
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isGuildLeader && amount && !isNaN(Number(amount)) && Number(amount) > 0 && savedBase64Code && (
            <div className="flex flex-col items-center gap-6 p-6">
              <img 
                src={savedBase64Code} 
                alt="Saved QR" 
                className="w-[350px] h-[350px] object-contain" 
              />
              <div className="text-center">
                <p className="font-medium text-gray-700 text-lg">
                  สแกน QR Code เพื่อชำระเงิน
                </p>
                <p className="text-base text-gray-600 mt-2">PromptPay: {promptPayNumber}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !amount || isNaN(Number(amount)) || Number(amount) <= 0}
              className="bg-pink-500 hover:bg-pink-600"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกการบริจาค'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 