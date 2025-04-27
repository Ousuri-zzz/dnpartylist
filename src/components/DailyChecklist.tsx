import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Character } from "@/types/character";

interface DailyChecklistProps {
  character: Character;
}

const dailyTasks = [
  { id: 'daily-login', name: 'เช็คอิน', icon: '📝' },
  { id: 'daily-quest', name: 'เควสประจำวัน', icon: '📜' },
  { id: 'daily-dungeon', name: 'ดันเจี้ยนประจำวัน', icon: '🏰' },
  { id: 'daily-arena', name: 'อารีน่า', icon: '⚔️' },
  { id: 'daily-expedition', name: 'สำรวจ', icon: '🗺️' },
  { id: 'daily-guild', name: 'กิลด์', icon: '🏛️' },
];

export function DailyChecklist({ character }: DailyChecklistProps) {
  return (
    <Card className="bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-xl border border-blue-100/30">
      <CardHeader>
        <CardTitle className="text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Daily Checklist
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {dailyTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-lg bg-white/50 border border-blue-100/50 hover:bg-white/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl group-hover:scale-110 transition-transform">
                  {task.icon}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {task.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 