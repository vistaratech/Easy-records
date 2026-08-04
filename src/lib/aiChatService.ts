// EasyBot - EasyRecords AI Chat & Data Analysis Service
// Smart NLP Engine that understands ANY natural language question
import { apiUrl } from './apiBase';
import { listBusinesses, listFolders, listRegisters, getRegister, type Column, type Entry } from './api';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  source?: 'gemini' | 'local' | 'system';
  isThinking?: boolean;
}

export interface RegisterData {
  id: number;
  name: string;
  category?: string;
  entryCount: number;
  updatedAt: string;
  numericTotals?: Record<string, number>;
  columns?: string[];
  columnTypes?: Record<string, string>;
  rawColumns?: Array<{ name: string; type: string }>;
  allEntries?: Record<string, any>[];
}

export interface AppDataContext {
  businessName?: string;
  foldersCount: number;
  registersCount: number;
  registers: RegisterData[];
  overallTotalEntries: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export async function getLiveAppDataContext(businessId?: number): Promise<AppDataContext> {
  try {
    const businesses = await listBusinesses().catch(() => []);
    const currentBiz = businessId ? businesses.find(b => b.id === businessId) : businesses[0];
    const bizId = currentBiz ? currentBiz.id : businessId;

    if (!bizId) {
      return { businessName: 'Default Workspace', foldersCount: 0, registersCount: 0, registers: [], overallTotalEntries: 0 };
    }

    const folders = await listFolders(bizId).catch(() => []);
    const registers = await listRegisters(bizId).catch(() => []);

    let totalEntriesCount = 0;
    const registerDetails: RegisterData[] = [];

    for (const regSummary of registers.slice(0, 15)) {
      totalEntriesCount += regSummary.entryCount || 0;
      let cols: Column[] = [];
      let rows: Entry[] = [];
      const numericTotals: Record<string, number> = {};
      const columnTypes: Record<string, string> = {};

      try {
        const fullReg = await getRegister(regSummary.id, false);
        cols = fullReg.columns || [];
        rows = fullReg.entries || [];

        cols.forEach(col => {
          columnTypes[col.name] = col.type;
          if (col.type === 'number' || col.type === 'currency') {
            let sum = 0;
            rows.forEach(r => {
              const val = parseFloat(r.cells?.[col.id] || '0');
              if (!isNaN(val)) sum += val;
            });
            numericTotals[col.name] = Math.round(sum * 100) / 100;
          }
        });
      } catch { /* silently continue */ }

      const allEntries = rows.map(r => {
        const entryObj: Record<string, any> = { _rowNumber: r.rowNumber };
        cols.forEach(c => {
          if (r.cells?.[c.id] !== undefined && r.cells[c.id] !== '') {
            entryObj[c.name] = r.cells[c.id];
          }
        });
        return entryObj;
      });

      registerDetails.push({
        id: regSummary.id,
        name: regSummary.name,
        category: regSummary.category,
        entryCount: regSummary.entryCount || 0,
        updatedAt: regSummary.updatedAt,
        columns: cols.map(c => `${c.name} (${c.type})`),
        columnTypes,
        rawColumns: cols.map(c => ({ name: c.name, type: c.type })),
        numericTotals,
        allEntries,
      });
    }

    return {
      businessName: currentBiz?.name || 'My Business',
      foldersCount: folders.length,
      registersCount: registers.length,
      registers: registerDetails,
      overallTotalEntries: totalEntriesCount,
    };
  } catch {
    return { businessName: 'EasyRecords', foldersCount: 0, registersCount: 0, registers: [], overallTotalEntries: 0 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT-BASED NLP ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

type Intent = 
  | 'GREETING'
  | 'GET_TIME'
  | 'GET_LAST'
  | 'GET_FIRST'
  | 'GET_COUNT'
  | 'GET_TOTAL'
  | 'GET_SUMMARY'
  | 'LIST_REGISTERS'
  | 'SHOW_REGISTER'
  | 'SHOW_ALL_DATA'
  | 'GET_MAX'
  | 'GET_MIN'
  | 'GET_AVERAGE'
  | 'FIND_PENDING'
  | 'SEARCH_DATA'
  | 'COMPARE'
  | 'HELP'
  | 'UNKNOWN';

interface ParsedQuery {
  intent: Intent;
  originalPrompt: string;
  cleanedQuery: string;
  targetRegister: RegisterData | null;
  targetColumn: string | null;
  searchTerms: string[];
  numberMentioned: number | null;
}

// Tamil/Tanglish question words to strip (these carry no search value)
const NOISE_WORDS = /\b(enna|yenna|eppadi|enga|eppo|sollu|solu|paru|kudu|thaa|bro|da|di|la|ah|na|nu|um|ku|il|le|lam|en|un|nee|nan|oru|ithu|athu|antha|intha|than|thaan|irukku|iruku|varum|podu|pannu|pannunga|kettu|kelu|tell|me|please|plz|pls|can|you|could|what|is|the|a|an|and|or|in|of|about|for|my|this|that|which|does|do|how|from|to|give|get|show|see)\b/gi;

/** Clean query by removing noise words and normalizing */
function cleanQuery(prompt: string): string {
  return prompt.toLowerCase().trim()
    .replace(NOISE_WORDS, '')
    .replace(/[?!.,;:'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Find a register by fuzzy name matching */
function findRegister(query: string, registers: RegisterData[]): RegisterData | null {
  const q = query.toLowerCase();
  // 1. Exact substring match
  const exact = registers.find(r => q.includes(r.name.toLowerCase()));
  if (exact) return exact;
  // 2. Each word of the register name matched
  for (const r of registers) {
    const regWords = r.name.toLowerCase().split(/\s+/);
    if (regWords.length > 0 && regWords.every(w => w.length > 1 && q.includes(w))) return r;
  }
  // 3. Any significant word match (3+ chars)
  for (const r of registers) {
    const regWords = r.name.toLowerCase().split(/\s+/);
    const matched = regWords.filter(w => w.length >= 3 && q.includes(w));
    if (matched.length > 0) return r;
  }
  return null;
}

/** Find a column name mentioned in the query */
function findColumn(query: string, registers: RegisterData[]): string | null {
  const q = query.toLowerCase();
  for (const r of registers) {
    for (const col of (r.rawColumns || [])) {
      if (col.name.length >= 2 && q.includes(col.name.toLowerCase())) return col.name;
    }
  }
  return null;
}

/** Detect intent from natural language query */
function detectIntent(prompt: string, cleaned: string): Intent {
  const q = prompt.toLowerCase();
  const c = cleaned;

  // Greeting
  if (/^(hi|hello|hey|vanakkam|வணக்கம்|hii+|good\s*(morning|evening|afternoon|night)|namaskaram)/.test(q)) return 'GREETING';

  // Help
  if (/^(help|how\s*to\s*use|commands|what\s*can\s*you|enna\s*panna\s*mudiyum|usage)/.test(q)) return 'HELP';

  // Time/Date
  if (/time|date|நேரம்|மணி|clock|today/.test(q)) return 'GET_TIME';

  // Last/Latest/Recent entry
  if (/last|latest|recent|கடைசி|kadaisi|newest|final|end|bottom|முடிவு|கடந்த/.test(q)) {
    if (/edit|entr|ent[iy]|record|row|data|item|value|one|update|change|modify/.test(q)) return 'GET_LAST';
    // Even just "last" alone → probably wants last entry
    return 'GET_LAST';
  }

  // First/Oldest entry
  if (/first|oldest|முதல்|mudhal|start|begin|top|initial/.test(q)) return 'GET_FIRST';

  // Count/How many
  if (/how\s*many|ethana|எத்தனை|count|total\s*number|எவ்வளவு/.test(q)) return 'GET_COUNT';

  // Maximum/Highest
  if (/highest|maximum|max|biggest|athigam|அதிகம்|athiga|most|top\s*value|peak/.test(q)) return 'GET_MAX';

  // Minimum/Lowest
  if (/lowest|minimum|min|smallest|kuraivu|குறைவு|kuraintha|least|bottom\s*value/.test(q)) return 'GET_MIN';

  // Average
  if (/average|avg|mean|சராசரி|sarasari/.test(q)) return 'GET_AVERAGE';

  // Total/Sum/Amount/Sales/Expense
  if (/total|sum|sales|expense|amount|மொத்தம்|revenue|income|profit|loss|moththam|earnings|cost|price|payment/.test(q)) return 'GET_TOTAL';

  // Pending/Due/Balance
  if (/pending|due|நிலுவை|balance|unpaid|overdue|remaining|bakki|outstanding/.test(q)) return 'FIND_PENDING';

  // Show all data
  if (/all\s*(data|entries|records)|full\s*data|complete|entire|muzhu|எல்லா/.test(q)) return 'SHOW_ALL_DATA';

  // Summary/Overview
  if (/summary|overall|overview|விவரம்|report|dashboard|stats|statistics/.test(q)) return 'GET_SUMMARY';

  // List registers/sheets
  if (/register|sheet|folder|list/.test(q)) return 'LIST_REGISTERS';

  // Compare
  if (/compare|vs|versus|difference|between|ொப்பிடு/.test(q)) return 'COMPARE';

  // Search/Find
  if (/search|find|where|look|தேடு|locate/.test(q)) return 'SEARCH_DATA';

  // If the query contains a register name → show that register
  // (This will be checked later after we extract entities)

  return 'UNKNOWN';
}

/** Extract a number from the query (e.g., "last 5 entries") */
function extractNumber(query: string): number | null {
  const match = query.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

/** Parse the user's query into structured form */
function parseQuery(prompt: string, context: AppDataContext): ParsedQuery {
  const cleaned = cleanQuery(prompt);
  const intent = detectIntent(prompt, cleaned);
  const targetRegister = findRegister(prompt.toLowerCase(), context.registers);
  const targetColumn = findColumn(prompt.toLowerCase(), context.registers);
  
  // Extract meaningful search terms (words > 2 chars, not noise)
  const searchTerms = cleaned.split(/\s+/).filter(w => w.length > 2);
  const numberMentioned = extractNumber(prompt);

  return { intent, originalPrompt: prompt, cleanedQuery: cleaned, targetRegister, targetColumn, searchTerms, numberMentioned };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE FORMATTERS
// ═══════════════════════════════════════════════════════════════════════════════

function fmtEntry(entry: Record<string, any>, idx?: number): string {
  const parts: string[] = [];
  Object.entries(entry).forEach(([k, v]) => {
    if (k === '_rowNumber' || v === '' || v === undefined || v === null) return;
    parts.push(`**${k}:** ${v}`);
  });
  const prefix = idx !== undefined ? `${idx}. ` : '• ';
  return prefix + parts.join(' | ');
}

function fmtRegisterSummary(r: RegisterData): string {
  let text = `📂 **${r.name}** — ${r.entryCount} entries`;
  const totals = Object.keys(r.numericTotals || {});
  if (totals.length > 0) {
    text += ` | 💰 ${totals.map(k => `${k}: ₹${r.numericTotals![k].toLocaleString('en-IN')}`).join(', ')}`;
  }
  return text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT HANDLERS — each returns a clear, data-rich answer
// ═══════════════════════════════════════════════════════════════════════════════

function handleGreeting(ctx: AppDataContext): string {
  return `👋 **வணக்கம்! Hello!**\n\nI'm **EasyBot** 🤖, your smart data assistant!\n\nYour workspace **${ctx.businessName}** currently has:\n• 📂 **${ctx.registersCount}** registers\n• 📝 **${ctx.overallTotalEntries}** total entries\n\n💡 **நீங்கள் எப்படி வேண்டுமானாலும் கேளுங்கள்:**\n• "கடைசி entry காட்டு"\n• "Aravinth Tex data"\n• "Total amount"\n• "How many entries in KCN?"`;
}

function handleHelp(): string {
  return `🤖 **EasyBot - எப்படி உபயோகிப்பது:**\n\n**நீங்கள் எந்த வகையிலும் கேள்வி கேட்கலாம்!** Examples:\n\n📝 **Entry Queries:**\n• "last entry" / "கடைசி entry enna"\n• "first entry in Aravinth Tex"\n• "show all data"\n\n📊 **Analytics:**\n• "total amount" / "மொத்தம் எவ்வளவு"\n• "highest value" / "maximum amount"\n• "average sales"\n• "how many entries"\n\n🔍 **Search:**\n• "Ravi details" / "pending payments"\n• Just type any name or value!\n\n📂 **Register Info:**\n• "list registers" / "show KCN data"\n• "compare registers"`;
}

function handleTime(): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return `🕒 **Current Time & Date:**\n\n• **Time:** ${timeStr} (IST)\n• **Date:** ${dateStr}`;
}

function handleGetLast(pq: ParsedQuery, ctx: AppDataContext): string {
  const n = pq.numberMentioned || 1;
  
  if (pq.targetRegister) {
    const entries = pq.targetRegister.allEntries || [];
    if (entries.length === 0) return `📋 Register **${pq.targetRegister.name}** has no entries.`;
    const lastEntries = entries.slice(-n);
    if (n === 1) {
      return `📝 **Last Entry in "${pq.targetRegister.name}":**\n\n${fmtEntry(lastEntries[0])}\n\n*(Row ${entries.length} of ${pq.targetRegister.entryCount})*`;
    }
    let text = `📝 **Last ${n} Entries in "${pq.targetRegister.name}":**\n\n`;
    lastEntries.forEach((e, i) => { text += `${fmtEntry(e, i + 1)}\n`; });
    return text;
  }

  // Show last entry from ALL registers
  let text = `📝 **Last Entry from each Register:**\n\n`;
  let found = false;
  ctx.registers.forEach(r => {
    const entries = r.allEntries || [];
    if (entries.length > 0) {
      found = true;
      const last = entries[entries.length - 1];
      text += `**📂 ${r.name}:**\n${fmtEntry(last)}\n\n`;
    }
  });
  if (!found) text += `No entries found in any register.`;
  return text;
}

function handleGetFirst(pq: ParsedQuery, ctx: AppDataContext): string {
  const n = pq.numberMentioned || 1;
  
  if (pq.targetRegister) {
    const entries = pq.targetRegister.allEntries || [];
    if (entries.length === 0) return `📋 Register **${pq.targetRegister.name}** has no entries.`;
    const firstEntries = entries.slice(0, n);
    if (n === 1) {
      return `📝 **First Entry in "${pq.targetRegister.name}":**\n\n${fmtEntry(firstEntries[0])}\n\n*(Row 1 of ${pq.targetRegister.entryCount})*`;
    }
    let text = `📝 **First ${n} Entries in "${pq.targetRegister.name}":**\n\n`;
    firstEntries.forEach((e, i) => { text += `${fmtEntry(e, i + 1)}\n`; });
    return text;
  }

  let text = `📝 **First Entry from each Register:**\n\n`;
  ctx.registers.forEach(r => {
    const entries = r.allEntries || [];
    if (entries.length > 0) {
      text += `**📂 ${r.name}:**\n${fmtEntry(entries[0])}\n\n`;
    }
  });
  return text;
}

function handleGetCount(pq: ParsedQuery, ctx: AppDataContext): string {
  if (pq.targetRegister) {
    return `📋 **${pq.targetRegister.name}** has **${pq.targetRegister.entryCount} entries**.`;
  }
  let text = `📊 **Entry Count Summary:**\n\n`;
  text += `• **Total Entries:** ${ctx.overallTotalEntries}\n`;
  text += `• **Total Registers:** ${ctx.registersCount}\n`;
  text += `• **Total Folders:** ${ctx.foldersCount}\n\n`;
  if (ctx.registers.length > 0) {
    text += `📋 **Per Register:**\n`;
    ctx.registers.forEach(r => { text += `• **${r.name}**: ${r.entryCount} entries\n`; });
  }
  return text;
}

function handleGetTotal(pq: ParsedQuery, ctx: AppDataContext): string {
  // If targeting specific column
  if (pq.targetColumn && pq.targetRegister) {
    const total = pq.targetRegister.numericTotals?.[pq.targetColumn];
    if (total !== undefined) {
      return `💰 **Total ${pq.targetColumn} in ${pq.targetRegister.name}:** ₹${total.toLocaleString('en-IN')}`;
    }
  }

  if (pq.targetRegister) {
    const totals = pq.targetRegister.numericTotals || {};
    const keys = Object.keys(totals);
    if (keys.length === 0) return `📋 **${pq.targetRegister.name}** has ${pq.targetRegister.entryCount} entries but no numeric columns for totals.`;
    let text = `💰 **Totals for "${pq.targetRegister.name}":**\n\n`;
    keys.forEach(k => { text += `• **${k}:** ₹${totals[k].toLocaleString('en-IN')}\n`; });
    return text;
  }

  let text = `💰 **Calculated Totals across all Registers:**\n\n`;
  let found = false;
  ctx.registers.forEach(r => {
    const totals = r.numericTotals || {};
    const keys = Object.keys(totals);
    if (keys.length > 0) {
      found = true;
      text += `**${r.name}:**\n`;
      keys.forEach(k => { text += `  • ${k}: **₹${totals[k].toLocaleString('en-IN')}**\n`; });
      text += `\n`;
    }
  });
  if (!found) text += `No numeric columns found. Total entries: **${ctx.overallTotalEntries}**.`;
  return text;
}

function handleGetMax(pq: ParsedQuery, ctx: AppDataContext): string {
  return findExtreme(pq, ctx, 'max');
}

function handleGetMin(pq: ParsedQuery, ctx: AppDataContext): string {
  return findExtreme(pq, ctx, 'min');
}

function findExtreme(pq: ParsedQuery, ctx: AppDataContext, mode: 'max' | 'min'): string {
  const isMax = mode === 'max';
  let bestVal = isMax ? -Infinity : Infinity;
  let bestEntry: Record<string, any> | null = null;
  let bestRegName = '';
  let bestColName = '';

  const regsToCheck = pq.targetRegister ? [pq.targetRegister] : ctx.registers;
  
  regsToCheck.forEach(r => {
    const numCols = Object.keys(r.numericTotals || {});
    const colsToCheck = pq.targetColumn ? [pq.targetColumn] : numCols;
    (r.allEntries || []).forEach(entry => {
      colsToCheck.forEach(colName => {
        const val = parseFloat(entry[colName] || '0');
        if (isNaN(val)) return;
        if (isMax ? val > bestVal : val < bestVal) {
          bestVal = val;
          bestEntry = entry;
          bestRegName = r.name;
          bestColName = colName;
        }
      });
    });
  });

  if (bestEntry) {
    return `📈 **${isMax ? 'Highest' : 'Lowest'} Value Found:**\n\n• **Register:** ${bestRegName}\n• **Column:** ${bestColName}\n• **Value:** ₹${bestVal.toLocaleString('en-IN')}\n\n**Full Entry:**\n${fmtEntry(bestEntry)}`;
  }
  return `No numeric data found to determine ${isMax ? 'highest' : 'lowest'} value.`;
}

function handleGetAverage(pq: ParsedQuery, ctx: AppDataContext): string {
  const regsToCheck = pq.targetRegister ? [pq.targetRegister] : ctx.registers;
  let text = `📊 **Average Values:**\n\n`;
  let found = false;

  regsToCheck.forEach(r => {
    const numCols = Object.keys(r.numericTotals || {});
    if (numCols.length === 0) return;
    const entries = r.allEntries || [];
    if (entries.length === 0) return;
    found = true;
    text += `**${r.name}:**\n`;
    numCols.forEach(colName => {
      const total = r.numericTotals![colName];
      const count = entries.filter(e => parseFloat(e[colName] || '') > 0).length || 1;
      const avg = Math.round((total / count) * 100) / 100;
      text += `  • **${colName}:** ₹${avg.toLocaleString('en-IN')} (from ${count} entries)\n`;
    });
    text += `\n`;
  });

  if (!found) text += `No numeric columns found for average calculation.`;
  return text;
}

function handleGetSummary(ctx: AppDataContext): string {
  let text = `📊 **Workspace Overview — ${ctx.businessName}**\n\n`;
  text += `• 📂 **Registers:** ${ctx.registersCount}\n`;
  text += `• 📁 **Folders:** ${ctx.foldersCount}\n`;
  text += `• 📝 **Total Entries:** ${ctx.overallTotalEntries}\n\n`;
  if (ctx.registers.length > 0) {
    text += `📋 **Register Details:**\n`;
    ctx.registers.forEach(r => { text += `${fmtRegisterSummary(r)}\n`; });
  }
  return text;
}

function handleListRegisters(ctx: AppDataContext): string {
  if (ctx.registers.length === 0) return `📁 No registers found in **${ctx.businessName}**.`;
  let text = `📂 **All Registers in ${ctx.businessName} (${ctx.registersCount}):**\n\n`;
  ctx.registers.forEach((r, i) => {
    text += `${i + 1}. **${r.name}** — ${r.entryCount} entries`;
    if (r.columns && r.columns.length > 0) {
      text += `\n   Columns: ${r.columns.slice(0, 5).join(', ')}${r.columns.length > 5 ? '...' : ''}`;
    }
    text += `\n`;
  });
  return text;
}

function handleShowRegister(pq: ParsedQuery): string {
  const r = pq.targetRegister;
  if (!r) return '';
  
  const entries = r.allEntries || [];
  let text = `📂 **Register: ${r.name}**\n`;
  text += `• **Entries:** ${r.entryCount}\n`;
  if (r.columns && r.columns.length > 0) text += `• **Columns:** ${r.columns.join(', ')}\n`;

  const totalKeys = Object.keys(r.numericTotals || {});
  if (totalKeys.length > 0) {
    text += `\n💰 **Totals:**\n`;
    totalKeys.forEach(k => { text += `  • ${k}: ₹${r.numericTotals![k].toLocaleString('en-IN')}\n`; });
  }

  if (entries.length > 0) {
    const showCount = Math.min(5, entries.length);
    text += `\n📝 **Last ${showCount} Entries:**\n`;
    entries.slice(-showCount).forEach((e, i) => { text += `${fmtEntry(e, i + 1)}\n`; });
    if (entries.length > showCount) text += `\n...and ${entries.length - showCount} more entries.`;
  }
  return text;
}

function handleShowAllData(pq: ParsedQuery, ctx: AppDataContext): string {
  const r = pq.targetRegister;
  if (r) {
    const entries = r.allEntries || [];
    if (entries.length === 0) return `📋 **${r.name}** has no entries.`;
    let text = `📂 **All Entries in "${r.name}" (${entries.length}):**\n\n`;
    entries.slice(0, 25).forEach((e, i) => { text += `${fmtEntry(e, i + 1)}\n`; });
    if (entries.length > 25) text += `\n... and ${entries.length - 25} more entries.`;
    return text;
  }
  // Show sample from all registers
  let text = `📂 **Data Preview (all registers):**\n\n`;
  ctx.registers.forEach(r => {
    const entries = r.allEntries || [];
    text += `**${r.name}** (${entries.length} entries):\n`;
    entries.slice(-3).forEach((e, i) => { text += `  ${fmtEntry(e, i + 1)}\n`; });
    text += `\n`;
  });
  return text;
}

function handleFindPending(ctx: AppDataContext): string {
  const matches: string[] = [];
  ctx.registers.forEach(r => {
    (r.allEntries || []).forEach(entry => {
      const str = JSON.stringify(entry).toLowerCase();
      if (/pending|due|unpaid|balance|bakki|overdue|remaining/.test(str)) {
        matches.push(`**${r.name}:** ${fmtEntry(entry)}`);
      }
    });
  });
  if (matches.length > 0) return `🔍 **Pending/Due Items (${matches.length} found):**\n\n` + matches.slice(0, 12).join('\n');
  return `✅ No pending or due items found in your records!`;
}

function handleCompare(ctx: AppDataContext): string {
  if (ctx.registers.length < 2) return `Need at least 2 registers to compare.`;
  let text = `📊 **Register Comparison:**\n\n`;
  text += `| Register | Entries | Numeric Totals |\n|---|---|---|\n`;
  ctx.registers.forEach(r => {
    const totals = Object.entries(r.numericTotals || {}).map(([k, v]) => `${k}: ₹${v.toLocaleString('en-IN')}`).join(', ') || 'N/A';
    text += `| **${r.name}** | ${r.entryCount} | ${totals} |\n`;
  });
  return text;
}

/** Universal data search — searches ALL data for any matching text */
function universalSearch(terms: string[], ctx: AppDataContext): string {
  if (terms.length === 0) return '';
  
  const matches: Array<{ regName: string; entry: Record<string, any>; score: number }> = [];
  
  ctx.registers.forEach(r => {
    (r.allEntries || []).forEach(entry => {
      const str = JSON.stringify(entry).toLowerCase();
      let score = 0;
      terms.forEach(term => {
        if (str.includes(term)) score++;
      });
      if (score > 0) {
        matches.push({ regName: r.name, entry, score });
      }
    });
  });

  // Sort by relevance score
  matches.sort((a, b) => b.score - a.score);

  if (matches.length > 0) {
    let text = `🔍 **Found ${matches.length} matching record${matches.length > 1 ? 's' : ''}:**\n\n`;
    matches.slice(0, 10).forEach((m, i) => {
      text += `**📂 ${m.regName}:**\n${fmtEntry(m.entry, i + 1)}\n\n`;
    });
    if (matches.length > 10) text += `... and ${matches.length - 10} more results.`;
    return text;
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENGINE — processes any question intelligently
// ═══════════════════════════════════════════════════════════════════════════════

export function generateLocalAnalyticsResponse(prompt: string, context: AppDataContext): string {
  const pq = parseQuery(prompt, context);

  // Route to the right handler based on detected intent
  switch (pq.intent) {
    case 'GREETING': return handleGreeting(context);
    case 'HELP': return handleHelp();
    case 'GET_TIME': return handleTime();
    case 'GET_LAST': return handleGetLast(pq, context);
    case 'GET_FIRST': return handleGetFirst(pq, context);
    case 'GET_COUNT': return handleGetCount(pq, context);
    case 'GET_TOTAL': return handleGetTotal(pq, context);
    case 'GET_MAX': return handleGetMax(pq, context);
    case 'GET_MIN': return handleGetMin(pq, context);
    case 'GET_AVERAGE': return handleGetAverage(pq, context);
    case 'GET_SUMMARY': return handleGetSummary(context);
    case 'LIST_REGISTERS': return handleListRegisters(context);
    case 'SHOW_ALL_DATA': return handleShowAllData(pq, context);
    case 'FIND_PENDING': return handleFindPending(context);
    case 'COMPARE': return handleCompare(context);

    case 'SHOW_REGISTER':
    case 'SEARCH_DATA':
    case 'UNKNOWN':
    default:
      // If a register name was detected → show that register's details
      if (pq.targetRegister) {
        return handleShowRegister(pq);
      }

      // Universal text search across all data
      const searchResult = universalSearch(pq.searchTerms, context);
      if (searchResult) return searchResult;

      // Smart fallback — show workspace summary with data preview
      let text = `🤖 **EasyBot — "${prompt}"**\n\n`;
      text += `Your workspace **${context.businessName}** has **${context.registersCount} registers** and **${context.overallTotalEntries} entries**.\n\n`;
      
      if (context.registers.length > 0) {
        text += `📋 **Latest Data:**\n`;
        context.registers.slice(0, 4).forEach(r => {
          const entries = r.allEntries || [];
          text += `\n**${r.name}** (${entries.length} entries)`;
          if (entries.length > 0) {
            text += `:\n  Last → ${fmtEntry(entries[entries.length - 1])}`;
          }
          text += `\n`;
        });
      }

      text += `\n💡 **எப்படி வேண்டுமானாலும் கேளுங்கள்:**\n• "last entry" or "கடைசி entry"\n• "Aravinth Tex total"\n• "KCN data"\n• "highest amount"`;
      return text;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API SENDER
// ═══════════════════════════════════════════════════════════════════════════════

export async function sendAIChatPrompt(
  prompt: string,
  businessId?: number,
  userApiKey?: string
): Promise<{ text: string; source: 'gemini' | 'local' }> {
  const appDataContext = await getLiveAppDataContext(businessId);
  const token = sessionStorage.getItem('recordbook_token');

  try {
    const res = await fetch(apiUrl('/api/chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        appDataContext,
        apiKey: userApiKey || localStorage.getItem('easyrecords_gemini_api_key') || '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.response && data.source === 'gemini') {
        return { text: data.response, source: 'gemini' };
      }
    }
  } catch (err) {
    console.warn('API chat route failed, using local engine:', err);
  }

  const localResponse = generateLocalAnalyticsResponse(prompt, appDataContext);
  return { text: localResponse, source: 'local' };
}
