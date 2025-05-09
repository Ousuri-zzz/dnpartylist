'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { FaDiscord } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DiscordNameDialogProps {
  onSubmit: (discordName: string) => void;
}

export function DiscordNameDialog({ onSubmit }: DiscordNameDialogProps) {
  const [discordName, setDiscordName] = useState('');
  const { showDiscordDialog, setShowDiscordDialog, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (showDiscordDialog && user) {
      console.log('Discord dialog should be shown');
    }
  }, [showDiscordDialog, user]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (showDiscordDialog) {
        e.preventDefault();
        e.returnValue = 'กรุณากรอก Discord Name ก่อนออกจากหน้าเว็บ';
        return e.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && showDiscordDialog) {
        toast.error('กรุณากรอก Discord Name ก่อนออกจากหน้าเว็บ');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [showDiscordDialog]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordName.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(discordName.trim());
      setShowDiscordDialog(false);
    } catch (error) {
      console.error('Error submitting discord name:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [discordName, onSubmit, isSubmitting, setShowDiscordDialog]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDiscordName(e.target.value);
  }, []);

  if (!user || !showDiscordDialog) {
    return null;
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={(e) => {
        e.preventDefault();
        toast.error('กรุณากรอก Discord Name ก่อนออกจากหน้าเว็บ');
      }}>
        <DialogHeader>
          <DialogTitle>กรุณากรอก Discord Name</DialogTitle>
          <DialogDescription>
            คุณต้องกรอก Discord Name ก่อนจึงจะสามารถใช้งานระบบได้
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discordName">Discord Name</Label>
            <Input
              id="discordName"
              value={discordName}
              onChange={handleChange}
              placeholder="กรอก Discord Name ของคุณ"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!discordName.trim()}>
            บันทึก
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 