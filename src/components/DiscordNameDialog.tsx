'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { FaDiscord } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';

interface DiscordNameDialogProps {
  onSubmit: (discordName: string) => void;
}

export function DiscordNameDialog({ onSubmit }: DiscordNameDialogProps) {
  const [discordName, setDiscordName] = useState('');
  const { showDiscordDialog, setShowDiscordDialog } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordName.trim()) return;
    onSubmit(discordName.trim());
  };

  return (
    <Dialog open={showDiscordDialog} onOpenChange={setShowDiscordDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FaDiscord className="text-[#5865F2]" />
            ตั้งชื่อ Discord
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            กรอกชื่อ Discord ของคุณเพื่อใช้งานระบบ
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="discordName">ชื่อ Discord</Label>
            <Input
              id="discordName"
              value={discordName}
              onChange={(e) => setDiscordName(e.target.value)}
              placeholder="username#1234"
              className="bg-[#383A40] border-0 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-[#5865F2]"
              required
            />
          </div>
          <Button 
            type="submit"
            className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white transition-colors"
            disabled={!discordName.trim()}
          >
            บันทึก
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 