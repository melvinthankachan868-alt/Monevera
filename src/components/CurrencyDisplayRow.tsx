import React,{ useState,useEffect } from 'react';
import { useFinTraQ } from '../context/FinTraQContext';
import {
convertInrToCurrency,
isRateExpired,
formatRatePublishedDate,
isValidFxRate,
isSafeProviderUrl,
} from '../utils/currencyConversion';
import { ExternalLink,RefreshCw,AlertCircle } from 'lucide-react';

interface CurrencyDisplayRowProps {
  baseAmountInr: number;
  label?: string;
}

interface FxApiResponse {
  base: string;
  rates: Record<string, number>;
  provider: string;
  providerUrl: string;
  attributionText: string;
  termsUrl: string;
  publishedDate: string;
  publishedTimestamp: number;
  stale: boolean;
}

export const CurrencyDisplayRow: React.FC<CurrencyDisplayRowProps> = ({
  baseAmountInr,
  label = 'Net worth',
}) => {
  const { user, settings } = useFinTraQ();

  // (Guest isolation: guests see no conversion)
  if (!user) {
    return null;
  }

  const secondary = settings?.secondaryCurrencies || [];
  if (secondary.length === 0) {
    return null;
  }

  const [fxData, setFxData] = useState<FxApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRates() {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const token = await user?.getIdToken();
        if (!token) {
          if (isMounted) setIsLoading(false);
          return;
        }

        const res = await fetch('/api/fx/rates', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || `Server returned ${res.status}`);
        }

        const data: FxApiResponse = await res.json();
        if (isMounted) {
          setFxData(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Unable to load currency rates');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRates();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (isLoading && !fxData) {
    return (
      <div className="flex items-center gap-2 text-xs text-[var(--mv-text-muted)] pt-2 animate-pulse">
        <RefreshCw size={12} className="animate-spin text-[var(--mv-primary)]" />
        <span>Fetching live currency rates...</span>
      </div>
    );
  }

  if (errorMsg && !fxData) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--mv-text-muted)] pt-2">
        <AlertCircle size={13} className="text-[var(--mv-warning)] shrink-0" />
        <span>Currency conversion temporarily unavailable.</span>
      </div>
    );
  }

  if (!fxData) {
    return null;
  }

  const ratesExpired = isRateExpired(fxData.publishedTimestamp);

  return (
    <div className="pt-3 border-t border-[var(--mv-border)]/60 space-y-2 animate-in fade-in duration-200">
      {/* Converted Currencies Row */}
      {ratesExpired ? (
        <div className="text-[11px] text-[var(--mv-text-muted)] italic flex items-center gap-1.5">
          <AlertCircle size={13} className="text-[var(--mv-warning)] shrink-0" />
          <span>Rates are older than 5 days. Secondary estimates hidden until refreshed.</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {secondary.map((curr) => {
            const rate = fxData.rates[curr];
            if (!isValidFxRate(rate)) {
              return (
                <div
                  key={curr}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--mv-surface)]/60 border border-[var(--mv-border)] text-[11px] text-[var(--mv-text-muted)]"
                >
                  <span>{curr} unavailable right now</span>
                </div>
              );
            }

            const conversion = convertInrToCurrency(baseAmountInr, rate, curr);

            return (
              <div
                key={curr}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--mv-surface)] border border-[var(--mv-border)] text-xs shadow-2xs hover:border-[var(--mv-primary)]/40 transition-colors"
                title={`Estimated at 1 INR = ${rate} ${curr}`}
              >
                <span className="font-semibold text-[var(--mv-text-muted)] text-[11px]">
                  {label ? `${label} ≈` : '≈'}
                </span>
                <span className="font-extrabold text-[var(--mv-text-primary)] tabular-nums tracking-tight">
                  {conversion.formatted}
                </span>
                <span className="text-[10px] font-bold text-[var(--mv-text-secondary)] uppercase">
                  {curr}
                </span>
              </div>
            );
          })}

          {fxData.stale && (
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30"
              title="Using previous successful rate snapshot due to upstream service delay"
            >
              Cached
            </span>
          )}
        </div>
      )}

      {/* Attribution & Provenance Meta (Response-driven provider & published date; strict HTTPS host check) */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--mv-text-muted)]">
        <span>Rates as of {formatRatePublishedDate(fxData.publishedDate)}</span>
        <span>•</span>
        {isSafeProviderUrl(fxData.providerUrl) ? (
          <a
            href={fxData.providerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 hover:text-[var(--mv-primary)] underline decoration-dotted transition-colors"
          >
            <span>{fxData.attributionText || 'Rates by Exchange Rate API'}</span>
            <ExternalLink size={9} />
          </a>
        ) : (
          <span>{fxData.attributionText || 'Rates by Exchange Rate API'}</span>
        )}
      </div>
    </div>
  );
};
