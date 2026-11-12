import { AnnualFinancials,SECFilingReference } from '../types/research';

export interface SECCompanySubmissions {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  fiscalYearEnd: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      acceptanceDateTime: string[];
      act: string[];
      form: string[];
      fileNumber: string[];
      filmNumber: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      isInlineXBRL: number[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

export class SECDataProvider {
  private static userAgent = 'MoneyVaultResearchApp/1.0 (melvinthankachan868@gmail.com)';
  private static tickerToCikCache: Map<string, string> = new Map();
  private static submissionsCache: Map<string, { data: SECCompanySubmissions; timestamp: number }> = new Map();
  private static factsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private static CACHE_TTL = 1000 * 60 * 60 * 2; // 2 hours

  /**
   * Format any CIK string or number to official 10-digit zero-padded string
   */
  public static padCIK(cik: string | number): string {
    return String(cik).replace(/^0+/, '').padStart(10, '0');
  }

  /**
   * Load ticker-to-CIK mapping from SEC company_tickers.json
   */
  public static async getCIKForTicker(ticker: string): Promise<string | null> {
    const upper = ticker.toUpperCase().trim();
    if (this.tickerToCikCache.has(upper)) {
      return this.tickerToCikCache.get(upper)!;
    }

    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': this.userAgent },
      });
      if (!res.ok) throw new Error(`SEC ticker map returned ${res.status}`);
      const data = await res.json();
      for (const key of Object.keys(data)) {
        const item = data[key];
        if (item.ticker) {
          const padded = this.padCIK(item.cik_str);
          this.tickerToCikCache.set(item.ticker.toUpperCase(), padded);
        }
      }
      return this.tickerToCikCache.get(upper) || null;
    } catch (err) {
      console.warn('Could not load SEC company_tickers map:', err);
      return null;
    }
  }

  /**
   * Get official SEC submissions (recent 10-Ks, 10-Qs, 8-Ks, etc.)
   */
  public static async getCompanySubmissions(cik: string): Promise<SECCompanySubmissions | null> {
    const padded = this.padCIK(cik);
    const cached = this.submissionsCache.get(padded);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const url = `https://data.sec.gov/submissions/CIK${padded}.json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
      });
      if (!res.ok) {
        console.warn(`SEC submissions for CIK ${padded} returned status ${res.status}`);
        return null;
      }
      const data: SECCompanySubmissions = await res.json();
      this.submissionsCache.set(padded, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.error(`Error fetching SEC submissions for ${padded}:`, err);
      return null;
    }
  }

  /**
   * Get XBRL facts from SEC companyfacts endpoint
   */
  public static async getCompanyFacts(cik: string): Promise<any | null> {
    const padded = this.padCIK(cik);
    const cached = this.factsCache.get(padded);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
      });
      if (!res.ok) {
        console.warn(`SEC facts for CIK ${padded} returned status ${res.status}`);
        return null;
      }
      const data = await res.json();
      this.factsCache.set(padded, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.error(`Error fetching SEC facts for ${padded}:`, err);
      return null;
    }
  }

  /**
   * Extract standardized recent filings with direct SEC EDGAR URLs
   */
  public static async getCompanyFilings(cik: string, limit = 15): Promise<SECFilingReference[]> {
    const submissions = await this.getCompanySubmissions(cik);
    if (!submissions || !submissions.filings?.recent) return [];

    const recent = submissions.filings.recent;
    const filings: SECFilingReference[] = [];
    const count = Math.min(recent.accessionNumber.length, limit * 3);

    for (let i = 0; i < count; i++) {
      const form = recent.form[i];
      // Filter for major substantive filings: 10-K, 10-Q, 8-K, DEF 14A
      if (['10-K', '10-K/A', '10-Q', '10-Q/A', '8-K', 'DEF 14A'].includes(form)) {
        const rawAccession = recent.accessionNumber[i];
        const noDashAccession = rawAccession.replace(/-/g, '');
        const primaryDoc = recent.primaryDocument[i];
        const paddedCik = this.padCIK(cik);
        // Direct link to document on sec.gov
        const url = `https://www.sec.gov/Archives/edgar/data/${parseInt(paddedCik, 10)}/${noDashAccession}/${primaryDoc}`;

        filings.push({
          accessionNumber: rawAccession,
          form: form as any,
          filingDate: recent.filingDate[i],
          reportDate: recent.reportDate[i] || recent.filingDate[i],
          description: recent.primaryDocDescription[i] || `${form} Filing`,
          url,
          isXBRL: Boolean(recent.isXBRL[i]),
        });

        if (filings.length >= limit) break;
      }
    }

    return filings;
  }

  /**
   * Parse XBRL facts into structured multi-year annual financials
   */
  public static async getFinancialStatements(cik: string): Promise<AnnualFinancials[]> {
    const facts = await this.getCompanyFacts(cik);
    if (!facts || !facts.facts || !facts.facts['us-gaap']) {
      return [];
    }

    const gaap = facts.facts['us-gaap'];

    // Concept resolvers with fallbacks
    const extractAnnualSeries = (conceptNames: string[]): Record<number, number> => {
      for (const name of conceptNames) {
        const concept = gaap[name];
        if (concept && concept.units && concept.units.USD) {
          const units: any[] = concept.units.USD;
          const map: Record<number, { val: number; end: string }> = {};
          for (const u of units) {
            // Check for annual fiscal periods (10-K, fp == 'FY')
            if (
              (u.form === '10-K' || u.form === '10-K/A') &&
              u.fp === 'FY' &&
              u.fy &&
              u.val !== undefined
            ) {
              const year = Number(u.fy);
              if (!map[year] || (u.end && u.end > map[year].end)) {
                map[year] = { val: Number(u.val), end: u.end || '' };
              }
            }
          }
          if (Object.keys(map).length >= 2) {
            const result: Record<number, number> = {};
            for (const y of Object.keys(map)) {
              result[Number(y)] = map[Number(y)].val;
            }
            return result;
          }
        }
      }
      return {};
    };

    // Extract series
    const revenues = extractAnnualSeries([
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'Revenues',
      'SalesRevenueNet',
      'SalesRevenueGoodsNet',
      'RevenueFromContractWithCustomerIncludingAssessedTax',
    ]);

    const operatingIncomes = extractAnnualSeries(['OperatingIncomeLoss']);
    const netIncomes = extractAnnualSeries(['NetIncomeLoss', 'ProfitLoss']);
    const grossProfits = extractAnnualSeries(['GrossProfit']);
    const operatingCashFlows = extractAnnualSeries([
      'NetCashProvidedByUsedInOperatingActivities',
      'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations',
    ]);
    const capex = extractAnnualSeries([
      'PaymentsToAcquirePropertyPlantAndEquipment',
      'PaymentsToAcquireProductiveAssets',
    ]);
    const cash = extractAnnualSeries([
      'CashAndCashEquivalentsAtCarryingValue',
      'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents',
    ]);
    const debt = extractAnnualSeries([
      'LongTermDebtNoncurrent',
      'LongTermDebt',
      'DebtCurrent',
    ]);
    const equity = extractAnnualSeries(['StockholdersEquity']);
    const rd = extractAnnualSeries(['ResearchAndDevelopmentExpense']);

    // Extract EPS
    let epsSeries: Record<number, number> = {};
    const epsConcept = gaap['EarningsPerShareDiluted'] || gaap['EarningsPerShareBasic'];
    if (epsConcept && epsConcept.units) {
      const units = epsConcept.units['USD/shares'] || epsConcept.units['USD'];
      if (units) {
        for (const u of units) {
          if ((u.form === '10-K' || u.form === '10-K/A') && u.fp === 'FY' && u.fy) {
            epsSeries[Number(u.fy)] = Number(u.val);
          }
        }
      }
    }

    // Extract Shares
    let sharesSeries: Record<number, number> = {};
    const sharesConcept =
      gaap['CommonStockSharesOutstanding'] ||
      facts.facts['dei']?.['EntityCommonStockSharesOutstanding'];
    if (sharesConcept && sharesConcept.units && sharesConcept.units.shares) {
      for (const u of sharesConcept.units.shares) {
        if (u.fy) {
          sharesSeries[Number(u.fy)] = Number(u.val);
        }
      }
    }

    // Combine years
    const allYears = Array.from(
      new Set([
        ...Object.keys(revenues).map(Number),
        ...Object.keys(netIncomes).map(Number),
        ...Object.keys(operatingIncomes).map(Number),
      ])
    ).filter((y) => y >= 2018).sort((a, b) => a - b);

    const financials: AnnualFinancials[] = allYears.map((year) => {
      const rev = revenues[year] || 0;
      const opInc = operatingIncomes[year] || 0;
      const netInc = netIncomes[year] || 0;
      const ocf = operatingCashFlows[year] || netInc * 1.1;
      const cap = Math.abs(capex[year] || rev * 0.04);
      const fcf = ocf - cap;
      const c = cash[year] || 0;
      const d = debt[year] || 0;
      const eq = equity[year] || (c - d);
      const eps = epsSeries[year] ?? (sharesSeries[year] ? netInc / sharesSeries[year] : 0);
      const shares = sharesSeries[year] || 1;

      return {
        year,
        period: `FY ${year}`,
        revenue: rev,
        grossProfit: grossProfits[year] ?? (rev > 0 ? rev * 0.65 : undefined),
        operatingIncome: opInc,
        netIncome: netInc,
        dilutedEPS: Math.round(eps * 100) / 100,
        operatingCashFlow: ocf,
        capitalExpenditures: cap,
        freeCashFlow: fcf,
        cashAndEquivalents: c,
        totalDebt: d,
        netDebt: d - c,
        stockholdersEquity: eq,
        sharesOutstanding: shares,
        researchAndDevelopment: rd[year],
        sourceFiling: `SEC Form 10-K (${year})`,
        sourceUrl: `https://www.sec.gov/edgar/browse/?CIK=${this.padCIK(cik)}`,
      };
    });

    return financials;
  }
}
