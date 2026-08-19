import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { DEFAULT_REPORT_FILTERS } from '../components/reports/reportUtils';

const KEYS = [
  'range',
  'from',
  'to',
  'whatsappAccountId',
  'campaignId',
  'templateId',
  'status',
  'campaignStatus',
  'search',
  'page',
  'limit',
  'groupBy',
];

function readParams(searchParams) {
  const next = { ...DEFAULT_REPORT_FILTERS };
  KEYS.forEach((key) => {
    const value = searchParams.get(key);
    if (value != null && value !== '') next[key] = key === 'page' || key === 'limit' ? Number(value) : value;
  });
  next.page = Math.max(1, Number(next.page) || 1);
  next.limit = Number(next.limit) || 25;
  return next;
}

function toSearchParams(filters) {
  const params = new URLSearchParams();
  KEYS.forEach((key) => {
    const value = filters[key];
    const fallback = DEFAULT_REPORT_FILTERS[key];
    if (value === undefined || value === null || value === '' || value === fallback) return;
    params.set(key, String(value));
  });
  return params;
}

export function useReportFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const qs = searchParams.toString();
  const applied = useMemo(() => readParams(new URLSearchParams(qs)), [qs]);
  const [draft, setDraft] = useState(applied);

  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  const apply = useCallback(
    (overrides = {}) => {
      const next = {
        ...draft,
        ...overrides,
        page: overrides.page ?? 1,
      };
      if (next.range !== 'custom') {
        next.from = '';
        next.to = '';
      }
      setSearchParams(toSearchParams(next), { replace: true });
    },
    [draft, setSearchParams]
  );

  const setPage = useCallback(
    (page, limit) => {
      setSearchParams(
        toSearchParams({
          ...applied,
          page,
          limit: limit || applied.limit,
        }),
        { replace: true }
      );
    },
    [applied, setSearchParams]
  );

  const reset = useCallback(() => {
    const next = { ...DEFAULT_REPORT_FILTERS };
    setDraft(next);
    setSearchParams(toSearchParams(next), { replace: true });
  }, [setSearchParams]);

  return { applied, draft, setDraft, apply, reset, setPage };
}
