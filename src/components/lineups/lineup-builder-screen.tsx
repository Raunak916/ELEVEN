'use client';

import { useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Sparkles,
  RotateCcw,
  Download,
  Shield,
  Users,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PitchBoard } from '@/components/lineups/pitch-board';
import { RosterSidebar } from '@/components/lineups/roster-sidebar';
import { PlayerPickerDialog } from '@/components/lineups/player-picker-dialog';
import { FORMATIONS, DEFAULT_FORMATION_ID, getFormation } from '@/lib/formations';
import { useAuctionStore } from '@/lib/auction-store';
import { LineupSlot, AuctionPlayer, Team } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LineupBuilderScreenProps {
  team: Team;
}

export function LineupBuilderScreen({ team }: LineupBuilderScreenProps) {
  const router = useRouter();
  const pitchExportRef = useRef<HTMLDivElement>(null);

  const {
    auctionPlayers,
    lineups,
    setTeamFormation,
    assignPlayerToSlot,
    autoAssignLineup,
    clearTeamLineup,
  } = useAuctionStore();

  // Get current team lineup state
  const teamLineup = lineups[team.id] || {
    teamId: team.id,
    formationId: DEFAULT_FORMATION_ID,
    assignments: {},
  };

  const formation = useMemo(
    () => getFormation(teamLineup.formationId),
    [teamLineup.formationId]
  );

  // Get players belonging to this team
  const teamPlayers = useMemo(
    () => auctionPlayers.filter((ap) => ap.teamId === team.id),
    [auctionPlayers, team.id]
  );

  // Drag & Drop State
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  // Modal Picker State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<LineupSlot | null>(null);
  const [currentSlotPlayer, setCurrentSlotPlayer] = useState<AuctionPlayer | null>(null);

  // Export Loading State
  const [isExporting, setIsExporting] = useState(false);

  // Handle Slot Click (opens modal picker)
  const handleSlotClick = useCallback(
    (slot: LineupSlot, currentPlayer: AuctionPlayer | null) => {
      setSelectedSlot(slot);
      setCurrentSlotPlayer(currentPlayer);
      setPickerOpen(true);
    },
    []
  );

  // Handle Slot Drop (from drag & drop)
  const handleSlotDrop = useCallback(
    (slot: LineupSlot, playerId: string) => {
      assignPlayerToSlot(team.id, slot.positionId, playerId);
      const droppedPlayer = teamPlayers.find((p) => p.id === playerId);
      if (droppedPlayer) {
        toast.success(`Assigned ${droppedPlayer.player.name} to ${slot.label}`);
      }
    },
    [team.id, assignPlayerToSlot, teamPlayers]
  );

  // Handle Remove Player from a slot
  const handleRemovePlayer = useCallback(
    (positionId: string) => {
      assignPlayerToSlot(team.id, positionId, null);
    },
    [team.id, assignPlayerToSlot]
  );

  // Handle Select from modal picker
  const handleSelectFromPicker = useCallback(
    (slot: LineupSlot, player: AuctionPlayer) => {
      assignPlayerToSlot(team.id, slot.positionId, player.id);
      toast.success(`Assigned ${player.player.name} to ${slot.label}`);
    },
    [team.id, assignPlayerToSlot]
  );

  // Handle Quick Place from sidebar into first open matching slot
  const handleAssignToNextSlot = useCallback(
    (player: AuctionPlayer) => {
      // Find open slot that matches role, or any open slot
      const emptySlots = formation.slots.filter(
        (slot) => !teamLineup.assignments[slot.positionId]
      );

      const matchingSlot =
        emptySlots.find((s) => s.role === player.role) || emptySlots[0];

      if (matchingSlot) {
        assignPlayerToSlot(team.id, matchingSlot.positionId, player.id);
        toast.success(`Assigned ${player.player.name} to ${matchingSlot.label}`);
      } else {
        toast.error('Starting XI is full. Click a player on pitch to swap.');
      }
    },
    [formation.slots, teamLineup.assignments, team.id, assignPlayerToSlot]
  );

  // Handle Export Lineup as PNG Image
  const handleExportImage = async () => {
    if (!pitchExportRef.current) return;

    setIsExporting(true);
    const toastId = toast.loading('Generating tactical lineup snapshot...');

    try {
      // Wait for fonts & images
      await document.fonts?.ready;

      const dataUrl = await toPng(pitchExportRef.current, {
        cacheBust: true,
        pixelRatio: 2.5, // High resolution crisp export
        backgroundColor: '#030806',
      });

      const safeTeamName = team.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const link = document.createElement('a');
      link.download = `${safeTeamName}_Lineup_${formation.id}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('Lineup image exported successfully!', { id: toastId });
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export lineup image. Try again.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const assignedCount = Object.values(teamLineup.assignments).filter(Boolean).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation & Team Info Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#0a0e14]/90 backdrop-blur-2xl border border-white/10 shadow-xl">
        {/* Left: Back & Team Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Link href="/auction/lineups">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 shrink-0"
              title="Back to Lineups Hub"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight truncate">
                {team.name}
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30">
                {assignedCount}/11 Starters
              </span>
            </div>
            <p className="text-xs text-white/50 font-mono mt-0.5">
              Owner: <span className="text-white/80 font-bold">{team.owner}</span> · {teamPlayers.length} squad players
            </p>
          </div>
        </div>

        {/* Right: Formation & Controls Toolbar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Formation Selector Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white/40 hidden sm:inline">
              FORMATION:
            </span>
            <Select
              value={teamLineup.formationId}
              onValueChange={(val) => {
                if (val) setTeamFormation(team.id, val);
              }}
            >
              <SelectTrigger className="h-10 w-[160px] sm:w-[180px] rounded-xl bg-black/50 border-white/15 text-xs sm:text-sm font-heading font-bold text-white focus:ring-[var(--gold)]">
                <SelectValue placeholder="Select Formation" />
              </SelectTrigger>
              <SelectContent className="bg-[#0b0f17]/98 backdrop-blur-2xl border-white/15 text-white">
                {FORMATIONS.map((f) => (
                  <SelectItem
                    key={f.id}
                    value={f.id}
                    className="text-xs font-mono font-bold flex items-center justify-between cursor-pointer"
                  >
                    <span>{f.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-Fill Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => autoAssignLineup(team.id)}
            disabled={teamPlayers.length === 0}
            className="h-10 px-3.5 rounded-xl gap-1.5 border-[var(--gold)]/30 text-[var(--gold)] hover:bg-[var(--gold)]/10 font-heading font-bold text-xs"
            title="Automatically assign best squad players to slots"
          >
            <Sparkles className="w-4 h-4 text-[var(--gold)]" />
            <span className="hidden sm:inline">Auto-Fill</span>
          </Button>

          {/* Clear Lineup Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => clearTeamLineup(team.id)}
            disabled={assignedCount === 0}
            className="h-10 px-3 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
            title="Clear all starting XI positions"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          {/* Export PNG Snapshot Button */}
          <Button
            type="button"
            onClick={handleExportImage}
            disabled={isExporting}
            className="h-10 px-4 rounded-xl gap-2 font-heading font-black text-xs uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : 'Export Image'}</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Tactical Pitch (Left) + Squad Roster (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Pitch Tactical Board Column */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center">
          <PitchBoard
            formation={formation}
            assignments={teamLineup.assignments}
            teamPlayers={teamPlayers}
            onSlotClick={handleSlotClick}
            onSlotDrop={handleSlotDrop}
            onRemovePlayer={handleRemovePlayer}
            draggedPlayerId={draggedPlayerId}
            pitchRef={pitchExportRef}
            teamName={team.name}
          />
        </div>

        {/* Squad Roster Sidebar Column */}
        <div className="lg:col-span-5 xl:col-span-4 h-[640px] lg:h-[720px] sticky top-20">
          <RosterSidebar
            teamPlayers={teamPlayers}
            assignments={teamLineup.assignments}
            onDragStart={(id) => setDraggedPlayerId(id)}
            onDragEnd={() => setDraggedPlayerId(null)}
            onAssignToNextSlot={handleAssignToNextSlot}
          />
        </div>
      </div>

      {/* Slot Player Selection Modal */}
      <PlayerPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        slot={selectedSlot}
        currentPlayer={currentSlotPlayer}
        teamPlayers={teamPlayers}
        assignments={teamLineup.assignments}
        onSelectPlayer={handleSelectFromPicker}
      />
    </div>
  );
}
