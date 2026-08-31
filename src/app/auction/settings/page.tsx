'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuctionStore } from '@/lib/auction-store';
import { useRoomStore } from '@/lib/room-store';
import { useHydrated } from '@/lib/use-hydrated';
import { cn, formatCurrency } from '@/lib/utils';
import { Trophy, Trash2, Settings, Palette, Users, UserPlus, CheckCircle2, AlertTriangle, Lock, Check, Radio, Copy, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AuctionPlayer, CURRENCY_LOCALES, Player, PlayerRole, Currency, PlayerCategory, PlayerPosition } from '@/lib/types';

export default function SettingsPage() {
  const { auctionPlayers, setAuctionPlayers, settings, updateSettings, teams, addTeam, removeTeam, completeAuction } = useAuctionStore();
  const { hostedRoom, createdCode, isCreating, isJoining, createRoom, joinRoom, markHostedRoomCompleted, clearHostedRoom } = useRoomStore();
  const hydrated = useHydrated();
  const [defaultCurrency, setDefaultCurrency] = useState(settings?.currency || 'INR');
  const [maxTeamBudget, setMaxTeamBudget] = useState(settings?.maxTeamBudget || 20000000);
  const [budgetInput, setBudgetInput] = useState(() => (settings?.maxTeamBudget || 20000000).toLocaleString('en-IN'));
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinContestantIdInput, setJoinContestantIdInput] = useState('');
  const [joinNameInput, setJoinNameInput] = useState('');
  const [joinTeamNameInput, setJoinTeamNameInput] = useState('');
  const [hasCopiedCode, setHasCopiedCode] = useState(false);

  const currentAuctionMode = settings?.auctionMode || (createdCode && hostedRoom?.status === 'LIVE' ? 'ROOM' : 'VANILLA');

  const handleSelectMode = (mode: 'VANILLA' | 'ROOM') => {
    if (mode === 'VANILLA') {
      updateSettings({ currency: defaultCurrency, maxTeamBudget, auctionMode: 'VANILLA' });
      clearHostedRoom();
      toast.success('Switched to Vanilla Mode (Offline). Manual team management enabled.');
    } else {
      updateSettings({ currency: defaultCurrency, maxTeamBudget, auctionMode: 'ROOM' });
      toast.success('Switched to Room Mode. Contestants will enter using the room code.');
    }
  };

  // Sync settings when loaded
  useEffect(() => {
    if (hydrated && settings) {
      setDefaultCurrency(settings.currency);
      setMaxTeamBudget(settings.maxTeamBudget);
      const locale = CURRENCY_LOCALES[settings.currency as keyof typeof CURRENCY_LOCALES] || 'en-IN';
      setBudgetInput(settings.maxTeamBudget.toLocaleString(locale));
    }
  }, [hydrated, settings]);

  const handleCurrencyChange = (newCurr: Currency) => {
    setDefaultCurrency(newCurr);
    updateSettings({ currency: newCurr, maxTeamBudget, auctionMode: currentAuctionMode });
    const locale = CURRENCY_LOCALES[newCurr as keyof typeof CURRENCY_LOCALES] || 'en-US';
    setBudgetInput(maxTeamBudget.toLocaleString(locale));
    toast.success(`Default currency updated to ${newCurr}`);
  };

  const handleConfirmBudget = () => {
    const rawDigits = budgetInput.replace(/[^0-9]/g, '');
    const num = parseInt(rawDigits, 10);
    if (isNaN(num) || num <= 0) {
      toast.error('Please enter a valid positive budget amount');
      return;
    }
    setMaxTeamBudget(num);
    updateSettings({ currency: defaultCurrency, maxTeamBudget: num, auctionMode: currentAuctionMode });
    const locale = CURRENCY_LOCALES[defaultCurrency as keyof typeof CURRENCY_LOCALES] || 'en-US';
    setBudgetInput(num.toLocaleString(locale));
    toast.success(`Starter max budget set to ${formatCurrency(num, defaultCurrency)}`);
  };

  const displayTotalPlayers = hydrated ? auctionPlayers.length : 0;
  const displayAvailableCount = hydrated ? auctionPlayers.filter(p => p.status === 'AVAILABLE').length : 0;
  const displayUnsoldCount = hydrated ? auctionPlayers.filter(p => p.status === 'UNSOLD').length : 0;
  const displayDrawnCount = hydrated ? auctionPlayers.filter(p => p.status === 'DRAWN').length : 0;
  const displayCategoriesCount = hydrated ? new Set(auctionPlayers.map(p => p.player.category)).size : 0;

  const handleCreateRoom = async () => {
    updateSettings({ auctionMode: 'ROOM' });
    // Reset previous room teams & draw state for a clean slate
    useAuctionStore.setState({
      teams: [],
      drawnPlayer: null,
      drawPhase: 'idle',
    });

    const res = await createRoom({
      currency: defaultCurrency,
      maxTeamBudget,
    });
    if (res.success && res.code) {
      toast.success(`Room created! Code: ${res.code}`);
    } else {
      toast.error(res.error || 'Failed to create room');
    }
  };

  const handleCopyCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      setHasCopiedCode(true);
      toast.success('Room code copied to clipboard');
      setTimeout(() => setHasCopiedCode(false), 2000);
    }
  };

  // Auto-restore previous contestant ID, Name, and Team Name if saved in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('eleven_contestant_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.contestantId) setJoinContestantIdInput(parsed.contestantId);
        if (parsed.name) setJoinNameInput(parsed.name);
        if (parsed.teamName) setJoinTeamNameInput(parsed.teamName);
      }
    } catch {}
  }, []);

  // Auto-heal completed room roster from latest history snapshot if empty
  useEffect(() => {
    if (!hydrated) return;
    const history = useAuctionStore.getState().history;
    const code = hostedRoom?.code || createdCode;
    if (!code || history.length === 0 || hostedRoom?.status !== 'COMPLETED') return;

    const latestSnapshot = history[history.length - 1];
    if (latestSnapshot && Array.isArray(latestSnapshot.participants)) {
      const snapshotTeams = latestSnapshot.participants.map(p => ({
        id: p.id,
        name: p.name,
        owner: p.owner,
        customMaxBudget: (p.budgetLeft || 0) + (p.budgetSpent || 0),
        customBudgetSpent: p.budgetSpent,
        otherExpenses: p.otherExpenses || [],
      }));

      const snapshotPlayers: any[] = [];
      for (const p of latestSnapshot.participants) {
        if (Array.isArray(p.players)) {
          for (const pl of p.players) {
            snapshotPlayers.push({
              id: pl.playerId,
              playerId: pl.playerId,
              teamId: p.id,
              soldPrice: pl.soldPrice,
              status: 'DRAWN',
              role: pl.role,
              currency: pl.currency,
              player: {
                name: pl.playerName,
                role: pl.role,
                photo: '',
              },
            });
          }
        }
      }

      if (snapshotPlayers.length > 0) {
        fetch('/api/rooms/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            teams: snapshotTeams,
            assignedPlayers: snapshotPlayers,
            settings: latestSnapshot.settings,
          }),
        }).catch(() => {});
      }
    }
  }, [hydrated, hostedRoom?.code, hostedRoom?.status, createdCode]);

  const handleJoinRoom = async () => {
    const code = joinCodeInput.trim();
    if (!code) {
      toast.error('Please enter a room code');
      return;
    }

    const customId = joinContestantIdInput.trim() || undefined;
    const name = joinNameInput.trim() || undefined;
    const teamName = joinTeamNameInput.trim() || undefined;

    const res = await joinRoom(code, customId, name, teamName);
    if (res.success) {
      const session = useRoomStore.getState().activeSession;
      // Save identity to localStorage so it auto-fills on subsequent visits
      if (typeof window !== 'undefined' && (customId || session?.participantId)) {
        try {
          localStorage.setItem(
            'eleven_contestant_profile',
            JSON.stringify({
              contestantId: customId || session?.participantId,
              name: name || session?.name,
              teamName: teamName || session?.teamName,
            })
          );
        } catch {}
      }

      toast.success(`Joined room ${res.code}!`);
    } else {
      toast.error(res.error || 'Room not found. Please check the code and try again.');
    }
  };

  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      addTeam(newTeamName.trim(), '');
      setNewTeamName('');
      toast.success('Team added');
    }
  };

  return (
    <>
      {/* Background Image - Full viewport matching Points Table */}
      <div
        className="fixed inset-0 -z-40 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: 'url(/backgrounds/for-settings/settings-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
        }}
      />

      {/* Left-half blur & contrast backdrop layer to make white text & headings pop */}
      <div
        className="fixed inset-y-0 left-0 w-full lg:w-[62%] xl:w-[55%] -z-30 pointer-events-none backdrop-blur-2xl bg-gradient-to-r from-black/85 via-black/65 to-transparent"
        aria-hidden="true"
      />

      <AppLayout>
        <div className="space-y-6 max-w-3xl relative z-10">
          <PageHeader
            lines={["SETTINGS"]}
            description="Configure your auction settings and rules"
          />

        {/* Tournament Mode Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass border-border-subtle overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg font-semibold">Tournament Mode</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select how you want to run this auction tournament
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Vanilla Mode */}
                <div
                  onClick={() => handleSelectMode('VANILLA')}
                  className={cn(
                    'p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between',
                    currentAuctionMode === 'VANILLA'
                      ? 'bg-[var(--gold)]/10 border-[var(--gold)] shadow-[0_0_20px_rgba(234,179,8,0.15)] ring-1 ring-[var(--gold)]/50'
                      : 'glass bg-card/40 border-border-subtle hover:border-white/20 hover:bg-card/60'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                            currentAuctionMode === 'VANILLA'
                              ? 'bg-[var(--gold)] text-black'
                              : 'bg-white/10 text-muted-foreground'
                          )}
                        >
                          ⚡
                        </div>
                        <span className="font-heading font-bold text-sm text-foreground">Vanilla Mode</span>
                      </div>
                      {currentAuctionMode === 'VANILLA' && (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--gold)] text-black shadow-sm">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Single-device offline mode. Add, edit, and manage all competing teams manually directly in Settings.
                    </p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--gold)]">
                    <span>Manual Team Addition Enabled</span>
                  </div>
                </div>

                {/* Option 2: Room Mode */}
                <div
                  onClick={() => handleSelectMode('ROOM')}
                  className={cn(
                    'p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between',
                    currentAuctionMode === 'ROOM'
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50'
                      : 'glass bg-card/40 border-border-subtle hover:border-white/20 hover:bg-card/60'
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                            currentAuctionMode === 'ROOM'
                              ? 'bg-emerald-500 text-black'
                              : 'bg-white/10 text-muted-foreground'
                          )}
                        >
                          <Radio className="w-4 h-4 text-black" />
                        </div>
                        <span className="font-heading font-bold text-sm text-foreground">Room Mode</span>
                      </div>
                      {currentAuctionMode === 'ROOM' && (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-black shadow-sm">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Multi-device live broadcast. Generate room codes for contestants to join from their phones.
                    </p>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-white/5 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                    <span>Teams Join via Room Code Only</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Room Mode Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass border-border-subtle">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Radio className="h-5 w-5 text-emerald-400" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg font-semibold">Auction Room</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create an auction room for contestants or join an existing room
                    </p>
                  </div>
                </div>

                {hydrated && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border-border-subtle bg-black/40 self-start sm:self-auto">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--gold)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gold)]" />
                    </span>
                    <span className="text-[11px] font-mono tracking-wider text-muted-foreground">
                      ACTIVE ROLE: <span className="font-bold text-foreground">{createdCode ? 'AUCTIONEER (HOST)' : 'AUCTIONEER'}</span>
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Action 1: Create Room */}
                <div className="p-4 rounded-xl glass bg-card/40 border border-border-subtle flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Host</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mt-1">Host an Auction Room</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Generate a unique room code for contestants to connect while you run the auction.
                    </p>
                  </div>

                  {hydrated && createdCode ? (
                    <div className="space-y-3 pt-2">
                      <div
                        className={cn(
                          'p-3 rounded-lg bg-[var(--pitch-dark)] border flex items-center justify-between transition-colors',
                          hostedRoom?.status === 'COMPLETED'
                            ? 'border-[var(--gold)]/40 bg-amber-950/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                            : 'border-emerald-500/30'
                        )}
                      >
                        <div>
                          {hostedRoom?.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[var(--gold)] font-black">
                              <Trophy className="w-3.5 h-3.5 text-[var(--gold)]" />
                              ROOM COMPLETED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                              ROOM CREATED
                            </span>
                          )}
                          <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">CODE:</span>
                            <span className="font-mono text-xl font-bold tracking-widest text-foreground">
                              {createdCode}
                            </span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyCode}
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground glass hover:bg-white/5 gap-1.5"
                          title="Copy room code"
                        >
                          {hasCopiedCode ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCreateRoom}
                        disabled={isCreating}
                        className={cn(
                          'w-full text-xs h-9 font-semibold transition-all shadow-sm',
                          hostedRoom?.status === 'COMPLETED'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent'
                            : 'border-border-subtle text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                            Generating...
                          </>
                        ) : hostedRoom?.status === 'COMPLETED' ? (
                          'CREATE NEW ROOM'
                        ) : (
                          'Generate New Room'
                        )}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleCreateRoom}
                      disabled={isCreating}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 shadow-md"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating Room...
                        </>
                      ) : (
                        <>
                          <Radio className="h-4 w-4" />
                          CREATE ROOM
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Action 2: Join Room */}
                <div className="p-4 rounded-xl glass bg-card/40 border border-border-subtle flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">Contestant</span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mt-1">Join Another Room</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Enter a 4–6 character code to connect to an auctioneer&apos;s room in contestant mode.
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleJoinRoom();
                    }}
                    className="space-y-3 pt-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="joinRoomCode" className="text-xs font-medium text-foreground mb-1 block">
                          ROOM CODE <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="joinRoomCode"
                          type="text"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                          placeholder="e.g. 4EU7"
                          maxLength={8}
                          className="bg-[var(--pitch-dark)] border-border-subtle uppercase tracking-widest font-mono text-center font-bold text-foreground h-9"
                          autoComplete="off"
                          spellCheck={false}
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="joinContestantId" className="text-xs font-medium text-foreground mb-1 block">
                          YOUR ID / PIN <span className="text-[10px] text-muted-foreground">(FOR RECONNECT)</span>
                        </Label>
                        <Input
                          id="joinContestantId"
                          type="text"
                          value={joinContestantIdInput}
                          onChange={(e) => setJoinContestantIdInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                          placeholder="e.g. 2684"
                          maxLength={10}
                          className="bg-[var(--pitch-dark)] border-border-subtle font-mono uppercase tracking-wider text-xs h-9"
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="joinName" className="text-xs font-medium text-foreground mb-1 block">
                          YOUR NAME
                        </Label>
                        <Input
                          id="joinName"
                          type="text"
                          value={joinNameInput}
                          onChange={(e) => setJoinNameInput(e.target.value)}
                          placeholder="e.g. Aditya"
                          className="bg-[var(--pitch-dark)] border-border-subtle text-foreground text-xs h-9"
                        />
                      </div>

                      <div>
                        <Label htmlFor="joinTeamName" className="text-xs font-medium text-foreground mb-1 block">
                          TEAM NAME
                        </Label>
                        <Input
                          id="joinTeamName"
                          type="text"
                          value={joinTeamNameInput}
                          onChange={(e) => setJoinTeamNameInput(e.target.value)}
                          placeholder="e.g. Red Devils FC"
                          className="bg-[var(--pitch-dark)] border-border-subtle text-foreground text-xs h-9"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isJoining || !joinCodeInput.trim()}
                      className="w-full h-10 bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground font-bold gap-1.5 shadow-gold mt-1"
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-4 w-4" />
                          ENTER ROOM
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>


        {/* Auction Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="font-heading text-lg font-semibold">Auction Details</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set starter tournament rules and default team purse
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="currency" className="text-sm font-medium text-foreground mb-2 block">
                    Default Currency
                  </Label>
                  <Select value={defaultCurrency} onValueChange={(v) => v && handleCurrencyChange(v as Currency)}>
                    <SelectTrigger id="currency" className="bg-[var(--pitch-dark)] border-border-subtle h-10">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Currency used across player bids & valuations
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxTeamBudget" className="text-sm font-medium text-foreground mb-2 block">
                    Max Team Budget
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="maxTeamBudget"
                      type="text"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmBudget();
                      }}
                      placeholder={defaultCurrency === 'INR' ? 'e.g., 2,00,00,000' : 'e.g., 20,000,000'}
                      className="bg-[var(--pitch-dark)] border-border-subtle text-right font-mono tabular-nums text-foreground h-10"
                      inputMode="numeric"
                    />
                    <Button
                      type="button"
                      onClick={handleConfirmBudget}
                      className="h-10 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shrink-0 gap-1.5 shadow-md"
                      title="Confirm Max Team Budget"
                    >
                      <Check className="h-4 w-4" />
                      <span className="text-xs font-semibold">Confirm</span>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Starter budget for all clubs. Team caps can also be adjusted individually in Points Table.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Teams Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center',
                      currentAuctionMode === 'VANILLA'
                        ? 'bg-[var(--gold)]/10 text-[var(--gold)]'
                        : 'bg-emerald-500/10 text-emerald-400'
                    )}
                  >
                    <Users className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="font-heading text-lg font-semibold">Teams ({teams.length})</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {currentAuctionMode === 'VANILLA'
                        ? 'Vanilla Mode — Add and manage your tournament clubs manually'
                        : 'Room Mode — Teams enter dynamically when contestants join via Room Code'}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    'text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full self-start sm:self-auto shadow-sm',
                    currentAuctionMode === 'VANILLA'
                      ? 'bg-[var(--gold)]/15 border border-[var(--gold)]/30 text-[var(--gold)]'
                      : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                  )}
                >
                  {currentAuctionMode === 'VANILLA' ? 'Vanilla Mode' : 'Room Mode'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {currentAuctionMode === 'ROOM' ? (
                /* Room Mode Teams View */
                teams.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <p className="text-sm font-medium text-foreground mb-1">Waiting for contestants to connect</p>
                    <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto leading-relaxed">
                      When contestants join room {createdCode ? `"${createdCode}"` : ''} on their devices, their clubs will automatically appear here and in the Points Table.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectMode('VANILLA')}
                      className="text-xs h-8 px-3 rounded-lg border-white/20 hover:bg-white/10 text-muted-foreground hover:text-foreground gap-1.5"
                    >
                      <span>Switch to Vanilla Mode to Add Teams Manually</span>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teams.map((team, idx) => (
                      <div key={team.id} className="flex items-center justify-between p-3 glass rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium tabular-nums w-6 text-right text-muted-foreground">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{team.name}</p>
                            <p className="text-[11px] text-muted-foreground">Manager: {team.owner || `Manager ${team.id}`}</p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            'text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border',
                            hostedRoom?.status === 'COMPLETED'
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          )}
                        >
                          {hostedRoom?.status === 'COMPLETED' ? 'Archived' : 'Connected'}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 text-center">
                      <p className="text-xs text-muted-foreground">
                        Teams are managed by connected contestants in Room Mode.
                      </p>
                    </div>
                  </div>
                )
              ) : (
                /* Vanilla Mode Teams View (Manual Creation) */
                teams.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">No teams created yet</p>
                    <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                      <Input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Team Name (e.g., Real Madrid)"
                        className="bg-[var(--pitch-dark)] border-border-subtle"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTeam();
                        }}
                      />
                      <Button onClick={handleAddTeam} className="gap-2 shrink-0 bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground font-bold">
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Add Team
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teams.map((team, idx) => (
                      <div key={team.id} className="flex items-center justify-between p-3 glass rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium tabular-nums w-6 text-right text-muted-foreground">
                            {idx + 1}
                          </span>
                          <p className="font-medium text-foreground">{team.name}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Remove ${team.name}? This will unassign all their players.`)) {
                              removeTeam(team.id);
                              toast.success('Team removed');
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${team.name}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-col sm:flex-row gap-2 max-w-md mt-4">
                      <Input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Team Name"
                        className="bg-[var(--pitch-dark)] border-border-subtle"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTeam();
                        }}
                      />
                      <Button onClick={handleAddTeam} className="gap-2 shrink-0 bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground font-bold">
                        <UserPlus className="h-4 w-4" aria-hidden="true" />
                        Add Team
                      </Button>
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Complete Auction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass border-[var(--gold)]/20">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
                </div>
                <CardTitle className="font-heading text-lg font-semibold">Complete Auction</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {hostedRoom?.status === 'COMPLETED' ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-foreground">Auction Completed & Archived</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        This tournament was saved to History. All squads, budgets, and transactions are permanently stored.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href="/auction/history">
                      <Button variant="outline" size="sm" className="text-xs h-9 border-white/20">
                        View History
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        clearHostedRoom();
                        handleSelectMode('ROOM');
                        toast.success('Ready to host a fresh auction tournament!');
                      }}
                      className="text-xs h-9 bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground font-bold"
                    >
                      Start New Auction
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-4 glass rounded-xl bg-[var(--gold)]/5 border border-[var(--gold)]/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-[var(--gold)] mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-foreground">Finalize and Archive</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This will save the current auction as an immutable snapshot in History,
                          then reset the auction for a new session. All player assignments, budgets,
                          and sale prices will be preserved in the historical record.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      <strong>{teams.length}</strong> teams, <strong>{auctionPlayers.filter(p => p.soldPrice !== null).length}</strong> players sold
                    </p>
                    <Button
                      onClick={async () => {
                        if (teams.length === 0) {
                          toast.error('No active teams. Add clubs or create a room first.');
                          return;
                        }
                        const soldCount = auctionPlayers.filter(p => p.soldPrice !== null).length;
                        if (soldCount === 0) {
                          if (!confirm('No players have been sold yet in this session. Complete and archive anyway?')) return;
                        }
                        if (confirm('Complete this auction and save to history? This action cannot be undone.')) {
                          const currentRoomCode = hostedRoom?.code || createdCode;
                          const currentTeams = [...teams];
                          const currentAuctionPlayers = [...auctionPlayers];
                          const currentSettings = { ...settings };

                          const assignedPlayers = currentAuctionPlayers.filter(
                            (p) =>
                              p.status === 'UNSOLD' ||
                              p.status === 'DRAWN' ||
                              Boolean(p.teamId) ||
                              (p.soldPrice !== null && p.soldPrice !== undefined)
                          );

                          if (currentRoomCode) {
                            try {
                              await fetch('/api/rooms/complete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  code: currentRoomCode,
                                  teams: currentTeams,
                                  assignedPlayers,
                                  settings: {
                                    currency: currentSettings.currency,
                                    maxTeamBudget: currentSettings.maxTeamBudget,
                                  },
                                  version: Date.now(),
                                }),
                              });
                            } catch (err) {
                              console.warn('Failed to mark room completed:', err);
                            }
                          }

                          markHostedRoomCompleted();
                          const snapshotName = currentRoomCode ? `Auction ${currentRoomCode}` : undefined;
                          completeAuction(snapshotName, currentRoomCode || undefined);
                          toast.success('Auction completed and saved to History!');
                        }
                      }}
                      disabled={teams.length === 0}
                      className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground shadow-gold gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Complete Auction
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* UI Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--emerald)]/10 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-[var(--emerald)]" aria-hidden="true" />
                </div>
                <CardTitle className="font-heading text-lg font-semibold">UI Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Animations</p>
                  <p className="text-sm text-muted-foreground">Enable smooth animations and transitions</p>
                </div>
                <Switch
                  checked={animationsEnabled}
                  onCheckedChange={setAnimationsEnabled}
                  aria-label="Enable animations"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="glass">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-[var(--gold)]" aria-hidden="true" />
                </div>
                <CardTitle className="font-heading text-lg font-semibold">Statistics</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                <div className="p-4 glass rounded-xl text-center">
                  <p className="font-heading text-3xl font-bold text-foreground">{displayTotalPlayers}</p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Total Players</p>
                </div>
                <div className="p-4 glass rounded-xl text-center">
                  <p className="font-heading text-3xl font-bold text-[var(--emerald)]">
                    {displayAvailableCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Available</p>
                </div>
                <div className="p-4 glass rounded-xl text-center">
                  <p className="font-heading text-3xl font-bold text-amber-400">
                    {displayUnsoldCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Unsold</p>
                </div>
                <div className="p-4 glass rounded-xl text-center">
                  <p className="font-heading text-3xl font-bold text-destructive">
                    {displayDrawnCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Drawn / Sold</p>
                </div>
                <div className="p-4 glass rounded-xl text-center">
                  <p className="font-heading text-3xl font-bold text-[var(--gold)]">
                    {displayCategoriesCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
    </>
  );
}