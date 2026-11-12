/**
 * Money Vault — Indian Company Master & Search Index Service
 * High-performance in-memory search index covering 5,180+ active Indian listed equities
 * cross-referenced from official NSE (EQUITY_L) and BSE Cash Market instruments.
 */

import { IndianCompanyMasterRecord } from '../types/research';
import indianMasterRaw from '../data/indianCompanyMaster.json';

export class IndianCompanyMasterService {
  private static records: IndianCompanyMasterRecord[] = indianMasterRaw as IndianCompanyMasterRecord[];
  
  // Fast Lookup Indexes
  private static byNse = new Map<string, IndianCompanyMasterRecord>();
  private static byBse = new Map<string, IndianCompanyMasterRecord>();
  private static byIsin = new Map<string, IndianCompanyMasterRecord>();
  private static byTicker = new Map<string, IndianCompanyMasterRecord>();
  private static isInitialized = false;

  private static initialize() {
    if (this.isInitialized) return;

    for (const r of this.records) {
      if (r.nseSymbol) this.byNse.set(r.nseSymbol.toUpperCase(), r);
      if (r.bseCode) this.byBse.set(r.bseCode, r);
      if (r.isin) this.byIsin.set(r.isin.toUpperCase(), r);
      if (r.ticker) this.byTicker.set(r.ticker.toUpperCase(), r);
      if (r.bseTicker) this.byTicker.set(r.bseTicker.toUpperCase(), r);
    }

    this.isInitialized = true;
  }

  /**
   * Get total number of searchable Indian companies in the Master Index
   */
  public static getTotalCount(): number {
    return this.records.length;
  }

  /**
   * Resolve a company by NSE symbol, BSE code, ISIN, or ticker
   */
  public static resolveCompany(identifier: string): IndianCompanyMasterRecord | null {
    this.initialize();
    if (!identifier) return null;
    const clean = identifier.toUpperCase().replace(/\.NS$/, '').replace(/\.BO$/, '').trim();

    return (
      this.byTicker.get(clean) ||
      this.byNse.get(clean) ||
      this.byBse.get(clean) ||
      this.byIsin.get(clean) ||
      this.records.find((r) => r.aliases?.some((a) => a.toUpperCase() === clean)) ||
      null
    );
  }

  private static normalize(s: string): string {
    return (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Prioritized multi-attribute search across 5,180+ Indian equities
   * Priority hierarchy:
   * 1. Exact NSE symbol match
   * 2. Exact company name match (raw or normalized)
   * 3. Exact BSE code match
   * 4. Exact ISIN match
   * 5. Exact Alias match
   * 6. Prefix match on symbol or name
   * 7. Partial match in normalized name or aliases
   * 8. Token / Fuzzy match
   */
  public static search(
    query?: string,
    options?: {
      limit?: number;
      sector?: string;
      exchange?: string;
    }
  ): IndianCompanyMasterRecord[] {
    this.initialize();
    const limit = options?.limit ?? 15;

    if (!query || !query.trim()) {
      return this.records.slice(0, limit);
    }

    const q = query.trim();
    const qLower = q.toLowerCase();
    const qUpper = q.toUpperCase();
    const qNorm = this.normalize(q);
    const qTokens = qNorm.split(' ').filter(Boolean);

    // Priority buckets
    const p1_exact_nse: IndianCompanyMasterRecord[] = [];
    const p2_exact_name: IndianCompanyMasterRecord[] = [];
    const p3_exact_bse: IndianCompanyMasterRecord[] = [];
    const p4_exact_isin: IndianCompanyMasterRecord[] = [];
    const p5_alias: IndianCompanyMasterRecord[] = [];
    const p6_prefix: IndianCompanyMasterRecord[] = [];
    const p7_partial: IndianCompanyMasterRecord[] = [];
    const p8_fuzzy: IndianCompanyMasterRecord[] = [];

    const seenIds = new Set<string>();

    for (let i = 0; i < this.records.length; i++) {
      const c = this.records[i];
      const cid = c.id;

      // Filter by sector if provided
      if (options?.sector && options.sector !== 'All' && c.sector !== options.sector) {
        continue;
      }

      // Filter by exchange if provided
      if (options?.exchange && options.exchange !== 'All') {
        if (options.exchange === 'NSE' && !c.exchange.includes('NSE')) continue;
        if (options.exchange === 'BSE' && !c.exchange.includes('BSE')) continue;
      }

      const nse = c.nseSymbol ? c.nseSymbol.toUpperCase() : '';
      const bse = c.bseCode || '';
      const isin = c.isin ? c.isin.toUpperCase() : '';
      const nameLower = c.name.toLowerCase();
      const normLower = c.normalizedName ? this.normalize(c.normalizedName) : this.normalize(c.name);
      const aliases = c.aliases || [];
      const normalizedAliases = aliases.map((a) => this.normalize(a));

      // 1. Exact NSE Symbol or Ticker
      if (nse === qUpper || c.ticker.toUpperCase() === qUpper) {
        p1_exact_nse.push(c);
        seenIds.add(cid);
        continue;
      }

      // 2. Exact Company Name
      if (nameLower === qLower || normLower === qNorm) {
        p2_exact_name.push(c);
        seenIds.add(cid);
        continue;
      }

      // 3. Exact BSE Code
      if (bse === q || bse === qUpper) {
        p3_exact_bse.push(c);
        seenIds.add(cid);
        continue;
      }

      // 4. Exact ISIN
      if (isin === qUpper) {
        p4_exact_isin.push(c);
        seenIds.add(cid);
        continue;
      }

      // 5. Exact Alias match
      if (
        aliases.some((a) => a.toLowerCase() === qLower) ||
        normalizedAliases.some((na) => na === qNorm)
      ) {
        p5_alias.push(c);
        seenIds.add(cid);
        continue;
      }

      // 6. Prefix match on Symbol or Name
      if (
        (nse && nse.startsWith(qUpper)) ||
        c.ticker.toUpperCase().startsWith(qUpper) ||
        nameLower.startsWith(qLower) ||
        normLower.startsWith(qNorm)
      ) {
        p6_prefix.push(c);
        seenIds.add(cid);
        continue;
      }

      // 7. Partial match in name, normalized name or aliases
      if (
        nameLower.includes(qLower) ||
        normLower.includes(qNorm) ||
        aliases.some((a) => a.toLowerCase().includes(qLower)) ||
        normalizedAliases.some((na) => na.includes(qNorm))
      ) {
        p7_partial.push(c);
        seenIds.add(cid);
        continue;
      }

      // 8. Token / Fuzzy match: if query has multiple words, all tokens match
      if (qTokens.length > 1 && qTokens.every((tok) => normLower.includes(tok))) {
        p8_fuzzy.push(c);
        seenIds.add(cid);
        continue;
      }
    }

    const combined = [
      ...p1_exact_nse,
      ...p2_exact_name,
      ...p3_exact_bse,
      ...p4_exact_isin,
      ...p5_alias,
      ...p6_prefix,
      ...p7_partial,
      ...p8_fuzzy,
    ];

    return combined.slice(0, limit);
  }

  /**
   * Paginated browsing over all 5,180+ Indian companies with filters
   */
  public static browse(options: {
    page?: number;
    limit?: number;
    sector?: string;
    exchange?: string;
    search?: string;
  }): {
    totalCount: number;
    page: number;
    totalPages: number;
    limit: number;
    items: IndianCompanyMasterRecord[];
  } {
    this.initialize();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(10, options.limit || 25));

    let filtered = this.records;

    // Search filter
    if (options.search && options.search.trim()) {
      filtered = this.search(options.search, {
        limit: 1000,
        sector: options.sector,
        exchange: options.exchange,
      });
    } else {
      // Sector filter
      if (options.sector && options.sector !== 'All') {
        filtered = filtered.filter((c) => c.sector === options.sector);
      }

      // Exchange filter
      if (options.exchange && options.exchange !== 'All') {
        if (options.exchange === 'NSE') {
          filtered = filtered.filter((c) => c.exchange.includes('NSE'));
        } else if (options.exchange === 'BSE') {
          filtered = filtered.filter((c) => c.exchange.includes('BSE'));
        }
      }
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      totalCount,
      page,
      totalPages,
      limit,
      items,
    };
  }
}
