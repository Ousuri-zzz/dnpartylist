'use client';

import { useState } from 'react';
import { UserWithCharacters } from '../hooks/useUsers';
import { CharacterMainClass } from '../types/character';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { CharacterCard } from './CharacterCard';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface UserSidebarProps {
  users: UserWithCharacters[];
}

export function UserSidebar({ users }: UserSidebarProps) {
  const [selectedUser, setSelectedUser] = useState<UserWithCharacters | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  
  // Get class color
  const getClassColor = (mainClass: CharacterMainClass) => {
    switch (mainClass) {
      case 'Warrior':
        return 'bg-red-100 text-red-800';
      case 'Archer':
        return 'bg-green-100 text-green-800';
      case 'Sorceress':
        return 'bg-purple-100 text-purple-800';
      case 'Cleric':
        return 'bg-blue-100 text-blue-800';
      case 'Academic':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const handleUserClick = (user: UserWithCharacters) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };
  
  return (
    <div className="w-64 bg-white rounded-lg shadow-md p-4 h-[calc(100vh-2rem)] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Users</h2>
      
      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.uid} className="border-b pb-3">
            <div>
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [user.uid]: !prev[user.uid] }))}
                className="flex items-center w-full hover:bg-gray-50 p-2 rounded-md transition-colors gap-2 cursor-pointer select-none"
              >
                {expanded[user.uid] ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <span className="font-medium text-lg whitespace-nowrap overflow-hidden text-ellipsis">
                  {user.meta?.discord || 'Unknown User'}
                </span>
              </button>
              {expanded[user.uid] && user.characters && Object.keys(user.characters).length > 0 && (
                <div className="mt-2 space-y-1 ml-6">
                  {Object.values(user.characters).map((char) => (
                    <div
                      key={char.id}
                      className={`px-2 py-1 rounded-md text-sm cursor-pointer ${getClassColor(char.mainClass as CharacterMainClass)} hover:bg-gray-100`}
                      onClick={() => handleUserClick(user)}
                    >
                      {char.name} ({char.class})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedUser?.meta?.discord || 'Unknown User'}'s Characters</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {selectedUser?.characters && Object.values(selectedUser.characters).map((char) => (
              <CharacterCard 
                key={char.id} 
                character={char} 
                onEdit={() => {}} 
                onDelete={() => {}} 
                onChecklistChange={() => {}} 
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 