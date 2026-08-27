'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  Search,
  Plus,
  Shield,
  Trophy,
  Layers,
  Lock,
  Unlock,
  Radio,
  Trash2,
  FolderPlus,
  Pencil,
  Check,
  Building2,
  X,
  Wand2,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import Image from 'next/image';
import { useMysteryPotStore, MysteryPot, MysteryPlayer } from '@/lib/mystery-pot-store';
import { useAuctionStore } from '@/lib/auction-store';
import { Currency, PlayerRole } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { AddMysteryPlayerModal } from './add-mystery-player-modal';
import { EditMysteryPlayerModal } from './edit-mystery-player-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function MysteryPotScreen() {
  const { teams, assignMysteryPlayer, updateMysteryPlayerName, removeMysteryPlayers, settings } = useAuctionStore();

  const {
    pots,
    activePotId,
    selectedPlayerId,
    addPot,
    removePot,
    setActivePotId,
    setSelectedPlayerId,
    removePlayerFromPot,
    toggleRevealPlayer,
    toggleLockPlayer,
    resetPotAssignments,
    assignPlayerToTeam,
    unassignPlayerFromTeam,
  } = useMysteryPotStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [editingMysteryPlayer, setEditingMysteryPlayer] = useState<MysteryPlayer | null>(null);
  const [showAddPotModal, setShowAddPotModal] = useState(false);
  const [newPotTitle, setNewPotTitle] = useState('');
  const [newPotSubtitle, setNewPotSubtitle] = useState('');

  // Shuffling / Drawing state
  const [isShuffling, setIsShuffling] = useState(false);
  const [shufflingActiveId, setShufflingActiveId] = useState<string | null>(null);
  const [hasDrawnCard, setHasDrawnCard] = useState(false);

  // 3D Smooth Spin Flip Accumulator
  const [flipDegree, setFlipDegree] = useState(0);
  const [isCardFlipping, setIsCardFlipping] = useState(false);

  // Assign to team modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignSoldPrice, setAssignSoldPrice] = useState<string>('');
  const [selectedAssignTeamId, setSelectedAssignTeamId] = useState<string>('');

  // Fallback if no active pot is selected
  useEffect(() => {
    if (!activePotId && pots.length > 0) {
      setActivePotId(pots[0].id);
    }
  }, [activePotId, pots, setActivePotId]);

  const activePot = pots.find((p) => p.id === activePotId) || pots[0] || null;

  const currentPlayers = useMemo(() => {
    return activePot ? activePot.players : [];
  }, [activePot]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery.trim()) return currentPlayers;
    const q = searchQuery.toLowerCase();
    return currentPlayers.filter(
      (mp, index) =>
        `mystery ${mp.role} #${index + 1}`.toLowerCase().includes(q) ||
        mp.player.name.toLowerCase().includes(q) ||
        mp.role.toLowerCase().includes(q) ||
        mp.player.position.toLowerCase().includes(q) ||
        mp.player.nationality.toLowerCase().includes(q) ||
        (mp.assignedTeamName && mp.assignedTeamName.toLowerCase().includes(q))
    );
  }, [currentPlayers, searchQuery]);

  const activePlayer = useMemo(() => {
    if (!selectedPlayerId || !hasDrawnCard) return null;
    return currentPlayers.find((p) => p.id === selectedPlayerId) || null;
  }, [currentPlayers, selectedPlayerId, hasDrawnCard]);

  const activePlayerIndex = useMemo(() => {
    if (!activePlayer) return -1;
    return currentPlayers.findIndex((p) => p.id === activePlayer.id);
  }, [currentPlayers, activePlayer]);

  // Handle Create Pot Submit
  const handleCreatePotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPotTitle.trim()) {
      toast.error('Please enter a pot name');
      return;
    }
    addPot(newPotTitle.trim(), newPotSubtitle.trim() || 'CUSTOM MYSTERY SEED');
    toast.success(`Created ${newPotTitle.trim()}!`);
    setNewPotTitle('');
    setNewPotSubtitle('');
    setShowAddPotModal(false);
  };

  // Eye Button: Smooth 3D spin flip with continuous rotation
  const handleEyeRevealTrigger = (mp: MysteryPlayer) => {
    if (!activePot || isCardFlipping || isShuffling) return;

    setSelectedPlayerId(mp.id);
    setHasDrawnCard(true);
    setIsCardFlipping(true);

    // Continuous cumulative 1080deg forward rotation
    setFlipDegree((prev) => prev + 1080);

    // Smooth reveal switch at mid-spin
    setTimeout(() => {
      toggleRevealPlayer(activePot.id, mp.id);
    }, 400);

    setTimeout(() => {
      setIsCardFlipping(false);
    }, 1100);
  };

  // Lock / Unlock Player Name in Points Table Roster
  const handleToggleLockPlayer = (mp: MysteryPlayer, index: number) => {
    if (!activePot) return;
    const nextLocked = !mp.isLocked;
    toggleLockPlayer(activePot.id, mp.id);

    const maskedName = `MYSTERY ${mp.role.toUpperCase()} #${String(index + 1).padStart(2, '0')}`;

    if (nextLocked) {
      updateMysteryPlayerName(mp.id, mp.player.name);
      toast.success(`Locked & Confirmed: "${mp.player.name}" is now revealed in the points table!`);
    } else {
      updateMysteryPlayerName(mp.id, maskedName);
      toast.info(`Unlocked: Reverted back to "${maskedName}" in the points table.`);
    }
  };

  // Reset all assignments in active pot & clear right side card
  const handleResetPotAssignments = () => {
    if (!activePot) return;
    if (
      confirm(
        `Reset all team assignments for ${activePot.title}? All players will remain in the mystery pot.`
      )
    ) {
      const playerIds = activePot.players.map((p) => p.id);
      resetPotAssignments(activePot.id);
      removeMysteryPlayers(playerIds);
      setSelectedPlayerId(null);
      setHasDrawnCard(false);
      toast.success(`Reset team assignments for ${activePot.title}. Players kept in pot.`);
    }
  };

  // Shuffle & Draw Mystery Card with Wand Animation
  const handleDrawMysteryCard = () => {
    if (isShuffling || currentPlayers.length === 0 || !activePot) return;

    // Pick from unassigned players first, or any player if all assigned
    const unassigned = currentPlayers.filter((p) => !p.assignedTeamId);
    const candidates = unassigned.length > 0 ? unassigned : currentPlayers;
    const targetPlayer = candidates[Math.floor(Math.random() * candidates.length)];

    setIsShuffling(true);
    setHasDrawnCard(false);

    // Dynamic deceleration shuffle sequence
    const delays = [50, 50, 50, 60, 60, 70, 80, 100, 130, 170, 220, 300, 420, 600];
    let step = 0;

    const runShuffleStep = () => {
      if (step < delays.length - 1) {
        const randomCandidate = currentPlayers[Math.floor(Math.random() * currentPlayers.length)];
        setShufflingActiveId(randomCandidate.id);
        const delay = delays[step];
        step++;
        setTimeout(runShuffleStep, delay);
      } else {
        setShufflingActiveId(targetPlayer.id);
        setSelectedPlayerId(targetPlayer.id);
        setTimeout(() => {
          setIsShuffling(false);
          setShufflingActiveId(null);
          setHasDrawnCard(true);
          const idx = currentPlayers.findIndex((p) => p.id === targetPlayer.id);
          toast.success(`Drawn: Mystery ${targetPlayer.role} #${String(idx + 1).padStart(2, '0')}!`);
        }, 300);
      }
    };

    runShuffleStep();
  };

  // Open Assign to Team Modal
  const handleOpenAssignModal = () => {
    if (!activePlayer) return;
    setAssignSoldPrice(String(activePlayer.soldPrice || activePlayer.basePrice));
    setSelectedAssignTeamId(activePlayer.assignedTeamId || (teams[0]?.id ?? ''));
    setShowAssignModal(true);
  };

  // Confirm Assign to Team
  const handleConfirmAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlayer || !activePot) return;

    const targetTeam = teams.find((t) => t.id === selectedAssignTeamId);
    if (!targetTeam) {
      toast.error('Please select a valid team');
      return;
    }

    const price = parseFloat(assignSoldPrice) || activePlayer.basePrice;
    const maskedName = activePlayer.isLocked
      ? activePlayer.player.name
      : `MYSTERY ${activePlayer.role.toUpperCase()} #${String(activePlayerIndex + 1).padStart(2, '0')}`;

    // 1. Update Mystery Pot store
    assignPlayerToTeam(activePot.id, activePlayer.id, targetTeam.id, targetTeam.name, price);

    // 2. Update Auction store for points table & team roster
    assignMysteryPlayer({
      mysteryId: activePlayer.id,
      maskedName,
      role: activePlayer.role,
      position: activePlayer.player.position,
      nationality: activePlayer.player.nationality,
      teamId: targetTeam.id,
      soldPrice: price,
      currency: activePlayer.currency,
    });

    toast.success(`Assigned ${maskedName} to ${targetTeam.name}!`);
    setShowAssignModal(false);
  };

  // 3D Pointer Spring Tilt Math
  const cardRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateXSpring = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), {
    stiffness: 220,
    damping: 24,
  });
  const rotateYSpring = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 220,
    damping: 24,
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current || isCardFlipping) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto flex flex-col gap-6 select-none will-change-transform">
      {/* Subdued Dark Ambient Backing */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none rounded-[36px]">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-[#003BDE]/12 via-[#001D70]/08 to-transparent blur-3xl opacity-30" />
      </div>

      {/* Main Header with Dynamic Island Glass Polish */}
      <div className="flex flex-col items-center text-center gap-2 pt-2 pb-2">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-black tracking-tight text-white uppercase drop-shadow-[0_2px_20px_rgba(0,0,0,0.9)]">
          MYSTERY PLAYER POTS
        </h1>
        <p className="text-sm font-sans italic text-white/75 max-w-xl">
          "what is anything if there's no mystery in it."
        </p>
      </div>

      {/* 4-Column Grid Pot Selector with Dynamic Island Depth */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full">
        {pots.map((pot) => {
          const isActive = activePot?.id === pot.id;
          return (
            <button
              key={pot.id}
              type="button"
              onClick={() => {
                setActivePotId(pot.id);
                setSelectedPlayerId(null);
                setHasDrawnCard(false);
              }}
              className={cn(
                'relative group flex flex-col justify-between p-4.5 rounded-2xl transition-all duration-200 text-left border min-h-[112px]',
                'backdrop-blur-2xl overflow-hidden',
                isActive
                  ? 'bg-black/50 border-cyan-400/40 shadow-[0_20px_50px_rgba(0,32,128,0.5),0_0_25px_rgba(56,189,248,0.15),inset_0_1px_1px_rgba(255,255,255,0.22)] text-white'
                  : 'bg-black/50 border-white/15 hover:bg-black/65 hover:border-cyan-500/30 text-white/70 hover:text-white shadow-[0_15px_35px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.18)]'
              )}
            >
              {/* Chamfer Corner Accent */}
              <div
                className={cn(
                  'absolute top-0 right-0 w-8 h-8 pointer-events-none transition-opacity',
                  isActive ? 'opacity-100' : 'opacity-25 group-hover:opacity-50'
                )}
                style={{
                  background: `linear-gradient(135deg, transparent 50%, rgba(56,189,248,0.25) 50%)`,
                }}
              />

              {/* Pot Tab Banner */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-mono font-black tracking-wider uppercase bg-gradient-to-r text-white shadow-md',
                    pot.tabGradient
                  )}
                >
                  {pot.title}
                </span>

                <span className="text-[11px] font-mono text-cyan-300/90 bg-cyan-950/50 border border-cyan-500/25 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                  {pot.players.length} Players
                </span>
              </div>

              <div>
                <h4 className="font-heading font-black text-sm text-white truncate">
                  {pot.subtitle || 'MYSTERY SEED'}
                </h4>
                <span className="text-[11px] font-mono text-cyan-400/70 block mt-0.5">Classified Pool</span>
              </div>
            </button>
          );
        })}

        {/* Add Pot Action Card */}
        <button
          type="button"
          onClick={() => setShowAddPotModal(true)}
          className="relative group flex flex-col items-center justify-center p-4.5 rounded-2xl border border-dashed border-cyan-400/30 hover:border-cyan-400 bg-black/40 hover:bg-black/60 backdrop-blur-2xl transition-all duration-200 text-center gap-2 min-h-[112px] shadow-[0_15px_35px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.15)]"
        >
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition-transform shadow-inner">
            <Plus className="h-4 w-4" />
          </div>
          <span className="font-heading font-black text-xs uppercase tracking-wider text-cyan-300">
            Add New Pot
          </span>
        </button>
      </div>

      {/* Symmetrical Split Matrix Stage */}
      {activePot ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch mt-1">
          {/* LEFT CONTAINER: Mystery Players List (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between h-[620px] rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/15 p-6 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.85),0_0_25px_rgba(255,255,255,0.04),inset_0_1px_1px_rgba(255,255,255,0.18)] relative overflow-hidden">
            {/* Top Sheen Edge */}
            <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {/* List Header: Title on Left, Actions on Right */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-white bg-gradient-to-tr shadow-md flex-shrink-0',
                    activePot.tabGradient
                  )}
                >
                  ★
                </div>
                <div>
                  <h3 className="font-heading font-black text-base text-white uppercase tracking-tight">
                    {activePot.title}
                  </h3>
                  <span className="text-xs font-mono text-cyan-300/70">
                    {filteredPlayers.length} Mystery Entries
                  </span>
                </div>
              </div>

              {/* Action Buttons: Reset Assignments & Search & Add Player */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
                {/* Reset Assignments Button */}
                {currentPlayers.some((p) => p.assignedTeamId) && (
                  <button
                    type="button"
                    onClick={handleResetPotAssignments}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-mono font-bold text-xs border border-amber-500/35 transition-all flex-shrink-0 backdrop-blur-md shadow-sm"
                    title="Reset all team assignments in this pot"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                )}

                <div className="relative flex-1 sm:w-36">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-cyan-300/50" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400 focus:bg-black/80 transition-all backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] flex-shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Player</span>
                </button>
              </div>
            </div>

            {/* Middle: Clean Minimized Row Items */}
            <div className="flex-1 overflow-y-auto pr-1.5 my-3 flex flex-col gap-2.5 overscroll-contain will-change-transform custom-scrollbar">
              {filteredPlayers.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/60 gap-3 py-12">
                  <div className="w-12 h-12 rounded-2xl bg-black/50 border border-white/15 flex items-center justify-center text-cyan-300 shadow-inner">
                    <Radio className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-heading font-bold text-sm text-white">No players in this pot</p>
                    <p className="text-xs text-cyan-300/60 font-mono mt-0.5">
                      Click 'Add Player' to add mystery entries.
                    </p>
                  </div>
                </div>
              ) : (
                filteredPlayers.map((mp, index) => {
                  const isCurrentActive = mp.id === (selectedPlayerId || '');
                  const isShuffleActive = mp.id === shufflingActiveId;
                  const isHighlighted = isShuffleActive || (isCurrentActive && !isShuffling && hasDrawnCard);

                  const maskedTitle = `MYSTERY ${mp.role.toUpperCase()} #${String(index + 1).padStart(2, '0')}`;

                  return (
                    <div
                      key={mp.id}
                      onClick={() => {
                        if (!isShuffling && !isCardFlipping) {
                          setSelectedPlayerId(mp.id);
                          setHasDrawnCard(true);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-150 border backdrop-blur-xl',
                        isHighlighted
                          ? 'bg-gradient-to-r from-[#003BDE]/35 via-[#04165D]/60 to-black/60 border-cyan-400/40 shadow-[0_0_20px_rgba(0,180,255,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                          : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      )}
                    >
                      {/* Left: Index + (Aesthetic Face Avatar when unmasked) + Masked / Unmasked Name + Status */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span
                          className={cn(
                            'w-6 text-center text-xs font-mono font-bold tabular-nums shrink-0',
                            isHighlighted ? 'text-cyan-400 font-black' : 'text-white/40'
                          )}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        {/* Small Aesthetic Face Thumbnail when Unmasked or Eleven Shield when Classified */}
                        <div className="relative w-8 h-8 rounded-xl overflow-hidden bg-black/60 border border-white/15 shrink-0 shadow-inner flex items-center justify-center">
                          {mp.isRevealed ? (
                            mp.player.photo ? (
                              <Image
                                src={mp.player.photo}
                                alt={mp.player.name}
                                fill
                                className="object-cover object-top"
                                sizes="32px"
                              />
                            ) : (
                              <span className="font-heading font-black text-xs text-cyan-400">
                                {mp.player.name ? mp.player.name.charAt(0).toUpperCase() : '?'}
                              </span>
                            )
                          ) : (
                            <Image
                              src="/logo/eleven-card.png"
                              alt="Eleven Shield"
                              fill
                              className="object-contain p-1 opacity-80"
                              sizes="32px"
                            />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0 flex-1">
                          {mp.isRevealed ? (
                            /* Unmasked Row State */
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-heading font-black tracking-tight text-white truncate">
                                {mp.player.name}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                                UNMASKED
                              </span>
                            </div>
                          ) : (
                            /* Masked Row State */
                            <span
                              className={cn(
                                'text-sm font-heading font-black tracking-tight truncate',
                                isHighlighted ? 'text-white' : 'text-white/90'
                              )}
                            >
                              {maskedTitle}
                            </span>
                          )}

                          <div className="flex items-center gap-2 mt-0.5">
                            {mp.isRevealed ? (
                              <span className="text-[11px] font-mono text-white/60 truncate">
                                {mp.player.nationality} • {mp.player.team} • {mp.role}
                              </span>
                            ) : mp.assignedTeamName ? (
                              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                <span>Assigned to {mp.assignedTeamName}</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-white/40">
                                Unassigned
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Controls: Eye Flip Trigger, Lock, Edit, Delete */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* 1. Eye Button: Triggers smooth spin flip on right-side card */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEyeRevealTrigger(mp);
                          }}
                          className={cn(
                            'p-2 rounded-xl border transition-all backdrop-blur-md shadow-sm',
                            mp.isRevealed
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]'
                              : 'bg-white/[0.05] hover:bg-white/[0.12] text-white/60 hover:text-white border-white/15'
                          )}
                          title={mp.isRevealed ? 'Click to trigger spin flip & mask' : 'Click to trigger 3D spin flip & reveal'}
                        >
                          {mp.isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>

                        {/* 2. Confirm / Lock Button for Points Table Roster */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLockPlayer(mp, index);
                          }}
                          className={cn(
                            'p-2 rounded-xl border transition-all backdrop-blur-md shadow-sm',
                            mp.isLocked
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                              : 'bg-white/[0.05] hover:bg-white/[0.12] text-white/50 hover:text-amber-400 border-white/15'
                          )}
                          title={
                            mp.isLocked
                              ? 'Locked: Real name is confirmed in points table. Click to unlock & revert to mystery name'
                              : 'Lock & Confirm: Reveal real name in points table drawer'
                          }
                        >
                          {mp.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>

                        {/* 3. Edit Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMysteryPlayer(mp);
                          }}
                          className="p-2 rounded-xl bg-white/[0.05] hover:bg-cyan-500/20 text-white/50 hover:text-cyan-300 border border-white/15 hover:border-cyan-500/30 transition-colors backdrop-blur-md shadow-sm"
                          title="Edit Mystery Player"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {/* 4. Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete ${maskedTitle}?`)) {
                              removePlayerFromPot(activePot.id, mp.id);
                              if (mp.assignedTeamId) {
                                unassignPlayerFromTeam(activePot.id, mp.id);
                                removeMysteryPlayers([mp.id]);
                              }
                              toast.success('Mystery player deleted');
                            }
                          }}
                          className="p-2 rounded-xl bg-white/[0.05] hover:bg-red-500/20 text-white/50 hover:text-red-400 border border-white/15 hover:border-red-500/30 transition-colors backdrop-blur-md shadow-sm"
                          title="Delete Mystery Player"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Info Bar */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] font-mono text-cyan-300/70 flex items-center gap-1.5">
                <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
                {currentPlayers.filter((p) => p.assignedTeamId).length} of {currentPlayers.length} assigned to teams
              </span>

              <button
                type="button"
                onClick={() => setShowAddPlayerModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 text-xs font-mono font-bold text-cyan-300 border border-white/15 transition-all shadow-sm backdrop-blur-xl"
              >
                <Plus className="h-3.5 w-3.5 text-cyan-300" />
                <span>Add Player</span>
              </button>
            </div>
          </div>

          {/* RIGHT CONTAINER: Perfectly Symmetrical Stage & Trading Card (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center h-[620px] rounded-3xl bg-black/50 backdrop-blur-2xl border border-white/15 p-6 shadow-[0_25px_60px_-12px_rgba(0,0,0,0.85),0_0_25px_rgba(255,255,255,0.04),inset_0_1px_1px_rgba(255,255,255,0.18)] relative overflow-hidden">
            {/* Top Sheen Edge */}
            <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

            {/* Show ONLY Magic Wand Draw Stage if no card has been drawn */}
            {!hasDrawnCard || !activePlayer ? (
              <div className="w-full max-w-[280px] rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/15 p-8 flex flex-col items-center justify-center text-center text-white gap-4 my-auto shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.18)]">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#020B3B] to-[#0A2E9E] border border-cyan-400/30 flex items-center justify-center shadow-[0_0_25px_rgba(0,71,255,0.35)]">
                  <Wand2 className="h-8 w-8 text-cyan-400 animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h3 className="font-heading font-black text-lg text-white uppercase tracking-tight">
                    Draw Mystery Card
                  </h3>
                  <p className="text-xs font-mono text-cyan-300/60 max-w-[210px] mx-auto">
                    Click below to draw a classified player card from {activePot.title}.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isShuffling || currentPlayers.length === 0}
                  onClick={handleDrawMysteryCard}
                  className="w-full py-3 px-5 rounded-xl font-heading font-black text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Wand2 className="h-4 w-4" />
                  <span>{isShuffling ? 'Shuffling Pots...' : 'DRAW MYSTERY CARD'}</span>
                </button>
              </div>
            ) : (
              /* When card is drawn / selected: Symmetrical Roster Trading Card Layout */
              <div className="w-full max-w-[280px] flex flex-col items-center gap-3.5 my-auto">
                <div
                  ref={cardRef}
                  onPointerMove={handlePointerMove}
                  onPointerLeave={handlePointerLeave}
                  style={{ perspective: '1200px' }}
                  className="w-full flex flex-col items-center"
                >
                  {/* Outer Tilt & 3D Container (Handles Pointer Hover Springs) */}
                  <motion.div
                    style={{
                      rotateX: isCardFlipping ? 0 : rotateXSpring,
                      rotateY: isCardFlipping ? 0 : rotateYSpring,
                      transformStyle: 'preserve-3d',
                    }}
                    className="w-full flex flex-col items-center"
                  >
                    {/* Inner Card (Handles Pure Y Rotation without spring collisions) */}
                    <motion.div
                      animate={{
                        rotateY: flipDegree,
                        scale: isCardFlipping ? [1, 1.05, 1] : 1,
                      }}
                      transition={{
                        rotateY: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
                        scale: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
                      }}
                      style={{
                        transformStyle: 'preserve-3d',
                      }}
                      className={cn(
                        'relative w-full rounded-2xl p-[1.5px] bg-gradient-to-b from-cyan-500/50 via-blue-600/30 to-cyan-500/10',
                        'shadow-[0_20px_50px_rgba(0,32,128,0.5),0_0_20px_rgba(56,189,248,0.15)]',
                        'group transition-shadow duration-300 overflow-hidden'
                      )}
                    >
                      {/* Inner Dynamic Island Glass Body */}
                      <div className="relative rounded-[14.5px] bg-[#070e24]/90 backdrop-blur-2xl flex flex-col justify-between overflow-hidden border border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18)]">
                        {/* Top Action / Status Row */}
                        <div className="p-2.5 pb-1.5 flex items-center justify-between gap-1.5 relative z-20">
                          {/* Role Pill */}
                          <span className="px-2.5 py-0.5 rounded-md text-[10.5px] font-mono font-black uppercase tracking-wider border border-cyan-500/30 bg-cyan-500/15 text-cyan-300 shadow-sm">
                            {activePlayer.role}
                          </span>

                          {/* Classified / Confirmed Badge */}
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase tracking-wider border shadow-sm backdrop-blur-md flex items-center gap-1',
                              activePlayer.isLocked
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : activePlayer.isRevealed
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            )}
                          >
                            {activePlayer.isLocked ? (
                              <>
                                <Check className="h-3 w-3" /> CONFIRMED
                              </>
                            ) : activePlayer.isRevealed ? (
                              <>
                                <Eye className="h-3 w-3" /> UNMASKED
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" /> CLASSIFIED
                              </>
                            )}
                          </span>
                        </div>

                        {/* Portrait Frame (aspect-[3/4]) */}
                        <div
                          className="relative aspect-[3/4] mx-2.5 my-1.5 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-inner group-hover:border-white/20 transition-colors flex items-center justify-center"
                          style={{ aspectRatio: '3 / 4' }}
                        >
                          {activePlayer.isRevealed ? (
                            <div className="relative w-full h-full">
                              {activePlayer.player.photo ? (
                                <Image
                                  src={activePlayer.player.photo}
                                  alt={activePlayer.player.name}
                                  fill
                                  className="object-cover object-top"
                                  sizes="260px"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-black via-zinc-900 to-[#04165D] text-cyan-400">
                                  <span className="font-heading font-black text-3xl">
                                    {activePlayer.player.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                              {/* Bottom Vignette */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />
                            </div>
                          ) : (
                            <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#020B3B] via-[#04165D] to-black overflow-hidden">
                              {/* Eleven Card Emblem Background */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                                <div className="relative w-36 h-36">
                                  <Image
                                    src="/logo/eleven-card.png"
                                    alt="Eleven Mystery Shield"
                                    fill
                                    className="object-contain drop-shadow-[0_0_25px_rgba(56,189,248,0.45)]"
                                  />
                                </div>
                              </div>

                              {/* Concentric Rotating Mystery Rings */}
                              <div className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm border border-cyan-400/30 shadow-[0_0_20px_rgba(0,71,255,0.35)]">
                                <div className="absolute inset-2 rounded-full border border-cyan-400/30 animate-spin [animation-duration:15s]" />
                                <div className="absolute inset-4 rounded-full border border-cyan-300/20 animate-spin [animation-duration:10s] [animation-direction:reverse]" />
                                <span className="text-3xl font-heading font-black text-cyan-400 drop-shadow-[0_0_15px_#38bdf8]">
                                  ?
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Country Flag Pill */}
                          <div className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/15 text-[10.5px] font-mono text-foreground/90 flex items-center gap-1.5 shadow-sm">
                            <span>🏳️</span>
                            <span className="font-bold">{activePlayer.player.nationality}</span>
                          </div>
                        </div>

                        {/* Info Details Section */}
                        <div className="p-3 pt-2 space-y-2">
                          <div>
                            <h3 className="font-heading font-black text-sm sm:text-base truncate leading-tight tracking-tight text-white">
                              {activePlayer.isRevealed
                                ? activePlayer.player.name
                                : `MYSTERY ${activePlayer.role.toUpperCase()} #${String(activePlayerIndex + 1).padStart(2, '0')}`}
                            </h3>
                            <p className="text-[11px] font-medium text-white/60 truncate mt-0.5">
                              {activePlayer.isRevealed
                                ? `${activePlayer.player.team} • ${activePlayer.player.league}`
                                : `Country: ${activePlayer.player.nationality}`}
                            </p>
                          </div>

                          {/* Base Price Vault Tag */}
                          {activePlayer.basePrice !== undefined && (
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                              <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                                BASE PRICE
                              </span>
                              <span className="font-heading font-black text-sm sm:text-base text-white tabular-nums">
                                {formatCurrency(activePlayer.basePrice, activePlayer.currency)}
                              </span>
                            </div>
                          )}

                          {/* Assigned Team Tag */}
                          {activePlayer.assignedTeamName && (
                            <div className="pt-1.5 flex items-center justify-between text-xs font-mono text-emerald-400 border-t border-white/5">
                              <span className="text-[9.5px] uppercase tracking-wider text-emerald-400/80">Assigned Team</span>
                              <span className="font-bold">{activePlayer.assignedTeamName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </div>

                {/* Action CTAs underneath the trading card */}
                <div className="flex flex-col gap-2 w-full">
                  <button
                    type="button"
                    onClick={handleOpenAssignModal}
                    className="w-full py-2.5 px-4 rounded-xl font-heading font-black text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-[0_10px_25px_rgba(56,189,248,0.35)] transition-all flex items-center justify-center gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    <span>{activePlayer.assignedTeamName ? 'Reassign to Team' : 'Assign to Team'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isShuffling || isCardFlipping}
                    onClick={handleDrawMysteryCard}
                    className="w-full py-2 px-3 rounded-xl text-xs font-mono text-cyan-300/80 hover:text-cyan-300 bg-black/60 hover:bg-black/80 border border-white/15 transition-all flex items-center justify-center gap-2 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>Draw Another Mystery Card</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-2xl border border-white/15 rounded-3xl p-8 shadow-2xl">
          <FolderPlus className="h-10 w-10 text-cyan-400" />
          <h3 className="font-heading font-black text-lg text-white">No Pots Created Yet</h3>
          <p className="text-xs font-mono text-white/50 max-w-sm">
            Create your first mystery pot to start adding and drawing classified football cards.
          </p>
          <button
            type="button"
            onClick={() => setShowAddPotModal(true)}
            className="mt-2 px-6 py-2.5 rounded-2xl bg-cyan-500 text-black font-mono font-bold text-xs hover:bg-cyan-400 transition-all shadow-md"
          >
            Create First Pot
          </button>
        </div>
      )}

      {/* Add Mystery Player Modal */}
      {activePot && (
        <AddMysteryPlayerModal
          open={showAddPlayerModal}
          onOpenChange={setShowAddPlayerModal}
          potId={activePot.id}
          potTitle={activePot.title}
        />
      )}

      {/* Edit Mystery Player Modal */}
      {activePot && (
        <EditMysteryPlayerModal
          open={!!editingMysteryPlayer}
          onOpenChange={(open) => !open && setEditingMysteryPlayer(null)}
          potId={activePot.id}
          mysteryPlayer={editingMysteryPlayer}
        />
      )}

      {/* Assign to Team Floating Dialog with Dynamic Island Materials */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md bg-black/85 backdrop-blur-3xl border border-white/15 p-0 overflow-hidden rounded-3xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_25px_80px_rgba(0,0,0,0.9)] z-50">
          <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-blue-950/40 to-cyan-950/20">
            <DialogTitle className="font-heading font-black text-xl text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-cyan-400" />
              <span>Assign Mystery Card to Team</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-cyan-300/70 mt-0.5">
              {activePlayer && (
                <>
                  Assigning <strong className="text-white">MYSTERY {activePlayer.role.toUpperCase()} #{String(activePlayerIndex + 1).padStart(2, '0')}</strong> to an active auction team.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmAssign} className="p-6 flex flex-col gap-4">
            {/* Price Input */}
            <div>
              <label className="text-xs font-mono text-cyan-300 block mb-1.5">
                Sold Price ({activePlayer?.currency || 'INR'})
              </label>
              <Input
                type="number"
                required
                min="0"
                value={assignSoldPrice}
                onChange={(e) => setAssignSoldPrice(e.target.value)}
                className="rounded-xl h-11 text-sm font-mono font-bold bg-black/50 border-white/15 text-white"
              />
            </div>

            {/* Team Selection */}
            <div>
              <label className="text-xs font-mono text-cyan-300 block mb-1.5">
                Select Member Team ({teams.length} Teams Available)
              </label>
              {teams.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-center">
                  No teams registered in the auction yet. Create teams in the settings tab first.
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {teams.map((team) => {
                    const isSelected = selectedAssignTeamId === team.id;
                    return (
                      <div
                        key={team.id}
                        onClick={() => setSelectedAssignTeamId(team.id)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all text-xs backdrop-blur-md',
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-white font-bold shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                            : 'bg-black/40 border-white/10 text-white/70 hover:bg-white/5 hover:border-cyan-500/30'
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield className={cn('h-4 w-4', isSelected ? 'text-cyan-400' : 'text-white/40')} />
                          <span>{team.name}</span>
                          <span className="text-[10px] text-white/40 font-mono">({team.owner})</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-cyan-400" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-white/10 mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAssignModal(false)}
                className="rounded-xl text-xs text-white/70 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={teams.length === 0 || !selectedAssignTeamId}
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl px-6"
              >
                Confirm Assignment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Pot Modal */}
      <Dialog open={showAddPotModal} onOpenChange={setShowAddPotModal}>
        <DialogContent className="max-w-md bg-black/85 backdrop-blur-3xl border border-white/15 p-0 overflow-hidden rounded-3xl shadow-2xl z-50">
          <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-black to-cyan-950/20">
            <DialogTitle className="font-heading font-black text-xl text-foreground flex items-center gap-2 text-white">
              <FolderPlus className="h-5 w-5 text-cyan-400" />
              <span>Create New Mystery Pot</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60 mt-0.5">
              Organize your unrevealed cards into custom named pots.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePotSubmit} className="p-6 flex flex-col gap-4">
            <div>
              <label className="text-xs font-mono text-white/70 block mb-1.5">
                Pot Name * (e.g. POT 1, GOLD TIER, WILDCARD)
              </label>
              <Input
                required
                placeholder="e.g. POT 1"
                value={newPotTitle}
                onChange={(e) => setNewPotTitle(e.target.value)}
                className="rounded-xl h-11 text-xs bg-black/50 border-white/15 text-white"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-mono text-white/70 block mb-1.5">
                Subtitle / Description (Optional)
              </label>
              <Input
                placeholder="e.g. World Class & Icons"
                value={newPotSubtitle}
                onChange={(e) => setNewPotSubtitle(e.target.value)}
                className="rounded-xl h-11 text-xs bg-black/50 border-white/15 text-white"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddPotModal(false)}
                className="rounded-xl text-xs text-white/70 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-heading font-black text-xs uppercase tracking-wider rounded-xl px-6"
              >
                Create Pot
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
