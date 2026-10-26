/**
 * Money Vault — Investment Research & Stock Discovery Engine Types
 * Secure Your Money. Master Your Future.
 */

export type MarketCapCategory = 'Mega' | 'Large' | 'Mid' | 'Small' | 'Micro';

export type SectorCategory =
  | 'IT Services'
  | 'Banking'
  | 'Financial Services'
  | 'Oil & Gas'
  | 'Automobile'
  | 'Pharma & Healthcare'
  | 'FMCG & Consumer'
  | 'Industrials'
  | 'Energy & Power'
  | 'Telecom'
  | 'Infrastructure'
  | 'Chemicals'
  | 'Metals & Mining'
  | 'Defence'
  | 'Consumer Discretionary'
  | 'Real Estate'
  | 'Renewables'
  | 'Conglomerate'
  | 'Technology'
  | 'Healthcare'
  | 'Financials'
  | 'Other';

export interface ShareholdingPattern {
  promoterHolding: number; // in % (e.g. 72.3%)
  fiiHolding: number; // in % (Foreign Institutional Investors)
  diiHolding: number; // in % (Domestic Institutional Investors)
  publicHolding: number; // in %
  pledgedShares?: number; // in % of promoter holding
  asOfDate?: string;
}

export interface CorporateActionItem {
  id: string;
  type: 'Dividend' | 'Bonus' | 'Split' | 'Rights' | 'AGM' | 'Results' | string;
  recordDate: string;
  exDate: string;
  details: string;
}

export interface IndianFilingReference {
  title: string;
  category: 'Annual Report' | 'Quarterly Financials' | 'Investor Presentation' | 'Shareholding Pattern' | 'Corporate Announcement' | string;
  filingDate: string;
  period: string; // e.g. "Q1 FY26" or "FY2025"
  exchange: 'NSE' | 'BSE';
  url: string;
}

export interface AnnualFinancials {
  year: number;
  period: string; // e.g. "FY2024", "FY2025"
  revenue: number; // in INR Crores
  grossProfit?: number;
  ebitda?: number;
  operatingIncome: number;
  netIncome: number;
  dilutedEPS: number; // in ₹ per share
  operatingCashFlow: number;
  capitalExpenditures: number;
  freeCashFlow: number;
  cashAndEquivalents: number;
  totalDebt: number;
  netDebt: number;
  stockholdersEquity: number;
  sharesOutstanding: number; // in Crores of shares
  researchAndDevelopment?: number;
  debtToEquity?: number;
  dividendPerShare?: number;
  sourceFiling?: string;
  sourceUrl?: string;
}

export interface QuarterlyFinancials {
  quarter: string; // e.g. "Q1 FY2026", "Q4 FY2025"
  periodEnd: string; // YYYY-MM-DD
  revenue: number;
  ebitda?: number;
  operatingIncome: number;
  netIncome: number;
  dilutedEPS: number;
  operatingCashFlow?: number;
  freeCashFlow?: number;
  sourceFiling?: string;
}

export interface EarlyStageCharacteristic {
  id: string;
  name: string;
  matched: boolean;
  score: number; // 0 to 100
  metricLabel: string;
  metricValue: string;
  evidence: string;
  historicalContext: string;
}

export interface CompanyQualityDimension {
  name: string;
  rating: 'Exceptional' | 'Strong' | 'Moderate' | 'Developing' | 'Caution';
  score: number; // 1-10
  highlight: string;
  evidence: string[];
}

export interface CatalystItem {
  id: string;
  category: 'Product' | 'Market Expansion' | 'AI / Cloud' | 'Regulatory' | 'Operational' | 'Industry';
  title: string;
  description: string;
  timeframe: string; // e.g. "Next 6-12 Months"
  sourceType: 'Company 10-K/10-Q Filing' | 'Earnings Call Disclosures' | 'Industry Research';
  sourceReference: string;
}

export interface RiskItem {
  id: string;
  category: 'Competition' | 'Valuation' | 'Regulation' | 'Customer Concentration' | 'Balance Sheet' | 'Execution';
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  mitigant?: string;
  sourceFilingSection: string; // e.g. "Item 1A Risk Factors"
}

export interface SECFilingReference {
  accessionNumber: string;
  form: '10-K' | '10-Q' | '8-K' | 'DEF 14A' | 'SC 13G' | string;
  filingDate: string; // YYYY-MM-DD
  reportDate?: string;
  description: string;
  url: string;
  isXBRL: boolean;
}

export interface ValuationMetrics {
  currentPrice: number;
  currency: string;
  marketCap: number; // in USD
  enterpriseValue: number;
  peRatio: number | null; // Trailing P/E
  forwardPeRatio: number | null;
  psRatio: number; // Price to Sales
  pbRatio: number | null;
  evToEbitda: number | null;
  evToFcf: number | null;
  fcfYield: number | null; // FCF / Market Cap (%)
  dividendYield: number | null;
  historicalPePercentile?: number; // 0-100% relative to 5y history
  valuationAssessment: 'Significantly Undervalued' | 'Attractive' | 'Fair Value' | 'Premium / Elevated' | 'Speculative';
  qualityVsValuationDichotomy: string;
}

export interface NormalizedGrowthCalculations {
  revenueGrowth1Y: number; // %
  revenueCAGR3Y: number; // %
  revenueCAGR5Y: number | null; // %
  epsGrowth1Y: number; // %
  epsCAGR3Y: number | null; // %
  fcfGrowth1Y: number; // %
  fcfCAGR3Y: number | null; // %
  grossMarginCurrent: number; // %
  grossMarginTrend: number; // Change in bps / percentage points over 3Y
  operatingMarginCurrent: number; // %
  operatingMarginTrend: number;
  netMarginCurrent: number; // %
  roicCurrent: number; // %
  roeCurrent: number; // %
  operatingLeverageRatio: number | null; // Op Income Growth / Revenue Growth
  fcfConversionRatio: number; // FCF / Net Income
  rdIntensityRatio: number; // R&D / Revenue (%)
  shareDilution3Y: number; // % change in share count over 3Y
  netDebtToEbitda: number | null;
  interestCoverageRatio: number | null;
  cashToDebtRatio: number;
}

export interface CompanyResearchSummary {
  ticker: string; // Primary NSE Symbol e.g. "TCS", "INFY", "RELIANCE"
  nseSymbol?: string; // e.g. "TCS"
  bseCode?: string; // e.g. "532540"
  isin?: string; // e.g. "INE467B01029"
  name: string;
  cik?: string; // for backward compatibility
  exchange: string; // "NSE", "BSE", "NSE / BSE"
  primaryExchange?: 'NSE' | 'BSE' | string;
  market: 'India' | 'United States' | 'Global';
  isNonIndianEquity?: boolean; // e.g. Cognizant (CTSH on NASDAQ)
  nonIndianReason?: string;
  sector: SectorCategory;
  industry: string;
  marketCap: number; // in INR
  marketCapCategory: MarketCapCategory;
  price: number; // in INR
  changePercent1D: number;
  calculations: NormalizedGrowthCalculations;
  valuation: ValuationMetrics;
  shareholdingPattern?: ShareholdingPattern;
  earlyStageScore: number; // 0 - 100
  earlyStageCharacteristics: string[];
  whyItAppeared: string[];
  topCatalyst: string;
  primaryRisk: string;
  lastUpdated: string;
  dataSources: string[];
}

export interface CompanyResearchDetail extends CompanyResearchSummary {
  overview: {
    description: string;
    headquarters: string;
    foundedYear: number;
    employees?: number;
    website: string;
    irWebsite: string;
    keyProducts: string[];
    revenueSegments: { segment: string; percentage: number; amount: number }[];
    geographicExposure: { region: string; percentage: number }[];
    competitiveMoat: string;
  };
  annualFinancials: AnnualFinancials[];
  quarterlyFinancials: QuarterlyFinancials[];
  growthCharacteristicsDetailed: EarlyStageCharacteristic[];
  qualityDimensions: CompanyQualityDimension[];
  shareholdingPattern?: ShareholdingPattern;
  corporateActions?: CorporateActionItem[];
  indianFilings?: IndianFilingReference[];
  catalysts: CatalystItem[];
  risks: RiskItem[];
  bullCase: {
    thesis: string;
    keyAssumptions: string[];
    potentialDrivers: string[];
  };
  bearCase: {
    thesis: string;
    keyVulnerabilities: string[];
    failurePoints: string[];
  };
  secFilings?: SECFilingReference[];
  capitalAllocation: {
    shareRepurchases3Y: number;
    dividendsPaid3Y: number;
    capexIntensity: number; // Capex / Revenue (%)
    rdReinvestmentIntensity: number;
    mAndAActivitySummary: string;
  };
  dataQualityNotes: {
    completeness: 'Verified Complete' | 'Audited with Minor Limitations' | 'Partial XBRL Coverage';
    lastFilingPeriod: string;
    sources: string[];
    missingFields: string[];
  };
  mikesResearchSummary: string;
}

export interface ResearchFilterCriteria {
  searchQuery: string;
  market: 'NSE' | 'BSE' | 'NSE+BSE' | 'All';
  sector: SectorCategory | 'All';
  marketCap: MarketCapCategory | 'All';
  minRevenueGrowth: number; // e.g. 15%
  minProfitGrowth?: number;
  minEPSGrowth?: number;
  minROE?: number;
  minROIC: number; // e.g. 12%
  maxDebtToEquity?: number | null;
  minOperatingMargin: number; // e.g. 10%
  minFCFGrowth: number; // e.g. 0%
  maxNetDebtToEbitda: number | null;
  maxPE: number | null;
  maxPB?: number | null;
  maxPS: number | null;
  maxEVtoEbitda?: number | null;
  minDividendYield?: number | null;
  earlyStageGrowthOnly: boolean;
  profitableOnly: boolean;
  positiveFCFOnly: boolean;
  minRdIntensity?: number;
  preset:
    | 'all'
    | 'hyper_growth_fcf'
    | 'margin_expander'
    | 'cash_machine'
    | 'fortress_balance_sheet'
    | 'rd_innovator'
    | 'early_compounder';
}

export interface WatchlistCompanyItem {
  ticker: string;
  nseSymbol?: string;
  bseCode?: string;
  exchange?: string;
  name: string;
  sector: SectorCategory;
  price: number;
  marketCap: number;
  peRatio: number | null;
  revenueGrowth1Y: number;
  fcfGrowth1Y: number;
  operatingMargin: number;
  addedAt: string; // ISO string
  personalNote?: string;
  targetPriceAlert?: number;
  notifyOnFiling: boolean;
  notifyOnEarnings: boolean;
  notifyOnGrowthShift: boolean;
  latestFilingDate?: string;
}

export interface ResearchAlertConfig {
  id: string;
  ticker: string;
  companyName: string;
  type:
    | 'revenue_growth_shift'
    | 'earnings_release'
    | 'sec_filing_published'
    | 'valuation_threshold'
    | 'fcf_shift'
    | 'debt_increase'
    | 'margin_deterioration';
  thresholdValue?: number;
  createdAt: string;
  isTriggered: boolean;
  triggeredAt?: string;
  triggeredMessage?: string;
}

export interface EducationalGlossaryTerm {
  term: string;
  title: string;
  shortDefinition: string;
  formula?: string;
  detailedExplanation: string;
  whyGrowthInvestorsCare: string;
  whatIsGood: string;
  commonPitfall: string;
}

export interface IndianCompanyMasterRecord {
  id: string; // Unique ID e.g. "IND_TCS"
  ticker: string; // Primary NSE symbol or BSE ticker/code
  nseSymbol?: string;
  bseCode?: string;
  bseTicker?: string;
  isin: string;
  name: string;
  normalizedName: string;
  aliases: string[];
  exchange: string; // "NSE • BSE", "NSE", "BSE"
  primaryExchange: 'NSE' | 'BSE' | string;
  market: 'India' | 'United States' | 'Global';
  sector: SectorCategory | string;
  industry?: string;
  listingStatus: 'Active' | 'Active (Foreign)' | string;
  isNonIndianEquity?: boolean;
  nonIndianReason?: string;
  price?: number;
  changePercent1D?: number;
  marketCap?: number;
  marketCapCategory?: MarketCapCategory;
}

export interface BrowseCompaniesResponse {
  success: boolean;
  totalCount: number;
  page: number;
  totalPages: number;
  limit: number;
  companies: CompanyResearchSummary[];
}
