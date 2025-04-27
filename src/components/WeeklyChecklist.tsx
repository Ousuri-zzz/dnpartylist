import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Character } from "@/types/character";
import { cn } from "@/lib/utils";

interface WeeklyChecklistProps {
  character: Character;
}

const weeklyTasks = [
  { id: 'weekly-boss', name: 'บอสประจำสัปดาห์', icon: '👑' },
  { id: 'weekly-raid', name: 'เรด', icon: '🗡️' },
  { id: 'weekly-pvp', name: 'PvP Ranking', icon: '🏆' },
  { id: 'weekly-guild', name: 'กิจกรรมกิลด์', icon: '🎯' },
];

interface StatDisplayProps {
  label: string;
  value: number;
  icon: string;
  suffix?: string;
  className?: string;
}

function StatDisplay({ label, value, icon, suffix = "", className }: StatDisplayProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg",
      "bg-white/5 backdrop-blur-sm",
      className
    )}>
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-gray-600">{label}</p>
        <p className="text-sm font-medium text-gray-900">
          {value.toLocaleString()}{suffix}
        </p>
      </div>
    </div>
  );
}

export function WeeklyChecklist({ character }: WeeklyChecklistProps) {
  return (
    <Card className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-xl border border-purple-100/30">
      <CardHeader>
        <CardTitle className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Weekly Checklist
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatDisplay
            label="ATK"
            value={character.stats.atk || 0}
            icon="⚔️"
            className="bg-red-500/10"
          />
          <StatDisplay
            label="HP"
            value={character.stats.hp || 0}
            icon="❤️"
            className="bg-green-500/10"
          />
          <StatDisplay
            label="DEF"
            value={character.stats.pdef || 0}
            icon="🛡️"
            className="bg-blue-500/10"
          />
          <StatDisplay
            label="CRI"
            value={character.stats.cri || 0}
            icon="🎯"
            suffix="%"
            className="bg-yellow-500/10"
          />
          <StatDisplay
            label="ELE"
            value={character.stats.ele || 0}
            icon="🔥"
            suffix="%"
            className="bg-purple-500/10"
          />
          <StatDisplay
            label="FD"
            value={character.stats.fd || 0}
            icon="💥"
            suffix="%"
            className="bg-orange-500/10"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          {weeklyTasks.map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-lg bg-white/50 border border-purple-100/50 hover:bg-white/70 transition-colors cursor-pointer group"
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


