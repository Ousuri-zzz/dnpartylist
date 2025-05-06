import React from 'react';
import { Feed } from '@/types/feed';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

interface FeedListProps {
  feeds: Feed[];
  loading: boolean;
  error: Error | null;
}

export const FeedList: React.FC<FeedListProps> = ({ feeds, loading, error }) => {
  if (loading) {
    return <div className="text-center py-4">กำลังโหลด...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">เกิดข้อผิดพลาด: {error.message}</div>;
  }

  if (feeds.length === 0) {
    return <div className="text-center py-4">ไม่มีข้อมูล</div>;
  }

  return (
    <div className="space-y-3 max-h-[520px] overflow-y-auto bg-gradient-to-b from-pink-50 to-purple-50 rounded-xl p-2 border border-pink-100 shadow-inner">
      {feeds.map((feed) => (
        <div
          key={feed.timestamp}
          className="p-3 bg-white/80 rounded-lg shadow border border-pink-100 flex flex-col gap-1 hover:bg-pink-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-pink-300"></span>
            <span className="text-gray-700 text-sm font-medium truncate">{feed.text}</span>
          </div>
          <div className="flex items-center text-xs text-gray-400 mt-1 gap-2">
            <span>
              {formatDistanceToNow(feed.timestamp, {
                addSuffix: true,
                locale: th,
              })}
            </span>
            <span className="mx-1">•</span>
            <span className="capitalize rounded px-2 py-0.5 bg-pink-100 text-pink-600 font-semibold">
              {feed.type === 'gold' && 'Gold'}
              {feed.type === 'item' && 'ไอเทม'}
              {feed.type === 'loan' && 'กู้ยืม'}
            </span>
            {feed.type === 'loan' && (
              <span className={
                feed.subType === 'complete' || feed.subType === 'return'
                  ? 'ml-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold'
                  : feed.subType === 'active'
                  ? 'ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold'
                  : feed.subType === 'rejected'
                  ? 'ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold'
                  : 'ml-2 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-bold'
              }>
                {feed.subType === 'complete' || feed.subType === 'return'
                  ? 'สำเร็จแล้ว'
                  : feed.subType === 'active'
                  ? 'อนุมัติแล้ว'
                  : feed.subType === 'rejected'
                  ? 'ยกเลิก'
                  : 'รอดำเนินการ'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}; 