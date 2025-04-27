'use client';

import React, { useState } from 'react';

interface DiscordNameDialogProps {
  onSubmit: (discordName: string) => void;
}

export function DiscordNameDialog({ onSubmit }: DiscordNameDialogProps) {
  const [discordName, setDiscordName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(discordName);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">กรอกชื่อ Discord ของคุณ</h2>
        <p className="text-sm text-gray-500 mb-4">
          ชื่อ Discord นี้จะแสดงในตัวละครทั้งหมดของคุณ
        </p>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                ชื่อ Discord
              </label>
              <input
                type="text"
                value={discordName}
                onChange={(e) => setDiscordName(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="username#1234"
                required
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              type="submit"
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 