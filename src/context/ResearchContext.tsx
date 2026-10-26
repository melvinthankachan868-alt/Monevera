import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  CompanyResearchSummary,
  CompanyResearchDetail,
  ResearchFilterCriteria,
  WatchlistCompanyItem,
  ResearchAlertConfig,
  EducationalGlossaryTerm,
} from '../types/research';
import { RESEARCH_GLOSSARY_TERMS } from '../constants/researchGlossary';
import { useFinTraQ } from './FinTraQContext';
import {
  saveResearchWatchlistItemToCloud,
  deleteResearchWatchlistItemFromCloud,
  getResearchWatchlistFromCloud,
  saveResearchAlertToCloud,
  deleteResearchAlertFromCloud,
  getResearchAlertsFromCloud,
} from '../db/cloudFirestore';

export type ResearchSubTab = 'discover' | 'profile' | 'watchlist' | 'compare' | 'reports' | 'ai';

interface ResearchContextType {
  subTab: ResearchSubTab;
  setSubTab: (tab: ResearchSubTab) => void;
  selectedTicker: string;
  setSelectedTicker: (ticker: string) => void;
  openCompanyProfile: (ticker: string) => void;
  compareTickers: string[];
  setCompareTickers: React.Dispatch<React.SetStateAction<string[]>>;
  addToCompare: (ticker: string) => void;
  removeFromCompare: (ticker: string) => void;

  // Discovery Filter State
  filters: ResearchFilterCriteria;
  setFilters: React.Dispatch<React.SetStateAction<ResearchFilterCriteria>>;
  resetFilters: () => void;
  applyPreset: (preset: ResearchFilterCriteria['preset']) => void;

  // Screening Data
  companies: CompanyResearchSummary[];
  isLoadingDiscovery: boolean;
  discoveryError: string | null;
  refreshDiscovery: () => Promise<void>;

  // Broad Indian Equity Search (5,180+ universe) with debounce & race condition protection
  searchResults: CompanyResearchSummary[];
  isSearching: boolean;
  searchIndianEquities: (query: string) => Promise<CompanyResearchSummary[]>;

  // Paginated Broader Discovery (5,180+ universe)
  browseCompaniesList: CompanyResearchSummary[];
  browsePage: number;
  browseTotalPages: number;
  browseTotalCount: number;
  isLoadingBrowse: boolean;
  setBrowsePage: (page: number) => void;
  refreshBrowse: () => Promise<void>;

  // Selected Company Details
  activeProfile: CompanyResearchDetail | null;
  isLoadingProfile: boolean;
  profileError: string | null;
  loadProfile: (ticker: string) => Promise<void>;

  // Watchlist
  watchlist: WatchlistCompanyItem[];
  addToWatchlist: (company: CompanyResearchSummary | CompanyResearchDetail, note?: string) => void;
  removeFromWatchlist: (ticker: string) => void;
  isWatchlisted: (ticker: string) => boolean;
  updateWatchlistNote: (ticker: string, note: string) => void;

  // Research Alerts
  alerts: ResearchAlertConfig[];
  addAlert: (alert: Omit<ResearchAlertConfig, 'id' | 'createdAt' | 'isTriggered'>) => void;
  removeAlert: (id: string) => void;

  // Educational Glossary
  glossaryModalOpen: boolean;
  selectedGlossaryTerm: EducationalGlossaryTerm | null;
  openGlossary: (termKey: string) => void;
  closeGlossary: () => void;

  // Ask Mike Research
  isMikeResearching: boolean;
  askMikeResearch: (query: string, tickerContext?: string) => Promise<string>;
}

const DEFAULT_FILTERS: ResearchFilterCriteria = {
  searchQuery: '',
  market: 'All',
  sector: 'All',
  marketCap: 'All',
  minRevenueGrowth: 0,
  minFCFGrowth: 0,
  minOperatingMargin: 0,
  minROIC: 0,
  maxNetDebtToEbitda: null,
  maxPE: null,
  maxPS: null,
  earlyStageGrowthOnly: false,
  profitableOnly: false,
  positiveFCFOnly: false,
  preset: 'all',
};

const WATCHLIST_STORAGE_KEY = 'money_vault_research_watchlist';
const ALERTS_STORAGE_KEY = 'money_vault_research_alerts';

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

export const ResearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useFinTraQ();

  const [subTab, setSubTab] = useState<ResearchSubTab>('discover');
  const [selectedTicker, setSelectedTicker] = useState<string>('TCS');
  const [compareTickers, setCompareTickers] = useState<string[]>(['TCS', 'INFY', 'RELIANCE']);

  const [filters, setFilters] = useState<ResearchFilterCriteria>(DEFAULT_FILTERS);
  const [companies, setCompanies] = useState<CompanyResearchSummary[]>([]);
  const [isLoadingDiscovery, setIsLoadingDiscovery] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [activeProfile, setActiveProfile] = useState<CompanyResearchDetail | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Broad Indian Equity Search (5,180+ universe) with debounce & race condition protection
  const [searchResults, setSearchResults] = useState<CompanyResearchSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const searchRequestIdRef = useRef<number>(0);

  // Paginated Broader Discovery (5,180+ universe)
  const [browseCompaniesList, setBrowseCompaniesList] = useState<CompanyResearchSummary[]>([]);
  const [browsePage, setBrowsePage] = useState<number>(1);
  const [browseTotalPages, setBrowseTotalPages] = useState<number>(1);
  const [browseTotalCount, setBrowseTotalCount] = useState<number>(0);
  const [isLoadingBrowse, setIsLoadingBrowse] = useState<boolean>(false);

  const [watchlist, setWatchlist] = useState<WatchlistCompanyItem[]>(() => {
    try {
      const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [alerts, setAlerts] = useState<ResearchAlertConfig[]>(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Educational Glossary
  const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
  const [selectedGlossaryTerm, setSelectedGlossaryTerm] = useState<EducationalGlossaryTerm | null>(null);

  const [isMikeResearching, setIsMikeResearching] = useState(false);

  // Sync Watchlist and Alerts from Cloud Firestore when user is authenticated
  useEffect(() => {
    if (!user?.uid) return;
    let isCancelled = false;

    const loadCloudData = async () => {
      try {
        const [cloudWatchlist, cloudAlerts] = await Promise.all([
          getResearchWatchlistFromCloud(user.uid),
          getResearchAlertsFromCloud(user.uid),
        ]);
        if (isCancelled) return;
        if (cloudWatchlist && cloudWatchlist.length > 0) {
          setWatchlist(cloudWatchlist as WatchlistCompanyItem[]);
        }
        if (cloudAlerts && cloudAlerts.length > 0) {
          setAlerts(cloudAlerts as ResearchAlertConfig[]);
        }
      } catch (err) {
        console.warn('Could not load research data from cloud:', err);
      }
    };

    loadCloudData();
    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  // Sync Watchlist and Alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
    } catch (e) {
      console.warn('Could not save watchlist to localStorage:', e);
    }
  }, [watchlist]);

  useEffect(() => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.warn('Could not save alerts to localStorage:', e);
    }
  }, [alerts]);

  // Load discovery data from API
  const refreshDiscovery = useCallback(async () => {
    setIsLoadingDiscovery(true);
    setDiscoveryError(null);
    try {
      const params = new URLSearchParams();
      if (filters.searchQuery) params.set('search', filters.searchQuery);
      if (filters.sector !== 'All') params.set('sector', filters.sector);
      if (filters.marketCap !== 'All') params.set('marketCap', filters.marketCap);
      if (filters.minRevenueGrowth > 0) params.set('minRevenueGrowth', String(filters.minRevenueGrowth));
      if (filters.minFCFGrowth > 0) params.set('minFCFGrowth', String(filters.minFCFGrowth));
      if (filters.minOperatingMargin > 0) params.set('minOperatingMargin', String(filters.minOperatingMargin));
      if (filters.minROIC > 0) params.set('minROIC', String(filters.minROIC));
      if (filters.maxPE) params.set('maxPE', String(filters.maxPE));
      if (filters.maxPS) params.set('maxPS', String(filters.maxPS));
      if (filters.preset !== 'all') params.set('preset', filters.preset);
      if (filters.profitableOnly) params.set('profitableOnly', 'true');
      if (filters.positiveFCFOnly) params.set('positiveFCFOnly', 'true');

      const res = await fetch(`/api/research/discover?${params.toString()}`);
      if (!res.ok) throw new Error(`Discovery returned status ${res.status}`);
      const data = await res.json();
      setCompanies(data.companies || []);
    } catch (err: any) {
      console.error('Discovery load error:', err);
      setDiscoveryError(err.message || 'Could not load stock discovery data');
    } finally {
      setIsLoadingDiscovery(false);
    }
  }, [filters]);

  // Trigger discovery search on filters change
  useEffect(() => {
    refreshDiscovery();
  }, [refreshDiscovery]);

  // Broad Indian Equity Search with race condition protection (AbortController + requestId)
  const searchIndianEquities = useCallback(async (query: string): Promise<CompanyResearchSummary[]> => {
    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }

    const currentReqId = ++searchRequestIdRef.current;
    const controller = new AbortController();
    searchAbortControllerRef.current = controller;

    if (!query || !query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return [];
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/research/search?q=${encodeURIComponent(query.trim())}&limit=12`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Search error status: ${res.status}`);
      const data = await res.json();

      if (currentReqId === searchRequestIdRef.current) {
        const results = data.results || [];
        setSearchResults(results);
        setIsSearching(false);
        return results;
      }
      return [];
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return [];
      }
      console.warn('Search request failed:', err);
      if (currentReqId === searchRequestIdRef.current) {
        setIsSearching(false);
      }
      return [];
    }
  }, []);

  // Paginated Browse over 5,180+ companies
  const refreshBrowse = useCallback(async () => {
    setIsLoadingBrowse(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(browsePage));
      params.set('limit', '25');
      if (filters.sector !== 'All') params.set('sector', filters.sector);
      if (filters.market !== 'All') params.set('exchange', filters.market);
      if (filters.searchQuery) params.set('search', filters.searchQuery);

      const res = await fetch(`/api/research/browse?${params.toString()}`);
      if (!res.ok) throw new Error(`Browse error status ${res.status}`);
      const data = await res.json();

      setBrowseCompaniesList(data.companies || []);
      setBrowseTotalCount(data.totalCount || 0);
      setBrowseTotalPages(data.totalPages || 1);
    } catch (err) {
      console.warn('Browse request error:', err);
    } finally {
      setIsLoadingBrowse(false);
    }
  }, [browsePage, filters.sector, filters.market, filters.searchQuery]);

  useEffect(() => {
    refreshBrowse();
  }, [refreshBrowse]);

  // Load single company profile
  const loadProfile = useCallback(async (ticker: string) => {
    if (!ticker) return;
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch(`/api/research/company/${encodeURIComponent(ticker.toUpperCase())}`);
      if (!res.ok) {
        throw new Error(`Company profile for ${ticker} returned status ${res.status}`);
      }
      const data = await res.json();
      setActiveProfile(data.company);
    } catch (err: any) {
      console.error('Profile load error:', err);
      setProfileError(err.message || `Could not load fundamental profile for ${ticker}`);
    } finally {
      setIsLoadingProfile(false);
    }
  }, []);

  // When selectedTicker changes, fetch profile
  useEffect(() => {
    loadProfile(selectedTicker);
  }, [selectedTicker, loadProfile]);

  const openCompanyProfile = (ticker: string) => {
    setSelectedTicker(ticker.toUpperCase());
    setSubTab('profile');
  };

  const addToCompare = (ticker: string) => {
    const sym = ticker.toUpperCase();
    if (!compareTickers.includes(sym) && compareTickers.length < 5) {
      setCompareTickers((prev) => [...prev, sym]);
    }
    setSubTab('compare');
  };

  const removeFromCompare = (ticker: string) => {
    setCompareTickers((prev) => prev.filter((t) => t !== ticker.toUpperCase()));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const applyPreset = (preset: ResearchFilterCriteria['preset']) => {
    setFilters((prev) => ({
      ...DEFAULT_FILTERS,
      searchQuery: prev.searchQuery,
      preset,
    }));
  };

  // Watchlist operations
  const addToWatchlist = (company: CompanyResearchSummary | CompanyResearchDetail, note?: string) => {
    const newItem: WatchlistCompanyItem = {
      ticker: company.ticker,
      nseSymbol: company.nseSymbol || company.ticker,
      bseCode: company.bseCode,
      exchange: company.exchange,
      name: company.name,
      sector: company.sector,
      price: company.price,
      marketCap: company.marketCap,
      peRatio: company.valuation.peRatio,
      revenueGrowth1Y: company.calculations.revenueGrowth1Y,
      fcfGrowth1Y: company.calculations.fcfGrowth1Y,
      operatingMargin: company.calculations.operatingMarginCurrent,
      addedAt: new Date().toISOString(),
      personalNote: note || '',
      notifyOnFiling: true,
      notifyOnEarnings: true,
      notifyOnGrowthShift: true,
    };

    setWatchlist((prev) => {
      if (prev.some((item) => item.ticker === company.ticker)) {
        return prev;
      }
      return [newItem, ...prev];
    });

    if (user?.uid) {
      saveResearchWatchlistItemToCloud(user.uid, newItem).catch((err) =>
        console.warn('Could not sync watchlisted company to cloud:', err)
      );
    }
  };

  const removeFromWatchlist = (ticker: string) => {
    const sym = ticker.toUpperCase();
    setWatchlist((prev) => prev.filter((item) => item.ticker !== sym));
    if (user?.uid) {
      deleteResearchWatchlistItemFromCloud(user.uid, sym).catch((err) =>
        console.warn('Could not delete watchlisted company from cloud:', err)
      );
    }
  };

  const isWatchlisted = (ticker: string) => {
    return watchlist.some((item) => item.ticker === ticker.toUpperCase());
  };

  const updateWatchlistNote = (ticker: string, note: string) => {
    const sym = ticker.toUpperCase();
    setWatchlist((prev) => {
      const updated = prev.map((item) => (item.ticker === sym ? { ...item, personalNote: note } : item));
      const target = updated.find((i) => i.ticker === sym);
      if (target && user?.uid) {
        saveResearchWatchlistItemToCloud(user.uid, target).catch((err) =>
          console.warn('Could not update watchlist note in cloud:', err)
        );
      }
      return updated;
    });
  };

  // Alert operations
  const addAlert = (alertData: Omit<ResearchAlertConfig, 'id' | 'createdAt' | 'isTriggered'>) => {
    const newAlert: ResearchAlertConfig = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      isTriggered: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);
    if (user?.uid) {
      saveResearchAlertToCloud(user.uid, newAlert).catch((err) =>
        console.warn('Could not sync research alert to cloud:', err)
      );
    }
  };

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    if (user?.uid) {
      deleteResearchAlertFromCloud(user.uid, id).catch((err) =>
        console.warn('Could not delete research alert from cloud:', err)
      );
    }
  };

  // Glossary popover
  const openGlossary = (termKey: string) => {
    const term = RESEARCH_GLOSSARY_TERMS[termKey];
    if (term) {
      setSelectedGlossaryTerm(term);
      setGlossaryModalOpen(true);
    }
  };

  const closeGlossary = () => {
    setGlossaryModalOpen(false);
    setSelectedGlossaryTerm(null);
  };

  // Ask Mike Research
  const askMikeResearch = async (query: string, tickerContext?: string): Promise<string> => {
    setIsMikeResearching(true);
    try {
      const res = await fetch('/api/research/ask-mike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, tickerContext }),
      });
      if (!res.ok) {
        throw new Error(`Research inquiry returned status ${res.status}`);
      }
      const data = await res.json();
      return data.reply;
    } catch (err: any) {
      console.error('Ask Mike research error:', err);
      return `Mike could not complete the research query: ${err.message || 'Unknown network error'}.`;
    } finally {
      setIsMikeResearching(false);
    }
  };

  return (
    <ResearchContext.Provider
      value={{
        subTab,
        setSubTab,
        selectedTicker,
        setSelectedTicker,
        openCompanyProfile,
        compareTickers,
        setCompareTickers,
        addToCompare,
        removeFromCompare,
        filters,
        setFilters,
        resetFilters,
        applyPreset,
        companies,
        isLoadingDiscovery,
        discoveryError,
        refreshDiscovery,
        searchResults,
        isSearching,
        searchIndianEquities,
        browseCompaniesList,
        browsePage,
        browseTotalPages,
        browseTotalCount,
        isLoadingBrowse,
        setBrowsePage,
        refreshBrowse,
        activeProfile,
        isLoadingProfile,
        profileError,
        loadProfile,
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        isWatchlisted,
        updateWatchlistNote,
        alerts,
        addAlert,
        removeAlert,
        glossaryModalOpen,
        selectedGlossaryTerm,
        openGlossary,
        closeGlossary,
        isMikeResearching,
        askMikeResearch,
      }}
    >
      {children}
    </ResearchContext.Provider>
  );
};

export const useResearch = () => {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
};
