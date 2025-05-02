import { Gift } from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Reward {
  id: string
  name: string
}

interface Event {
  id: string
  name: string
  rewards: Reward[]
}

export default function EventPage() {
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false)
  const [selectedReward, setSelectedReward] = useState<string>("")
  const [rewardAmount, setRewardAmount] = useState<number>(1)
  const [event, setEvent] = useState<Event | null>(null)

  const handleRewardSubmit = async () => {
    if (!selectedReward || !rewardAmount) return

    try {
      // TODO: Implement reward submission logic
      setIsRewardDialogOpen(false)
      setSelectedReward("")
      setRewardAmount(1)
    } catch (error) {
      console.error("Error submitting reward:", error)
    }
  }

  return (
    <div>
      <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-b from-gray-900 to-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Gift className="w-6 h-6 text-yellow-400" />
              มอบรางวัล
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              เลือกรางวัลที่จะมอบให้กับผู้เล่น
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">รางวัล</Label>
              <Select
                value={selectedReward}
                onValueChange={setSelectedReward}
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="เลือกรางวัล" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {event?.rewards.map((reward) => (
                    <SelectItem
                      key={reward.id}
                      value={reward.id}
                      className="text-white hover:bg-gray-700 focus:bg-gray-700"
                    >
                      {reward.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">จำนวน</Label>
              <Input
                type="number"
                min="1"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(parseInt(e.target.value))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRewardDialogOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleRewardSubmit}
              disabled={!selectedReward || !rewardAmount}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              <Gift className="w-4 h-4 mr-2" />
              มอบรางวัล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 