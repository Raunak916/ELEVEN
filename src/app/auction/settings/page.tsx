'use client';

import React, { useState, useEffect } from 'react';
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
import { useHydrated } from '@/lib/use-hydrated';
import { cn, formatCurrency } from '@/lib/utils';
import { Trophy, Trash2, Settings, Palette, Users, UserPlus, CheckCircle2, AlertTriangle, Lock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { AuctionPlayer, CURRENCY_LOCALES, Player, PlayerRole, Currency, PlayerCategory, PlayerPosition } from '@/lib/types';

export default function SettingsPage() {
  const { auctionPlayers, setAuctionPlayers, settings, updateSettings, teams, addTeam, removeTeam, completeAuction } = useAuctionStore();
  const hydrated = useHydrated();
  const [defaultCurrency, setDefaultCurrency] = useState(settings?.currency || 'INR');
  const [maxTeamBudget, setMaxTeamBudget] = useState(settings?.maxTeamBudget || 20000000);
  const [budgetInput, setBudgetInput] = useState(() => (settings?.maxTeamBudget || 20000000).toLocaleString('en-IN'));
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [newTeamName, setNewTeamName] = useState('');

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
    updateSettings({ currency: newCurr, maxTeamBudget });
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
    updateSettings({ currency: defaultCurrency, maxTeamBudget: num });
    const locale = CURRENCY_LOCALES[defaultCurrency as keyof typeof CURRENCY_LOCALES] || 'en-US';
    setBudgetInput(num.toLocaleString(locale));
    toast.success(`Starter max budget set to ${formatCurrency(num, defaultCurrency)}`);
  };

  const displayTotalPlayers = hydrated ? auctionPlayers.length : 0;
  const displayAvailableCount = hydrated ? auctionPlayers.filter(p => p.status === 'AVAILABLE').length : 0;
  const displayUnsoldCount = hydrated ? auctionPlayers.filter(p => p.status === 'UNSOLD').length : 0;
  const displayDrawnCount = hydrated ? auctionPlayers.filter(p => p.status === 'DRAWN').length : 0;
  const displayCategoriesCount = hydrated ? new Set(auctionPlayers.map(p => p.player.category)).size : 0;

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
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--emerald)]/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[var(--emerald)]" aria-hidden="true" />
                </div>
                <CardTitle className="font-heading text-lg font-semibold">Teams</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {teams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">No teams created yet</p>
                  <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                    <Input
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Team Name (e.g., Mumbai Indians)"
                      className="bg-[var(--pitch-dark)] border-border-subtle"
                    />
                    <Button onClick={handleAddTeam} className="gap-2">
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      Add Team
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center justify-between p-3 glass rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium tabular-nums w-6 text-right text-muted-foreground">
                          {teams.indexOf(team) + 1}
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
                    />
                    <Button onClick={handleAddTeam} className="gap-2">
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                      Add Team
                    </Button>
                  </div>
                </div>
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
                  onClick={() => {
                    if (teams.length === 0) {
                      toast.error('No teams created. Add teams first.');
                      return;
                    }
                    if (auctionPlayers.filter(p => p.soldPrice !== null).length === 0) {
                      if (!confirm('No players have been sold yet. Complete anyway?')) return;
                    }
                    if (confirm('Complete this auction and save to history? This action cannot be undone.')) {
                      completeAuction();
                      toast.success('Auction completed and saved to History');
                    }
                  }}
                  disabled={teams.length === 0}
                  className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-primary-foreground shadow-gold gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Complete Auction
                </Button>
              </div>
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