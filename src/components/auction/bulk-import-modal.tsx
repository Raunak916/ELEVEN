'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  ChevronDown,
  Search,
  Download,
  Trash2,
  Eye,
  Upload,
  Sparkles,
  ArrowRight,
  UserCheck,
  UserX,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Player,
  PlayerRole,
  Currency,
  CURRENCY_SYMBOLS,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from '@/lib/types';
import { CountryFlag } from '@/components/ui/country-flag';
import { formatCurrency, ROLE_COLORS, getRoleFromPosition } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAuctionStore } from '@/lib/auction-store';
import { toast } from 'sonner';
import Image from 'next/image';

interface ImportRowInput {
  name: string;
  club?: string;
  basePrice?: number;
  currency?: Currency;
  role?: PlayerRole;
  playerId?: string;
}

interface MatchedPlayer extends Player {
  matchScore: number;
  matchReason: string;
}

interface ImportResult {
  inputRow: ImportRowInput;
  matches: MatchedPlayer[];
  bestMatch: MatchedPlayer | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  reason: string;
  selectedMatch: MatchedPlayer | null;
  status: 'pending' | 'accepted' | 'rejected' | 'added';
}

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PopPlayerConfig {
  resultIndex: number;
  player: Player;
  role: PlayerRole;
  basePrice: string;
  currency: Currency;
}

const CONFIDENCE_COLORS = {
  high: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  none: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

const CONFIDENCE_LABELS = {
  high: 'High Match',
  medium: 'Medium Match',
  low: 'Low Match',
  none: 'No Match',
};

const ROLE_OPTIONS: { value: PlayerRole; label: string }[] = [
  { value: 'Goalkeeper', label: 'Goalkeeper' },
  { value: 'Defender', label: 'Defender' },
  { value: 'Midfielder', label: 'Midfielder' },
  { value: 'Forward', label: 'Forward' },
];

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'INR', label: 'INR (₹)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

const SAMPLE_CSV = `name,club,basePrice,currency,role
Jude Bellingham,Real Madrid,15000000,INR,Midfielder
Vinicius Jr,Real Madrid,18000000,INR,Forward
Rodri,Manchester City,12000000,INR,Midfielder
Erling Haaland,Manchester City,20000000,INR,Forward
`;

export function BulkImportModal({ open, onOpenChange }: BulkImportModalProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'importing' | 'complete'>('upload');
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; name: string }>({
    current: 0,
    total: 0,
    name: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [showAllRows, setShowAllRows] = useState(true);
  const [globalRole, setGlobalRole] = useState<PlayerRole>('Midfielder');
  const [globalCurrency, setGlobalCurrency] = useState<Currency>('INR');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPlayer } = useAuctionStore();

  // Pop Player Configuration Modal State
  const [popConfig, setPopConfig] = useState<PopPlayerConfig | null>(null);
  const [isAddingSingle, setIsAddingSingle] = useState(false);

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (
        ext === 'csv' ||
        ext === 'json' ||
        ext === 'txt' ||
        selectedFile.type.includes('csv') ||
        selectedFile.type.includes('json') ||
        selectedFile.type.includes('text')
      ) {
        setFile(selectedFile);
        setIsProcessing(false);
      } else {
        toast.error('Please select a CSV, JSON, or TXT file');
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const parseCSV = useCallback((content: string): ImportRowInput[] => {
    // 1. Strip UTF-8 BOM
    const clean = content.replace(/^\uFEFF/, '').trim();
    if (!clean) return [];

    const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return [];

    // 2. Delimiter auto-detection (comma, semicolon, tab)
    const firstLine = lines[0];
    let delimiter = ',';
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
    else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const rawHeaders = parseLine(lines[0]);
    const headers = rawHeaders.map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, '')
    );

    const hasKnownHeader = headers.some((h) =>
      ['name', 'player', 'playername', 'fullname', 'club', 'team', 'price', 'baseprice', 'role'].includes(h)
    );

    const rows: ImportRowInput[] = [];

    if (!hasKnownHeader || lines.length === 1) {
      // Treat each line as a player name/row
      for (let i = 0; i < lines.length; i++) {
        const parts = parseLine(lines[i]);
        const name = parts[0] || '';
        const club = parts[1] || undefined;
        const basePrice = parts[2] ? parseInt(parts[2].replace(/[^\d]/g, ''), 10) : undefined;
        if (name && name.length > 1) {
          rows.push({ name, club, basePrice });
        }
      }
      return rows;
    }

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      const name =
        row.name ||
        row.playername ||
        row.player ||
        row.fullname ||
        row.label ||
        '';
      const club =
        row.club ||
        row.team ||
        row.currentteam ||
        row.currentclub ||
        '';
      const basePrice =
        row.baseprice ||
        row.price ||
        row.cost ||
        row.reserveprice ||
        '';
      const currency = row.currency || '';
      const role = row.role || row.position || '';
      const playerId = row.playerid || row.id || '';

      if (name) {
        rows.push({
          name,
          club: club || undefined,
          basePrice: basePrice ? parseInt(basePrice.replace(/[^\d]/g, ''), 10) : undefined,
          currency: (currency?.toUpperCase() as Currency) || undefined,
          role: (role as PlayerRole) || undefined,
          playerId: playerId || undefined,
        });
      }
    }

    return rows;
  }, []);

  const parseJSON = useCallback((content: string): ImportRowInput[] => {
    try {
      const data = JSON.parse(content);
      const arr = Array.isArray(data) ? data : data.players || data.rows || [];

      return arr
        .map((item: any) => ({
          name: item.name || item.playername || item.fullname || '',
          club: item.club || item.team || item.currentteam,
          basePrice: item.baseprice || item.basePrice || item.price,
          currency: item.currency,
          role: item.role,
          playerId: item.playerid || item.playerId || item.id,
        }))
        .filter((r: ImportRowInput) => r.name);
    } catch {
      return [];
    }
  }, []);

  const handleProcess = useCallback(async () => {
    if (!file) {
      toast.error('Please select a file first');
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);

    try {
      const text = await file.text();
      const ext = file.name.split('.').pop()?.toLowerCase();
      let rows: ImportRowInput[] = [];

      if (ext === 'json') {
        rows = parseJSON(text);
      } else {
        rows = parseCSV(text);
      }

      if (!rows || rows.length === 0) {
        toast.error('No valid rows found in file. Please check column headers (e.g. name, club)');
        setIsProcessing(false);
        return;
      }

      if (rows.length > 500) {
        toast.error('Maximum 500 rows per import');
        setIsProcessing(false);
        return;
      }

      const response = await fetch('/api/players/bulk-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${response.status}`);
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.results)) {
        throw new Error('Invalid match response from server');
      }

      const mappedResults: ImportResult[] = data.results.map((r: any) => ({
        inputRow: r.inputRow,
        matches: (r.matches || []).map((m: any) => ({
          ...m,
          matchScore: 0,
          matchReason: r.reason || '',
        })),
        bestMatch: r.bestMatch ? { ...r.bestMatch, matchScore: 0, matchReason: r.reason || '' } : null,
        confidence: r.confidence || 'none',
        reason: r.reason || '',
        selectedMatch: r.bestMatch ? { ...r.bestMatch, matchScore: 0, matchReason: r.reason || '' } : null,
        status:
          r.bestMatch && (r.confidence === 'high' || r.confidence === 'medium')
            ? ('accepted' as const)
            : ('pending' as const),
      }));

      setResults(mappedResults);
      setStep('review');
    } catch (error: any) {
      console.error('Bulk import error:', error);
      toast.error(error?.message || 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  }, [file, parseCSV, parseJSON]);

  const handleSelectMatch = (index: number, match: MatchedPlayer | null) => {
    setResults((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, selectedMatch: match, status: match ? 'accepted' : 'rejected' } : r
      )
    );
  };

  const handleAcceptAllHigh = () => {
    setResults((prev) =>
      prev.map((r) => {
        if ((r.confidence === 'high' || r.confidence === 'medium') && r.bestMatch) {
          return { ...r, selectedMatch: r.bestMatch, status: 'accepted' };
        }
        return r;
      })
    );
    toast.success('Accepted all confident matches');
  };

  // Open the pop-up configuration dialog for a single player row
  const handleOpenConfig = (index: number, player: Player, row: ImportRowInput) => {
    const defaultRole = row.role || getRoleFromPosition(player.position) || globalRole;
    const defaultPrice = (row.basePrice || 2000000).toString();
    const defaultCurrency = row.currency || globalCurrency;

    setPopConfig({
      resultIndex: index,
      player,
      role: defaultRole,
      basePrice: defaultPrice,
      currency: defaultCurrency,
    });
  };

  // Confirm single player add from the pop configuration dialog
  const handleConfirmSingleAdd = async () => {
    if (!popConfig) return;

    setIsAddingSingle(true);
    try {
      const parsedPrice = parseInt(popConfig.basePrice, 10);
      const finalPrice = isNaN(parsedPrice) || parsedPrice < 0 ? 0 : parsedPrice;

      await addPlayer(popConfig.player, popConfig.role, finalPrice, popConfig.currency);

      // Mark this result as added
      setResults((prev) =>
        prev.map((r, i) => (i === popConfig.resultIndex ? { ...r, status: 'added' as const } : r))
      );
      setAddedCount((prev) => prev + 1);

      toast.success(`${popConfig.player.name} added to auction pool`, {
        description: `${popConfig.role} · ${formatCurrency(finalPrice, popConfig.currency)}`,
      });

      setPopConfig(null);
    } catch (error) {
      console.error('Failed to add player:', error);
      toast.error('Failed to add player to pool');
    } finally {
      setIsAddingSingle(false);
    }
  };

  // Bulk add all accepted players with background job progress animation
  const handleAddToAuction = async () => {
    const toAdd = results.filter((r) => r.status === 'accepted' && r.selectedMatch);
    if (toAdd.length === 0) {
      toast.error('No players selected to add');
      return;
    }

    setStep('importing');
    setImportProgress({
      current: 0,
      total: toAdd.length,
      name: toAdd[0]?.selectedMatch?.name || '',
    });

    let successCount = 0;

    for (let i = 0; i < toAdd.length; i++) {
      const result = toAdd[i];
      if (!result.selectedMatch) continue;

      const player = result.selectedMatch;
      setImportProgress({
        current: i + 1,
        total: toAdd.length,
        name: player.name,
      });

      try {
        const role = result.inputRow.role || globalRole;
        const basePrice = result.inputRow.basePrice || 2000000;
        const currency = result.inputRow.currency || globalCurrency;

        await addPlayer(player, role, basePrice, currency);
        successCount++;
      } catch (error) {
        console.error('Failed to add player:', error);
      }

      // Smooth tactile delay so the user sees the progress bar ticking through each player
      const delayMs = Math.min(120, Math.max(35, 900 / toAdd.length));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    setAddedCount((prev) => prev + successCount);
    setResults((prev) =>
      prev.map((r) => (r.status === 'accepted' ? { ...r, status: 'added' as const } : r))
    );

    if (successCount > 0) {
      toast.success(`${successCount} player${successCount !== 1 ? 's' : ''} added to auction`);
    }

    // Brief pause at 100% before transition
    setTimeout(() => {
      setStep('complete');
    }, 450);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = useCallback(() => {
    setFile(null);
    setIsProcessing(false);
    setResults([]);
    setAddedCount(0);
    setStep('upload');
    setShowAllRows(true);
    setPopConfig(null);
    setIsAddingSingle(false);
    setImportProgress({ current: 0, total: 0, name: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getFilteredResults = () => {
    if (showAllRows) return results;
    return results.filter((r) => r.confidence !== 'none' || r.status === 'accepted');
  };

  useEffect(() => {
    if (!open) {
      handleReset();
    }
  }, [open, handleReset]);

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => {
        if (!val) handleReset();
        onOpenChange(val);
      }}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            'w-[96vw] sm:max-w-[1200px] lg:max-w-[1280px] max-h-[92vh] p-0 gap-0 overflow-hidden rounded-3xl',
            'bg-[#080c14]/75 text-popover-foreground backdrop-blur-2xl border border-white/15 shadow-[0_0_60px_rgba(0,0,0,0.6)]'
          )}
        >
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="flex flex-col h-full max-h-[88vh]">
              <DialogHeader className="p-6 sm:p-8 pb-5 border-b border-white/10 bg-black/30 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shadow-sm">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl sm:text-2xl font-heading font-black text-foreground flex items-center gap-2">
                        BULK IMPORT PLAYERS
                      </DialogTitle>
                      <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Upload a CSV or JSON file to batch import players into your auction pool
                      </DialogDescription>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleReset();
                      onOpenChange(false);
                    }}
                    className="rounded-xl p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                {/* Drag & Drop Area */}
                <div
                  className={cn(
                    'relative border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center transition-all duration-300 backdrop-blur-md',
                    file
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-white/10 bg-black/30 hover:border-primary/50 hover:bg-black/40'
                  )}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.txt,text/csv,application/json,text/plain"
                    onClick={(e) => {
                      (e.target as HTMLInputElement).value = '';
                    }}
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                    className="hidden"
                    id="bulk-import-file"
                  />

                  {!file ? (
                    <div className="space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary shadow-sm">
                        <Upload className="w-8 h-8 opacity-80" />
                      </div>
                      <div>
                        <p className="text-xl font-heading font-bold text-foreground">
                          Drop your CSV or JSON file here
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Drag and drop or browse spreadsheet files from your computer
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={triggerFileInput}
                        className="gap-2 h-11 px-6 rounded-xl font-semibold bg-white/5 hover:bg-white/10 border-white/10 text-foreground"
                      >
                        <FileText className="w-4 h-4" />
                        Browse Files
                      </Button>
                      <p className="text-xs text-muted-foreground/60 font-mono">
                        Maximum 500 rows per batch · Supports .csv, .json
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-4 py-2">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="text-left">
                        <p className="font-heading font-bold text-base text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {(file.size / 1024).toFixed(1)} KB · Ready to process
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setFile(null)}
                        className="text-muted-foreground hover:text-destructive ml-2"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Template Prompt */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary">💡 Tip:</span>
                    <span>Need the structure? Download our pre-formatted spreadsheet template.</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadTemplate}
                    className="text-xs font-semibold text-primary hover:text-primary/90 h-8 px-3"
                  >
                    Download CSV Template
                  </Button>
                </div>

                {/* Global Defaults when file is loaded */}
                {file && (
                  <div className="p-5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 space-y-4">
                    <h4 className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                      Fallback Defaults (Applied when row does not specify)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                          Default Position / Role
                        </Label>
                        <Select
                          value={globalRole}
                          onValueChange={(v) => setGlobalRole(v as PlayerRole)}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-black/40 border-white/10 text-sm font-semibold text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover/95 backdrop-blur-xl border-border text-popover-foreground">
                            {ROLE_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
                          Default Currency
                        </Label>
                        <Select
                          value={globalCurrency}
                          onValueChange={(v) => setGlobalCurrency(v as Currency)}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-black/40 border-white/10 text-sm font-semibold text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover/95 backdrop-blur-xl border-border text-popover-foreground">
                            {CURRENCY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Footer */}
              <div className="p-6 border-t border-white/10 bg-black/40 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleReset();
                    onOpenChange(false);
                  }}
                  className="h-11 px-5 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleProcess}
                  disabled={!file || isProcessing}
                  className={cn(
                    'gap-2 h-11 px-8 rounded-xl font-heading font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold',
                    !file && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing Rows...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Process & Review Matches
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Review Matches (ROW LIKE STRUCTURE - SAME LIKE PLAYER SEARCH) */}
          {step === 'review' && (
            <div className="flex flex-col h-full max-h-[92vh]">
              <DialogHeader className="p-6 sm:p-7 pb-4 border-b border-white/10 bg-black/30 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl sm:text-2xl font-heading font-black text-foreground flex items-center gap-2">
                      <Eye className="w-6 h-6 text-primary" />
                      REVIEW MATCHED PLAYERS
                    </DialogTitle>
                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {results.length} players parsed ·{' '}
                      <span className="text-emerald-400 font-bold">
                        {results.filter((r) => r.confidence === 'high').length} high match
                      </span>{' '}
                      · {results.filter((r) => r.confidence === 'medium').length} medium ·{' '}
                      {results.filter((r) => r.confidence === 'none').length} unmatched
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStep('upload')}
                      className="text-xs font-mono rounded-xl h-9 px-3 border-white/10 bg-white/5"
                    >
                      Back
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        handleReset();
                        onOpenChange(false);
                      }}
                      className="rounded-xl p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </DialogHeader>

              {/* Toolbar */}
              <div className="px-6 sm:px-7 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/30">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono font-bold text-muted-foreground select-none">
                  <input
                    type="checkbox"
                    checked={showAllRows}
                    onChange={(e) => setShowAllRows(e.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-black/40 text-primary focus:ring-primary"
                  />
                  <span>Show unmatched rows</span>
                </label>

                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAcceptAllHigh}
                    disabled={
                      !results.some(
                        (r) =>
                          (r.confidence === 'high' || r.confidence === 'medium') &&
                          r.status === 'pending'
                      )
                    }
                    className="text-xs font-mono font-bold gap-1.5 h-9 px-4 rounded-xl border-white/10 bg-white/5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Accept All High / Medium
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleAddToAuction}
                    disabled={results.filter((r) => r.status === 'accepted').length === 0}
                    className="text-xs font-heading font-black uppercase tracking-wider gap-1.5 h-9 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
                  >
                    <Check className="w-4 h-4" />
                    Add {results.filter((r) => r.status === 'accepted').length} to Pool
                  </Button>
                </div>
              </div>

              {/* Row-based results list - same like player search */}
              <div className="flex-1 overflow-hidden" data-lenis-prevent>
                <ScrollArea data-lenis-prevent className="h-[58vh] p-5 sm:p-7 overscroll-contain">
                  <div className="space-y-3">
                    {getFilteredResults().map((result, index) => {
                      const matched = result.selectedMatch || result.bestMatch;
                      const isAdded = result.status === 'added';
                      const isAccepted = result.status === 'accepted';
                      const role =
                        result.inputRow.role ||
                        (matched ? getRoleFromPosition(matched.position) : globalRole);
                      const basePrice = result.inputRow.basePrice ?? 2000000;
                      const currency = result.inputRow.currency || globalCurrency;
                      const roleColor = ROLE_COLORS[role] || '#ffd54c';

                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            'group relative flex items-center gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 backdrop-blur-md shadow-sm',
                            isAdded
                              ? 'border-emerald-500/40 bg-emerald-500/10 opacity-75'
                              : isAccepted
                              ? 'border-primary/40 bg-primary/5'
                              : 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/60'
                          )}
                        >
                          {/* Face Avatar */}
                          <div className="relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-black/60 border border-white/10 shadow-inner">
                            {matched ? (
                              <Image
                                src={matched.photo}
                                alt={matched.name}
                                fill
                                unoptimized={true}
                                className="object-cover object-top"
                                sizes="64px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 font-mono text-xs">
                                N/A
                              </div>
                            )}
                            {matched?.nationalityCode && (
                              <div className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/70 text-[9px] z-10">
                                🏳️
                              </div>
                            )}
                          </div>

                          {/* Player & Match Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-black text-base sm:text-lg text-foreground truncate group-hover:text-[var(--gold)] transition-colors">
                                {matched ? matched.name : result.inputRow.name}
                              </h3>

                              {matched && (
                                <Badge
                                  className="text-[9.5px] font-heading font-black px-1.5 py-0 border"
                                  style={{
                                    backgroundColor: `${CATEGORY_COLORS[matched.category]}18`,
                                    color: CATEGORY_COLORS[matched.category],
                                    borderColor: `${CATEGORY_COLORS[matched.category]}35`,
                                  }}
                                >
                                  {CATEGORY_LABELS[matched.category]}
                                </Badge>
                              )}

                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border"
                                style={{
                                  backgroundColor: `${roleColor}15`,
                                  color: roleColor,
                                  borderColor: `${roleColor}30`,
                                }}
                              >
                                {role}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                              {matched ? (
                                <>
                                  <span>🏳️ {matched.nationality}</span>
                                  <span>•</span>
                                  <span className="text-foreground/80 font-medium">
                                    {matched.team}
                                  </span>
                                </>
                              ) : (
                                <span className="text-rose-400 font-medium">
                                  No database match found
                                </span>
                              )}
                              <span>•</span>
                              <span className="font-mono font-bold text-[var(--gold)]">
                                {formatCurrency(basePrice, currency)}
                              </span>
                              {matched && result.inputRow.name !== matched.name && (
                                <span className="text-[11px] text-muted-foreground/60 italic truncate">
                                  (Row: &quot;{result.inputRow.name}&quot;)
                                </span>
                              )}
                            </div>

                            {/* Alternative Candidates */}
                            {result.matches.length > 1 && (
                              <details className="group mt-2 pt-1 border-t border-white/5">
                                <summary className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-muted-foreground/80 cursor-pointer hover:text-foreground transition-colors">
                                  <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180 text-primary" />
                                  <span>
                                    {result.matches.length - 1} alternative database candidate
                                    {result.matches.length - 1 !== 1 ? 's' : ''}
                                  </span>
                                </summary>
                                <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-primary/30">
                                  {result.matches
                                    .filter((m) => m.id !== matched?.id)
                                    .map((candidate) => (
                                      <div
                                        key={candidate.id}
                                        className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-black/40 border border-white/10"
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="relative w-6 h-6 rounded-md overflow-hidden bg-black/60 shrink-0">
                                            <Image
                                              src={candidate.photo}
                                              alt={candidate.name}
                                              fill
                                              unoptimized={true}
                                              className="object-cover"
                                              sizes="24px"
                                            />
                                          </div>
                                          <span className="text-xs font-semibold text-foreground truncate">
                                            {candidate.name} ({candidate.team})
                                          </span>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleSelectMatch(index, candidate)}
                                          className="h-6 px-2 text-[10px] font-mono font-bold"
                                        >
                                          Use
                                        </Button>
                                      </div>
                                    ))}
                                </div>
                              </details>
                            )}
                          </div>

                          {/* Confidence Tag & Pop Add Button */}
                          <div className="flex-shrink-0 flex items-center gap-2">
                            <Badge
                              className={cn(
                                'text-[10px] font-mono font-bold px-2 py-0.5 uppercase border hidden sm:inline-flex',
                                CONFIDENCE_COLORS[result.confidence]
                              )}
                            >
                              {CONFIDENCE_LABELS[result.confidence]}
                            </Badge>

                            {isAdded ? (
                              <Button
                                disabled
                                size="sm"
                                className="h-9 px-3.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold gap-1.5"
                              >
                                <Check className="h-4 w-4" />
                                ADDED
                              </Button>
                            ) : matched ? (
                              <Button
                                size="sm"
                                onClick={() => handleOpenConfig(index, matched, result.inputRow)}
                                className="h-9 px-4 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black shadow-gold font-heading font-black text-xs uppercase tracking-wider gap-1.5 transition-transform hover:scale-105"
                              >
                                <Plus className="h-4 w-4" />
                                <span>ADD</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                className="h-9 px-3 rounded-xl text-xs font-mono opacity-50"
                              >
                                Unmatched
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Step 3: Importing Progress Animation */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center space-y-7 max-h-[85vh]">
              {/* Animated Radar Pulse Icon */}
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-[var(--gold)]/20 animate-ping" />
                <div className="w-20 h-20 rounded-3xl bg-[var(--gold)]/15 border border-[var(--gold)]/40 flex items-center justify-center text-[var(--gold)] shadow-xl relative z-10">
                  <Sparkles className="w-10 h-10 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-2xl sm:text-3xl font-heading font-black text-foreground tracking-tight">
                  ADDING PLAYERS TO POOL
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                  Enrolling {importProgress.current} of {importProgress.total} players into active auction roster
                </p>
                {importProgress.name && (
                  <p className="text-xs font-heading font-bold text-[var(--gold)] truncate px-4 py-1.5 rounded-full bg-black/40 border border-white/10 inline-block shadow-sm">
                    ⚡ {importProgress.name}
                  </p>
                )}
              </div>

              {/* High-tech Progress Bar */}
              <div className="w-full max-w-md space-y-2">
                <div className="h-3.5 w-full rounded-full bg-black/50 border border-white/10 p-0.5 overflow-hidden shadow-inner">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-[var(--gold)] to-emerald-400 shadow-sm"
                    initial={{ width: '0%' }}
                    animate={{
                      width: `${(importProgress.current / Math.max(1, importProgress.total)) * 100}%`,
                    }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Batch Sync Status</span>
                  <span className="font-bold text-foreground">
                    {Math.round((importProgress.current / Math.max(1, importProgress.total)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="flex flex-col items-center justify-center p-12 sm:p-16 text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
                <Check className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl sm:text-3xl font-heading font-black text-foreground">
                  Import Successful!
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Added <span className="text-emerald-400 font-bold font-mono">{addedCount}</span>{' '}
                  player{addedCount !== 1 ? 's' : ''} to your active auction pool.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="h-11 px-6 rounded-xl text-xs font-semibold border-white/10"
                >
                  Import More
                </Button>
                <Button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="h-11 px-8 rounded-xl text-xs font-heading font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold"
                >
                  Done & View Pool
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* POP CONFIGURATION DIALOG FOR SINGLE PLAYER */}
      {popConfig && (
        <Dialog
          open={!!popConfig}
          onOpenChange={(openState) => {
            if (!openState) setPopConfig(null);
          }}
        >
          <DialogContent className="max-w-md bg-[#0a0e14]/98 backdrop-blur-2xl border border-white/15 shadow-2xl p-0 overflow-hidden rounded-3xl z-50">
            <DialogHeader className="p-6 pb-4 border-b border-white/10 bg-black/40">
              <DialogTitle className="flex items-center gap-2 font-heading font-black text-xl text-foreground">
                <Sparkles className="h-5 w-5 text-[var(--gold)]" />
                Add Player to Pool
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure role and base price before adding this player
              </DialogDescription>
            </DialogHeader>

            {/* Profile Preview Card */}
            <div className="px-6 py-4 flex items-center gap-4 border-b border-white/10 bg-black/30">
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/60 border border-white/15 flex-shrink-0 shadow-md">
                <Image
                  src={popConfig.player.photo}
                  alt={popConfig.player.name}
                  fill
                  unoptimized={true}
                  className="object-cover object-top"
                  sizes="64px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-black text-base sm:text-lg text-foreground truncate">
                  {popConfig.player.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span>🏳️ {popConfig.player.nationality}</span>
                  <span>•</span>
                  <span>{popConfig.player.team}</span>
                  <span>•</span>
                  <span className="font-mono font-bold text-[var(--gold)]">
                    {popConfig.player.category}
                  </span>
                </div>
              </div>
            </div>

            {/* Form Controls */}
            <div className="p-6 space-y-4">
              {/* Role */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                  Position Role
                </Label>
                <Select
                  value={popConfig.role}
                  onValueChange={(val) =>
                    setPopConfig((prev) => (prev ? { ...prev, role: val as PlayerRole } : null))
                  }
                >
                  <SelectTrigger className="bg-black/40 border-white/10 text-sm rounded-xl">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value} className="text-sm font-medium">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Base Reserve Price */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                  Base Reserve Price
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-sm">
                    {CURRENCY_SYMBOLS[popConfig.currency]}
                  </span>
                  <Input
                    type="number"
                    value={popConfig.basePrice}
                    onChange={(e) =>
                      setPopConfig((prev) =>
                        prev ? { ...prev, basePrice: e.target.value } : null
                      )
                    }
                    className="pl-9 bg-black/40 border-white/10 font-heading font-black text-lg rounded-xl"
                    min="0"
                  />
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
                  Currency
                </Label>
                <Select
                  value={popConfig.currency}
                  onValueChange={(val) =>
                    setPopConfig((prev) => (prev ? { ...prev, currency: val as Currency } : null))
                  }
                >
                  <SelectTrigger className="bg-black/40 border-white/10 text-sm rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover/95 backdrop-blur-xl border-border">
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-sm font-medium">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-5 border-t border-white/10 flex justify-end gap-2.5 bg-black/20">
              <Button
                variant="ghost"
                onClick={() => setPopConfig(null)}
                className="font-heading font-bold text-xs uppercase tracking-wider rounded-xl"
              >
                Cancel
              </Button>
              <Button
                disabled={isAddingSingle}
                className="bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black shadow-gold font-heading font-black text-xs uppercase tracking-wider rounded-xl px-6 gap-1.5"
                onClick={handleConfirmSingleAdd}
              >
                {isAddingSingle ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add to Auction Pool
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}