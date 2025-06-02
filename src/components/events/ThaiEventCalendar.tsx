import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const thaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const thaiWeekdays = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

interface ThaiEventCalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
}

export function ThaiEventCalendar({ selected, onSelect }: ThaiEventCalendarProps) {
  return (
    <Calendar
      locale="th-TH"
      value={selected}
      onChange={date => {
        if (date && !Array.isArray(date) && onSelect) onSelect(date);
      }}
      calendarType="iso8601"
      next2Label={null}
      prev2Label={null}
      nextLabel="›"
      prevLabel="‹"
      formatMonthYear={(_locale, date) => `${thaiMonths[date.getMonth()]} ${date.getFullYear()}`}
      formatShortWeekday={(_locale, date) => thaiWeekdays[date.getDay() === 0 ? 6 : date.getDay() - 1]}
      tileClassName={({ date, view }) =>
        view === 'month' && selected && date.toDateString() === selected.toDateString()
          ? 'bg-blue-500 text-white rounded-full !hover:bg-blue-600'
          : ''
      }
      className="bg-white/90 backdrop-blur-sm border border-pink-200 shadow-xl rounded-2xl p-4"
    />
  );
} 