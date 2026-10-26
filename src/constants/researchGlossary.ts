import { EducationalGlossaryTerm } from '../types/research';

export const RESEARCH_GLOSSARY_TERMS: Record<string, EducationalGlossaryTerm> = {
  ROIC: {
    term: 'ROIC',
    title: 'Return on Invested Capital (ROIC)',
    shortDefinition: 'Measures how efficiently a business converts debt and equity capital into after-tax operating profit.',
    formula: 'ROIC = NOPAT / (Total Debt + Stockholders Equity - Excess Cash)',
    detailedExplanation:
      'ROIC answers: "For every $100 tied up in factories, software development, working capital, and equipment, how many dollars of operating profit does the company produce?" It is widely considered by long-term investors to be one of the best indicators of a sustainable competitive advantage (economic moat).',
    whyGrowthInvestorsCare:
      'High growth funded by low ROIC dilutes shareholder value. Companies with ROIC well above their cost of capital can self-fund aggressive reinvestment without taking on dangerous debt or heavily diluting existing shareholders.',
    whatIsGood: 'ROIC above 15% is strong; sustained ROIC above 20% indicates an exceptional, highly efficient business model.',
    commonPitfall: 'Comparing ROIC across different industries. Software and asset-light models naturally have higher ROIC than heavy manufacturing or capital-intensive utilities.',
  },
  FCF: {
    term: 'FCF',
    title: 'Free Cash Flow (FCF)',
    shortDefinition: 'Actual cash remaining after funding operations and required capital expenditures (equipment/servers).',
    formula: 'Free Cash Flow = Cash Flow from Operations - Capital Expenditures (Capex)',
    detailedExplanation:
      'Accounting Net Income (GAAP EPS) includes non-cash items like depreciation, stock-based compensation, and deferred revenue. Free Cash Flow is the tangible green cash that the company can actually use to reinvest in R&D, pay down debt, buy back shares, or weather recessions.',
    whyGrowthInvestorsCare:
      'Early-stage winners often hit an "FCF inflection point" where high upfront software/infrastructure investments taper off while recurring subscription revenue compounds, creating massive cash generation.',
    whatIsGood: 'Positive, steadily expanding FCF and an FCF conversion rate (FCF / Net Income) close to or exceeding 100%.',
    commonPitfall: 'Ignoring working capital swings or heavy stock-based compensation that artificially inflates operating cash flow.',
  },
  CAGR: {
    term: 'CAGR',
    title: 'Compound Annual Growth Rate (CAGR)',
    shortDefinition: 'The smoothed annual rate of growth over a multi-year period, eliminating single-year volatility.',
    formula: 'CAGR = (Ending Value / Beginning Value) ^ (1 / Number of Years) - 1',
    detailedExplanation:
      'Instead of looking at erratic year-to-year fluctuations, 3-Year and 5-Year CAGR shows whether a company has a durable, multi-year compounding trajectory.',
    whyGrowthInvestorsCare:
      'Separates temporary one-time revenue spikes (like pandemic surges or temporary commodity booms) from secular compounding businesses.',
    whatIsGood: 'A 3-Year revenue CAGR above 20% indicates rapid growth; above 30% indicates hyper-growth.',
    commonPitfall: 'Assuming historical CAGR automatically continues into the future as the company grows larger (law of large numbers).',
  },
  OperatingLeverage: {
    term: 'OperatingLeverage',
    title: 'Operating Leverage',
    shortDefinition: 'The degree to which revenue growth outpaces operating expense growth, accelerating operating profit.',
    formula: 'Operating Leverage = % Change in Operating Income / % Change in Revenue',
    detailedExplanation:
      'When a company has fixed overhead (like platform architecture or proprietary technology) that doesn\'t need to double when sales double, each incremental dollar of revenue drops more heavily to the bottom line.',
    whyGrowthInvestorsCare:
      'Companies with high operating leverage can experience explosive earnings growth even during moderate top-line expansion.',
    whatIsGood: 'A ratio greater than 1.2x demonstrates healthy operating leverage.',
    commonPitfall: 'Operating leverage cuts both ways: if revenue contracts, fixed overhead can cause profit to drop precipitously.',
  },
  GrossMargin: {
    term: 'GrossMargin',
    title: 'Gross Margin (%)',
    shortDefinition: 'Percentage of revenue remaining after subtracting the direct cost of goods or services sold (COGS).',
    formula: 'Gross Margin = (Revenue - Cost of Goods Sold) / Revenue × 100',
    detailedExplanation:
      'Gross margin reflects raw pricing power and production efficiency before general corporate overhead, sales marketing, and administration are factored in.',
    whyGrowthInvestorsCare:
      'High gross margins (70%+) give a growth company tremendous financial buffer to aggressively spend on R&D and customer acquisition while still maintaining profitability potential.',
    whatIsGood: 'SaaS and software typically target 70%-85%; consumer/hardware 30%-50%; industrial/manufacturing 20%-40%.',
    commonPitfall: 'Assuming high gross margin guarantees a profitable business. High gross margins with undisciplined operational spending still loses money.',
  },
  OperatingMargin: {
    term: 'OperatingMargin',
    title: 'Operating Margin (%)',
    shortDefinition: 'The percentage of sales left over after paying all core business and operating expenses.',
    formula: 'Operating Margin = Operating Income / Revenue × 100',
    detailedExplanation:
      'Operating margin shows the core economic viability of the company before financing structure (interest expenses) and taxes.',
    whyGrowthInvestorsCare:
      'Expanding operating margins over a 3-year period is one of the clearest quantitative markers of a company scaling efficiently.',
    whatIsGood: 'Steady expansion year-over-year. 15%-30% is considered healthy across modern tech and business services.',
    commonPitfall: 'Overlooking one-time restructuring charges or litigation that might temporarily depress operating margin in a single quarter.',
  },
  PE: {
    term: 'PE',
    title: 'Price-to-Earnings Ratio (P/E)',
    shortDefinition: 'The multiple investors are currently paying for each dollar of annual net income.',
    formula: 'P/E = Current Stock Price / Diluted Annual Earnings Per Share (EPS)',
    detailedExplanation:
      'A P/E of 25 means investors are paying $25 for every $1 of trailing twelve months profit. It reflects market expectations of future growth and durability.',
    whyGrowthInvestorsCare:
      'High-growth companies frequently command higher P/E multiples because their future earnings are expected to be much higher than trailing earnings.',
    whatIsGood: 'Context-dependent. Must always be evaluated against the company\'s growth rate (e.g. PEG ratio = P/E / Growth Rate).',
    commonPitfall: 'Treating low P/E as automatically "cheap" (value traps) or high P/E as automatically "overpriced".',
  },
  PS: {
    term: 'PS',
    title: 'Price-to-Sales Ratio (P/S)',
    shortDefinition: 'Valuation multiple comparing market capitalization directly to total annual revenue.',
    formula: 'P/S = Market Capitalization / Total Annual Revenue',
    detailedExplanation:
      'Useful for evaluating early-growth companies that are deliberately reinvesting all cash into R&D and customer acquisition, meaning net income is near zero or negative.',
    whyGrowthInvestorsCare:
      'Provides a baseline valuation anchor when GAAP EPS has not yet inflected into sustained positive territory.',
    whatIsGood: 'Software & high gross margin companies often trade at 6x-15x P/S; lower margin retail/industrials trade at 1x-3x P/S.',
    commonPitfall: 'Comparing P/S across different business models with vastly different gross margins.',
  },
  EV_EBITDA: {
    term: 'EV_EBITDA',
    title: 'Enterprise Value to EBITDA (EV/EBITDA)',
    shortDefinition: 'Valuation multiple that accounts for debt and cash, measuring operational enterprise cost.',
    formula: 'EV/EBITDA = (Market Cap + Debt - Cash) / (Operating Income + Depreciation + Amortization)',
    detailedExplanation:
      'Enterprise Value accounts for the whole capital structure. If a company has $10B market cap but $5B in debt, buying the whole company actually costs $15B minus cash. EV/EBITDA normalizes for debt burdens.',
    whyGrowthInvestorsCare:
      'Prevents investors from falling into the trap of buying "cheap" P/E companies that are secretly levered with massive debt liabilities.',
    whatIsGood: 'Below 15x is reasonable for moderate growth; 15x-30x is common for high-quality compounding leaders.',
    commonPitfall: 'EBITDA ignores capital expenditure requirements. As Warren Buffett famously noted: "Does management think the tooth fairy pays for capex?"',
  },
  FCFYield: {
    term: 'FCFYield',
    title: 'Free Cash Flow Yield (%)',
    shortDefinition: 'The percentage of free cash flow generated relative to the company\'s current market capitalization.',
    formula: 'FCF Yield = Free Cash Flow / Market Capitalization × 100',
    detailedExplanation:
      'The inverse of the P/FCF multiple. A 5% FCF yield means the company produces $5 of real discretionary cash each year for every $100 of market value.',
    whyGrowthInvestorsCare:
      'Allows apples-to-apples comparison between high-growth cash generators and bond yields or real estate cap rates.',
    whatIsGood: '3%-6% is solid for a growing company; above 7% is exceptionally cash-generative.',
    commonPitfall: 'A single year with abnormal working capital swings or delayed capex can artificially spike FCF yield.',
  },
  NetDebt: {
    term: 'NetDebt',
    title: 'Net Debt',
    shortDefinition: 'Total interest-bearing debt minus available cash and short-term liquid investments.',
    formula: 'Net Debt = (Short-term Debt + Long-term Debt) - Cash and Cash Equivalents',
    detailedExplanation:
      'A negative Net Debt number means the company has a "Net Cash" balance sheet — more cash in the bank than all outstanding debt combined.',
    whyGrowthInvestorsCare:
      'Companies with large net cash positions hold a fortress balance sheet. They cannot go bankrupt during credit crunches and can aggressively acquire distressed competitors or buy back undervalued stock.',
    whatIsGood: 'Net Cash (negative net debt) is the gold standard for high-growth tech companies.',
    commonPitfall: 'Confusing gross total debt with net debt, or counting restricted escrow cash as spendable cash.',
  },
  RDIntensity: {
    term: 'RDIntensity',
    title: 'R&D Intensity Ratio (%)',
    shortDefinition: 'The percentage of total revenue continuously reinvested into research and engineering.',
    formula: 'R&D Intensity = Research and Development Expense / Total Revenue × 100',
    detailedExplanation:
      'Measures the company\'s commitment to building proprietary technological leads, next-generation product suites, and defensible IP barriers.',
    whyGrowthInvestorsCare:
      'Early-stage compounders that reinvest 15%-25% of revenue into high-ROI engineering often expand their competitive distance over legacy incumbents who skimp on R&D to boost short-term quarterly EPS.',
    whatIsGood: '15%-25% for high-tech, software, semiconductors, and biotech platforms.',
    commonPitfall: 'Spending heavily on R&D without commercially viable products (R&D waste).',
  },
  ShareDilution: {
    term: 'ShareDilution',
    title: 'Share Dilution / Share Count Trend',
    shortDefinition: 'The change in total shares outstanding over time, driven by employee stock compensation or equity offerings.',
    formula: 'Dilution % = (Ending Shares - Beginning Shares) / Beginning Shares × 100',
    detailedExplanation:
      'Even if a company\'s net income grows by 30%, if management issues 10% more shares each year, existing shareholders only capture a fraction of that growth.',
    whyGrowthInvestorsCare:
      'Disciplined capital allocation protects per-share growth. Companies with moderate or decreasing share counts compound true shareholder wealth.',
    whatIsGood: 'Flat share count or net share repurchases (<1% annual growth). Annual dilution over 3%-5% requires caution.',
    commonPitfall: 'Ignoring heavy stock-based compensation (SBC) that gets hidden under "non-GAAP adjusted EBITDA".',
  },
};
