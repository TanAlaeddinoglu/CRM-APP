import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import LoadingIndicator from "../components/common/LoadingIndicator.jsx";

const PageTransitionContext = createContext(null);
const ROUTE_FALLBACK_MS = 900;
let loaderSequence = 0;

export function PageTransitionProvider({ children }) {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}${location.hash}`;
  const [routeEpoch, setRouteEpoch] = useState(0);
  const [routePending, setRoutePending] = useState(true);
  const [activeLoaders, setActiveLoaders] = useState(() => new Set());
  const fallbackTimerRef = useRef(null);

  useEffect(() => {
    setRouteEpoch((prev) => prev + 1);
    setRoutePending(true);

    window.clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = window.setTimeout(() => {
      setRoutePending(false);
    }, ROUTE_FALLBACK_MS);

    return () => {
      window.clearTimeout(fallbackTimerRef.current);
    };
  }, [routeKey]);

  const setLoaderState = useCallback((id, isLoading) => {
    setActiveLoaders((prev) => {
      const hasLoader = prev.has(id);
      if (hasLoader === isLoading) return prev;

      const next = new Set(prev);
      if (isLoading) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const settleRoute = useCallback((epoch) => {
    setRoutePending((current) => {
      if (!current || epoch !== routeEpoch) return current;
      window.clearTimeout(fallbackTimerRef.current);
      return false;
    });
  }, [routeEpoch]);

  const value = useMemo(
    () => ({
      routeEpoch,
      setLoaderState,
      settleRoute,
    }),
    [routeEpoch, setLoaderState, settleRoute]
  );

  const isVisible = routePending || activeLoaders.size > 0;

  return (
    <PageTransitionContext.Provider value={value}>
      {children}
      {isVisible ? (
        <div
          className="page-transition-indicator"
          data-testid="page-transition-indicator"
          aria-hidden="true"
        >
          <LoadingIndicator className="loading-indicator-compact" />
        </div>
      ) : null}
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition(isLoading) {
  const context = useContext(PageTransitionContext);
  if (!context) {
    throw new Error("usePageTransition must be used within PageTransitionProvider");
  }

  const { routeEpoch, setLoaderState, settleRoute } = context;
  const loaderIdRef = useRef(null);

  if (!loaderIdRef.current) {
    loaderIdRef.current = `page-transition-loader-${loaderSequence += 1}`;
  }

  useEffect(() => {
    settleRoute(routeEpoch);
  }, [routeEpoch, settleRoute]);

  useEffect(() => {
    setLoaderState(loaderIdRef.current, Boolean(isLoading));

    return () => {
      setLoaderState(loaderIdRef.current, false);
    };
  }, [isLoading, setLoaderState]);
}
