'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlayerRole, PlayerPosition, Currency } from '@/lib/types';
import { useMysteryPotStore, MysteryPlayer } from '@/lib/mystery-pot-store';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_OPTIONS: { value: PlayerRole; label: string }[] = [
  { value: 'Goalkeeper', label: 'Goalkeeper' },
  { value: 'Defender', label: 'Defender' },
  { value: 'Midfielder', label: 'Midfielder' },
  { value: 'Forward', label: 'Forward' },
];

const POSITION_OPTIONS: PlayerPosition[] = [
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'
];

interface EditMysteryPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  potId: string;
  mysteryPlayer: MysteryPlayer | null;
}

export function EditMysteryPlayerModal({
  open,
  onOpenChange,
  potId,
  mysteryPlayer,
}: EditMysteryPlayerModalProps) {
  const { updatePlayerInPot } = useMysteryPotStore();

  const [form, setForm] = useState({
    name: '',
    nationality: '',
    nationalityCode: '',
    position: 'CM' as PlayerPosition,
    role: 'Midfielder' as PlayerRole,
    team: '',
    basePrice: '0',
  });

  useEffect(() => {
    if (mysteryPlayer) {
      setForm({
        name: mysteryPlayer.player.name || '',
        nationality: mysteryPlayer.player.nationality || '',
        nationalityCode: mysteryPlayer.player.nationalityCode || '',
        position: mysteryPlayer.player.position || 'CM',
        role: mysteryPlayer.role || 'Midfielder',
        team: mysteryPlayer.player.team || '',
        basePrice: String(mysteryPlayer.basePrice || 0),
      });
    }
  }, [mysteryPlayer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mysteryPlayer) return;

    if (!form.name.trim() || !form.nationality.trim()) {
      toast.error('Player name and nationality are required');
      return;
    }

    const basePrice = parseInt(form.basePrice, 10) || 0;

    updatePlayerInPot(potId, mysteryPlayer.id, {
      name: form.name.trim(),
      nationality: form.nationality.trim(),
      nationalityCode: form.nationalityCode.trim().toUpperCase() || 'XX',
      position: form.position,
      role: form.role,
      team: form.team.trim() || 'Free Agent',
      basePrice,
    });

    toast.success('Updated mystery player details');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border/40 p-0 overflow-hidden rounded-3xl shadow-2xl z-50">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-gradient-to-r from-blue-950/40 via-card to-cyan-950/20">
          <DialogTitle className="font-heading font-black text-xl text-foreground flex items-center gap-2">
            <Pencil className="h-5 w-5 text-cyan-400" />
            <span>Edit Mystery Player</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            Modify classified clues, role, or base pricing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs font-mono text-muted-foreground block mb-1">Player Name *</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-mono text-muted-foreground block mb-1">Nationality *</Label>
              <Input
                required
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                className="rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-mono text-muted-foreground block mb-1">Country Code</Label>
              <Input
                maxLength={2}
                value={form.nationalityCode}
                onChange={(e) => setForm({ ...form, nationalityCode: e.target.value.toUpperCase() })}
                className="rounded-xl text-xs uppercase font-mono"
              />
            </div>

            <div>
              <Label className="text-xs font-mono text-muted-foreground block mb-1">Role</Label>
              <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val as PlayerRole })}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-mono text-muted-foreground block mb-1">Position</Label>
              <Select value={form.position} onValueChange={(val) => setForm({ ...form, position: val as PlayerPosition })}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue placeholder="Pos" />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-xs font-mono text-muted-foreground block mb-1">Club / Team</Label>
              <Input
                value={form.team}
                onChange={(e) => setForm({ ...form, team: e.target.value })}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs font-mono text-muted-foreground block mb-1">Base Price (INR)</Label>
              <Input
                type="number"
                min="0"
                step="50000"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                className="rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl px-6"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
