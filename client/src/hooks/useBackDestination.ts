import { useLocation } from 'react-router-dom';

interface FromLocationLike {
  pathname?: string;
  search?: string;
}

export function useBackDestination(defaultPath: string) {
  const location = useLocation();
  const from = (location.state as any)?.from as FromLocationLike | undefined;
  const href = from && from.pathname ? `${from.pathname}${from.search ?? ''}` : defaultPath;
  return { href, from } as const;
}


