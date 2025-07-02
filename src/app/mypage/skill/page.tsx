"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

const JOBS = [
  'ทั้งหมด',
  'Sword Master',
  'Mercenary',
  'Bowmaster',
  'Acrobat',
  'Force User',
  'Elemental Lord',
  'Paladin',
  'Priest',
  'Engineer',
  'Alchemist',
];

const CLASS_BORDER: Record<string, string> = {
  "Sword Master": "border-red-500",
  "Mercenary": "border-yellow-600",
  "Bowmaster": "border-green-500",
  "Acrobat": "border-emerald-500",
  "Force User": "border-purple-500",
  "Elemental Lord": "border-pink-500",
  "Paladin": "border-blue-500",
  "Priest": "border-sky-500",
  "Engineer": "border-amber-500",
  "Alchemist": "border-lime-500",
  "ทั้งหมด": "border-violet-600"
};

const CLASS_TEXT: Record<string, string> = {
  "Sword Master": "text-red-600",
  "Mercenary": "text-yellow-700",
  "Bowmaster": "text-green-600",
  "Acrobat": "text-emerald-600",
  "Force User": "text-purple-600",
  "Elemental Lord": "text-pink-600",
  "Paladin": "text-blue-600",
  "Priest": "text-sky-600",
  "Engineer": "text-amber-700",
  "Alchemist": "text-lime-600",
  "ทั้งหมด": "text-violet-700"
};

const CLASS_BG: Record<string, string> = {
  "Sword Master": "bg-red-500",
  "Mercenary": "bg-yellow-600",
  "Bowmaster": "bg-green-500",
  "Acrobat": "bg-emerald-500",
  "Force User": "bg-purple-500",
  "Elemental Lord": "bg-pink-500",
  "Paladin": "bg-blue-500",
  "Priest": "bg-sky-500",
  "Engineer": "bg-amber-500",
  "Alchemist": "bg-lime-500",
  "ทั้งหมด": "bg-violet-600"
};

const MOCK_BUILDS = [
  {
    id: '1',
    name: 'บิ้ว PvE สายตีเร็ว',
    job: 'Sword Master',
    author: 'User123',
    updatedAt: '2024-06-01',
  },
  {
    id: '2',
    name: 'บิ้ว PvP คริติคอล',
    job: 'Mercenary',
    author: 'User456',
    updatedAt: '2024-05-28',
  },
  {
    id: '3',
    name: 'บิ้วสายซัพพอร์ต',
    job: 'Priest',
    author: 'User789',
    updatedAt: '2024-05-20',
  },
];

export default function SkillPage() {
  const [selectedJob, setSelectedJob] = useState('ทั้งหมด');

  const filteredBuilds =
    selectedJob === 'ทั้งหมด'
      ? MOCK_BUILDS
      : MOCK_BUILDS.filter((b) => b.job === selectedJob);

  return (
    <div className="container mx-auto py-8 px-2 md:px-6">
      {/* Banner */}
      <div className="relative bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl p-6 md:p-10 mb-10 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 border border-gray-100 dark:border-gray-800 backdrop-blur-md">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-extrabold text-violet-700 dark:text-violet-300 mb-2">
            สกิล & บิ้วแนะนำ
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-base md:text-lg mb-4">
            รวมบิ้วสกิลของแต่ละอาชีพ แชร์ไอเดียและค้นหาแนวทางการอัปสกิลที่เหมาะกับคุณ
          </p>
          {/* ปุ่มกรองคลาส */}
          <div className="flex flex-wrap gap-2">
            {JOBS.map((job) => {
              // แยกสี border/text/bg ของคลาส
              if (selectedJob === job) {
                return (
                  <button
                    key={job}
                    className={`px-4 py-2 rounded-full font-bold shadow transition border-2 ${CLASS_BG[job]} ${CLASS_BORDER[job]} text-white scale-105`}
                    onClick={() => setSelectedJob(job)}
                  >
                    {job}
                  </button>
                );
              } else {
                return (
                  <button
                    key={job}
                    className={`px-4 py-2 rounded-full font-bold shadow transition border-2 bg-white/80 ${CLASS_BORDER[job]} ${CLASS_TEXT[job]} hover:bg-opacity-90 hover:shadow-md hover:scale-105`}
                    onClick={() => setSelectedJob(job)}
                  >
                    {job}
                  </button>
                );
              }
            })}
          </div>
        </div>
        {/* ปุ่มสร้างบิ้วใหม่ */}
        <div className="flex-shrink-0 flex items-center justify-end md:justify-center">
          <Link href="/mypage/skill/create">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-400 to-violet-500 text-white font-bold text-lg shadow-md hover:from-sky-500 hover:to-violet-600 hover:shadow-lg transition">
              <PlusCircle className="w-6 h-6" />
              สร้างบิ้วใหม่
            </button>
          </Link>
        </div>
      </div>

      {/* รายการบิ้ว */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredBuilds.map((build) => (
          <div
            key={build.id}
            className="bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-xl p-6 flex flex-col gap-2 border border-gray-100 dark:border-gray-800 hover:shadow-2xl transition backdrop-blur-md"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-3 py-1 rounded-full text-xs font-bold shadow border ${CLASS_BORDER[build.job]} ${CLASS_TEXT[build.job]}`}>
                {build.job}
              </span>
              <span className="text-xs text-gray-400">by {build.author}</span>
            </div>
            <h2 className="font-bold text-xl mb-1">{build.name}</h2>
            <p className="text-gray-500 text-xs mb-3">
              อัปเดตล่าสุด: {build.updatedAt}
            </p>
            <Link
              href={`/mypage/skill/${build.id}`}
              className="mt-auto"
            >
              <button className="px-4 py-2 rounded-full bg-violet-500 text-white text-sm font-semibold shadow hover:bg-violet-600 transition w-full">
                ดูรายละเอียด
              </button>
            </Link>
          </div>
        ))}
        {filteredBuilds.length === 0 && (
          <div className="col-span-full text-center text-gray-400 py-10">
            ไม่พบบิ้วสำหรับอาชีพนี้
          </div>
        )}
      </div>
    </div>
  );
} 