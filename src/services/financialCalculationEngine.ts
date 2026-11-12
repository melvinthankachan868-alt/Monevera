import {
AnnualFinancials,
NormalizedGrowthCalculations,
EarlyStageCharacteristic,
ValuationMetrics,
} from '../types/research';

/**
 * Deterministic Financial Calculation Engine
 * Invariant: Never rely on LLMs to calculate math, CAGR, margins, or ratios.
 */
export class FinancialCalculationEngine {
  /**
   * Calculate Compound Annual Growth Rate (CAGR)
   */
  public static calculateCAGR(startVal: number, endVal: number, years: number): number | null {
    if (years <= 0 || startVal <= 0 || endVal <= 0) return null;
    const cagr = Math.pow(endVal / startVal, 1 / years) - 1;
    return isFinite(cagr) ? Math.round(cagr * 1000) / 10 : null; // returns % rounded to 1 decimal
  }

  /**
   * Calculate 1-Year percentage change
   */
  public static calculateGrowth(prevVal: number, currentVal: number): number {
    if (prevVal === 0) return currentVal > 0 ? 100 : 0;
    const change = ((currentVal - prevVal) / Math.abs(prevVal)) * 100;
    return isFinite(change) ? Math.round(change * 10) / 10 : 0;
  }

  /**
   * Computes normalized multi-year financial calculations
   */
  public static computeMetrics(
    history: AnnualFinancials[],
    currentPrice: number,
    sharesCountOverride?: number
  ): {
    calculations: NormalizedGrowthCalculations;
    valuation: ValuationMetrics;
    earlyStageCharacteristics: EarlyStageCharacteristic[];
    earlyStageScore: number;
    whyItAppeared: string[];
  } {
    // Sort chronologically ascending
    const sorted = [...history].sort((a, b) => a.year - b.year);
    const n = sorted.length;
    const latest = sorted[n - 1] || {
      revenue: 0,
      operatingIncome: 0,
      netIncome: 0,
      dilutedEPS: 0,
      operatingCashFlow: 0,
      capitalExpenditures: 0,
      freeCashFlow: 0,
      cashAndEquivalents: 0,
      totalDebt: 0,
      netDebt: 0,
      stockholdersEquity: 0,
      sharesOutstanding: 1,
      grossProfit: 0,
      researchAndDevelopment: 0,
      year: 2025,
      period: 'FY 2025',
    };
    const prevYear = n >= 2 ? sorted[n - 2] : latest;
    const threeYearsAgo = n >= 4 ? sorted[n - 4] : (n >= 3 ? sorted[0] : latest);
    const fiveYearsAgo = n >= 6 ? sorted[n - 6] : (n >= 5 ? sorted[0] : null);

    const yearsBack3 = Math.min(3, Math.max(1, latest.year - threeYearsAgo.year));
    const yearsBack5 = fiveYearsAgo ? latest.year - fiveYearsAgo.year : null;

    // 1. Revenue Growths
    const revenueGrowth1Y = this.calculateGrowth(prevYear.revenue, latest.revenue);
    const revenueCAGR3Y = this.calculateCAGR(threeYearsAgo.revenue, latest.revenue, yearsBack3) ?? revenueGrowth1Y;
    const revenueCAGR5Y = fiveYearsAgo ? this.calculateCAGR(fiveYearsAgo.revenue, latest.revenue, yearsBack5!) : null;

    // 2. EPS Growths
    const epsGrowth1Y = this.calculateGrowth(prevYear.dilutedEPS, latest.dilutedEPS);
    const epsCAGR3Y = this.calculateCAGR(threeYearsAgo.dilutedEPS, latest.dilutedEPS, yearsBack3);

    // 3. Free Cash Flow Growths
    const fcfGrowth1Y = this.calculateGrowth(prevYear.freeCashFlow, latest.freeCashFlow);
    const fcfCAGR3Y = this.calculateCAGR(threeYearsAgo.freeCashFlow, latest.freeCashFlow, yearsBack3);

    // 4. Margins
    const grossMarginCurrent = latest.revenue > 0 && latest.grossProfit !== undefined
      ? Math.round((latest.grossProfit / latest.revenue) * 1000) / 10
      : 0;
    const grossMargin3YAgo = threeYearsAgo.revenue > 0 && threeYearsAgo.grossProfit !== undefined
      ? (threeYearsAgo.grossProfit / threeYearsAgo.revenue) * 100
      : grossMarginCurrent;
    const grossMarginTrend = Math.round((grossMarginCurrent - grossMargin3YAgo) * 10) / 10;

    const operatingMarginCurrent = latest.revenue > 0
      ? Math.round((latest.operatingIncome / latest.revenue) * 1000) / 10
      : 0;
    const operatingMargin3YAgo = threeYearsAgo.revenue > 0
      ? (threeYearsAgo.operatingIncome / threeYearsAgo.revenue) * 100
      : operatingMarginCurrent;
    const operatingMarginTrend = Math.round((operatingMarginCurrent - operatingMargin3YAgo) * 10) / 10;

    const netMarginCurrent = latest.revenue > 0
      ? Math.round((latest.netIncome / latest.revenue) * 1000) / 10
      : 0;

    // 5. Returns on Capital
    // NOPAT = Operating Income * (1 - 21% US statutory tax rate)
    const nopat = latest.operatingIncome * 0.79;
    const investedCapital = latest.totalDebt + latest.stockholdersEquity - Math.min(latest.cashAndEquivalents, latest.totalDebt);
    const roicCurrent = investedCapital > 0
      ? Math.round((nopat / investedCapital) * 1000) / 10
      : (latest.operatingIncome > 0 ? 18.5 : 0);

    const roeCurrent = latest.stockholdersEquity > 0
      ? Math.round((latest.netIncome / latest.stockholdersEquity) * 1000) / 10
      : 0;

    // 6. Operating Leverage
    const opIncomeGrowth1Y = this.calculateGrowth(prevYear.operatingIncome, latest.operatingIncome);
    const operatingLeverageRatio =
      revenueGrowth1Y > 0 && opIncomeGrowth1Y > 0
        ? Math.round((opIncomeGrowth1Y / revenueGrowth1Y) * 10) / 10
        : null;

    // 7. FCF Conversion Rate
    const fcfConversionRatio =
      latest.netIncome > 0
        ? Math.round((latest.freeCashFlow / latest.netIncome) * 100) / 100
        : 0;

    // 8. R&D Intensity
    const rdIntensityRatio =
      latest.revenue > 0 && latest.researchAndDevelopment !== undefined
        ? Math.round((latest.researchAndDevelopment / latest.revenue) * 1000) / 10
        : 0;

    // 9. Share Dilution
    const sharesCurrent = sharesCountOverride || latest.sharesOutstanding || 1;
    const shares3YAgo = threeYearsAgo.sharesOutstanding || sharesCurrent;
    const shareDilution3Y = Math.round(((sharesCurrent - shares3YAgo) / shares3YAgo) * 1000) / 10;

    // 10. Balance Sheet Ratios
    const netDebt = latest.totalDebt - latest.cashAndEquivalents;
    const ebitda = latest.operatingIncome + (latest.capitalExpenditures * 0.6); // proxy for D&A
    const netDebtToEbitda = ebitda > 0 ? Math.round((netDebt / ebitda) * 10) / 10 : null;
    const cashToDebtRatio = latest.totalDebt > 0 ? Math.round((latest.cashAndEquivalents / latest.totalDebt) * 10) / 10 : 999;
    const interestCoverageRatio = latest.totalDebt > 0 ? Math.round((latest.operatingIncome / (latest.totalDebt * 0.05)) * 10) / 10 : 99;

    const calculations: NormalizedGrowthCalculations = {
      revenueGrowth1Y,
      revenueCAGR3Y,
      revenueCAGR5Y,
      epsGrowth1Y,
      epsCAGR3Y,
      fcfGrowth1Y,
      fcfCAGR3Y,
      grossMarginCurrent,
      grossMarginTrend,
      operatingMarginCurrent,
      operatingMarginTrend,
      netMarginCurrent,
      roicCurrent,
      roeCurrent,
      operatingLeverageRatio,
      fcfConversionRatio,
      rdIntensityRatio,
      shareDilution3Y,
      netDebtToEbitda,
      interestCoverageRatio,
      cashToDebtRatio,
    };

    // Valuation Metrics
    const marketCap = currentPrice * sharesCurrent;
    const enterpriseValue = marketCap + netDebt;
    const peRatio = latest.dilutedEPS > 0 ? Math.round((currentPrice / latest.dilutedEPS) * 10) / 10 : null;
    const psRatio = latest.revenue > 0 ? Math.round((marketCap / latest.revenue) * 10) / 10 : 0;
    const evToEbitda = ebitda > 0 ? Math.round((enterpriseValue / ebitda) * 10) / 10 : null;
    const evToFcf = latest.freeCashFlow > 0 ? Math.round((enterpriseValue / latest.freeCashFlow) * 10) / 10 : null;
    const fcfYield = marketCap > 0 && latest.freeCashFlow > 0 ? Math.round((latest.freeCashFlow / marketCap) * 1000) / 10 : null;

    let valuationAssessment: ValuationMetrics['valuationAssessment'] = 'Fair Value';
    if (psRatio > 25 || (peRatio && peRatio > 70)) {
      valuationAssessment = 'Premium / Elevated';
    } else if (psRatio < 3 && peRatio && peRatio < 18) {
      valuationAssessment = 'Attractive';
    } else if (psRatio < 1.5 && peRatio && peRatio < 12) {
      valuationAssessment = 'Significantly Undervalued';
    } else if (!peRatio && psRatio > 15) {
      valuationAssessment = 'Speculative';
    }

    const qualityVsValuationDichotomy =
      operatingMarginCurrent > 15 && revenueGrowth1Y > 20 && valuationAssessment === 'Premium / Elevated'
        ? 'High Business Quality but Premium Multiple: Operational metrics display strong compounding execution, though current valuation leaves little room for execution missteps.'
        : operatingMarginCurrent > 15 && (valuationAssessment === 'Attractive' || valuationAssessment === 'Fair Value')
        ? 'Balanced Quality & Valuation: Generating robust profit margins with a multiple that does not appear excessively extended relative to historical growth.'
        : 'Growth-Focused Reinvestment: Valuation should be judged primarily against gross margin defensibility and runway for free cash flow inflection.';

    const valuation: ValuationMetrics = {
      currentPrice,
      currency: 'USD',
      marketCap,
      enterpriseValue,
      peRatio,
      forwardPeRatio: peRatio ? Math.round(peRatio * 0.85 * 10) / 10 : null,
      psRatio,
      pbRatio: latest.stockholdersEquity > 0 ? Math.round((marketCap / latest.stockholdersEquity) * 10) / 10 : null,
      evToEbitda,
      evToFcf,
      fcfYield,
      dividendYield: null,
      valuationAssessment,
      qualityVsValuationDichotomy,
    };

    // Early-Stage Characteristics Evaluation
    const earlyStageCharacteristics: EarlyStageCharacteristic[] = [
      {
        id: 'rev_growth',
        name: 'Revenue Acceleration / Rapid Scale',
        matched: revenueGrowth1Y >= 18 || revenueCAGR3Y >= 20,
        score: Math.min(100, Math.max(0, Math.round(revenueGrowth1Y * 2.5))),
        metricLabel: '1Y Growth / 3Y CAGR',
        metricValue: `+${revenueGrowth1Y}% / +${revenueCAGR3Y}%`,
        evidence: `Annual revenue increased from $${(threeYearsAgo.revenue / 1e6).toFixed(0)}M to $${(latest.revenue / 1e6).toFixed(0)}M over 3 years.`,
        historicalContext: 'Historically, enduring compounders maintained 20%+ top-line growth across multiple consecutive fiscal years.',
      },
      {
        id: 'margin_expansion',
        name: 'Operating Margin Expansion',
        matched: operatingMarginTrend > 1.5 || operatingMarginCurrent >= 18,
        score: Math.min(100, Math.max(0, Math.round(operatingMarginCurrent * 3 + operatingMarginTrend * 5))),
        metricLabel: 'Operating Margin (3Y Change)',
        metricValue: `${operatingMarginCurrent}% (${operatingMarginTrend >= 0 ? '+' : ''}${operatingMarginTrend}% pts)`,
        evidence: `Operating margin moved from ${(threeYearsAgo.operatingIncome / threeYearsAgo.revenue * 100).toFixed(1)}% to ${operatingMarginCurrent}%.`,
        historicalContext: 'Margin expansion reveals whether incremental revenue is becoming increasingly profitable as fixed overhead is absorbed.',
      },
      {
        id: 'fcf_generation',
        name: 'Free Cash Flow Inflection & Growth',
        matched: latest.freeCashFlow > 0 && fcfGrowth1Y > 10,
        score: latest.freeCashFlow > 0 ? Math.min(100, Math.max(20, Math.round(fcfGrowth1Y * 2))) : 10,
        metricLabel: '1Y FCF Growth',
        metricValue: latest.freeCashFlow > 0 ? `+${fcfGrowth1Y}% ($${(latest.freeCashFlow / 1e6).toFixed(0)}M)` : 'Negative FCF',
        evidence: `Generated $${(latest.freeCashFlow / 1e6).toFixed(0)}M in FCF after $${(latest.capitalExpenditures / 1e6).toFixed(0)}M of productive capex.`,
        historicalContext: 'True self-sustaining growth occurs when a company transitions from cash burner to durable free cash flow generator.',
      },
      {
        id: 'capital_efficiency',
        name: 'High Return on Invested Capital (ROIC)',
        matched: roicCurrent >= 12,
        score: Math.min(100, Math.max(0, Math.round(roicCurrent * 4))),
        metricLabel: 'Current ROIC',
        metricValue: `${roicCurrent}%`,
        evidence: `After-tax operating profit of $${(nopat / 1e6).toFixed(0)}M against $${(investedCapital / 1e6).toFixed(0)}M of invested capital.`,
        historicalContext: 'Companies with ROIC >15% generate compound value faster because every reinvested dollar earns high hurdle rates.',
      },
      {
        id: 'balance_sheet_fortress',
        name: 'Fortress Balance Sheet (Net Cash)',
        matched: netDebt <= 0 || (netDebtToEbitda !== null && netDebtToEbitda <= 1.5),
        score: netDebt <= 0 ? 95 : Math.max(20, Math.round(100 - (netDebtToEbitda || 2) * 25)),
        metricLabel: 'Net Cash / Debt to EBITDA',
        metricValue: netDebt <= 0 ? `Net Cash $${Math.abs(netDebt / 1e6).toFixed(0)}M` : `${netDebtToEbitda}x EBITDA`,
        evidence: `Total cash & liquid assets of $${(latest.cashAndEquivalents / 1e6).toFixed(0)}M vs $${(latest.totalDebt / 1e6).toFixed(0)}M in debt obligations.`,
        historicalContext: 'Net cash buffers insulate growing companies against sudden macro liquidity freezes and allow opportunistic R&D.',
      },
      {
        id: 'rd_reinvestment',
        name: 'High R&D Reinvestment Intensity',
        matched: rdIntensityRatio >= 12,
        score: Math.min(100, Math.max(0, Math.round(rdIntensityRatio * 4))),
        metricLabel: 'R&D % of Revenue',
        metricValue: `${rdIntensityRatio}% ($${((latest.researchAndDevelopment || 0) / 1e6).toFixed(0)}M)`,
        evidence: `Reinvested $${((latest.researchAndDevelopment || 0) / 1e6).toFixed(0)}M into proprietary software, IP, and engineering this year.`,
        historicalContext: 'Aggressive, productive R&D builds widening technological moats that prevent product obsolescence.',
      },
      {
        id: 'operating_leverage',
        name: 'Operating Leverage in Motion',
        matched: operatingLeverageRatio !== null && operatingLeverageRatio > 1.1,
        score: operatingLeverageRatio ? Math.min(100, Math.round(operatingLeverageRatio * 50)) : 40,
        metricLabel: 'Operating Leverage Factor',
        metricValue: operatingLeverageRatio ? `${operatingLeverageRatio}x` : 'N/A',
        evidence: `Operating income grew ${opIncomeGrowth1Y}% while revenue grew ${revenueGrowth1Y}%.`,
        historicalContext: 'A leverage ratio above 1.1x demonstrates that unit economics improve substantially as sales scale.',
      },
      {
        id: 'share_count_discipline',
        name: 'Dilution Discipline (<2% Annualized)',
        matched: shareDilution3Y <= 6, // approx 2% per year over 3 years
        score: Math.min(100, Math.max(10, Math.round(100 - Math.max(0, shareDilution3Y) * 5))),
        metricLabel: '3Y Share Count Change',
        metricValue: `${shareDilution3Y >= 0 ? '+' : ''}${shareDilution3Y}%`,
        evidence: `Shares outstanding changed from ${(shares3YAgo / 1e6).toFixed(1)}M to ${(sharesCurrent / 1e6).toFixed(1)}M.`,
        historicalContext: 'Prevents existing shareholders from having their ownership percentage eroded by excessive executive stock grants.',
      },
    ];

    const matchedCount = earlyStageCharacteristics.filter((c) => c.matched).length;
    const earlyStageScore = Math.round((matchedCount / earlyStageCharacteristics.length) * 100);

    const whyItAppeared: string[] = [];
    if (revenueGrowth1Y >= 20) {
      whyItAppeared.push(`Revenue expanded +${revenueGrowth1Y}% YoY with 3Y CAGR of +${revenueCAGR3Y}%`);
    }
    if (operatingMarginTrend > 1) {
      whyItAppeared.push(`Operating margins expanded by +${operatingMarginTrend}% points over the past 3 years`);
    }
    if (latest.freeCashFlow > 0 && fcfGrowth1Y > 15) {
      whyItAppeared.push(`Free cash flow is growing (+${fcfGrowth1Y}% YoY) to $${(latest.freeCashFlow / 1e6).toFixed(0)}M`);
    }
    if (netDebt <= 0) {
      whyItAppeared.push(`Fortress balance sheet with $${Math.abs(netDebt / 1e6).toFixed(0)}M in net cash reserves`);
    }
    if (roicCurrent >= 15) {
      whyItAppeared.push(`Generates high return on invested capital (${roicCurrent}% ROIC)`);
    }
    if (rdIntensityRatio >= 15) {
      whyItAppeared.push(`Reinvests heavily in future product defensibility (${rdIntensityRatio}% of sales into R&D)`);
    }
    if (whyItAppeared.length === 0) {
      whyItAppeared.push(`Consistent operational scale with ${operatingMarginCurrent}% operating margin`);
    }

    return {
      calculations,
      valuation,
      earlyStageCharacteristics,
      earlyStageScore,
      whyItAppeared,
    };
  }
}
