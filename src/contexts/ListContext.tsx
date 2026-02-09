import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface ListCreator {
  id: string;
  name: string;
  username?: string;
  avatar: string;
  followers: number;
  engagementRate: number;
  platforms: string[];
  bio: string;
  location?: string;
}

export interface List {
  id: string;
  name: string;
  creators: ListCreator[];
}

const DEMO_LIST_ID = "demo-campaign";

const defaultLists: List[] = [
  { id: DEMO_LIST_ID, name: "Demo Campaign", creators: [] },
];

type ListContextValue = {
  lists: List[];
  addCreatorToList: (listId: string, creator: ListCreator) => void;
  removeCreatorFromList: (listId: string, creatorId: string) => void;
  createList: (name: string) => string;
  isCreatorInList: (creatorId: string, listId?: string) => boolean;
};

const ListContext = createContext<ListContextValue | null>(null);

export function ListProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<List[]>(() => {
    try {
      const raw = localStorage.getItem("parade-deck-lists");
      if (raw) {
        const parsed = JSON.parse(raw) as List[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return defaultLists;
  });

  const addCreatorToList = useCallback(
    (listId: string, creator: ListCreator) => {
      setLists((prev) => {
        const list = prev.find((l) => l.id === listId);
        if (!list) return prev;
        if (list.creators.some((c) => c.id === creator.id)) return prev;
        const next = prev.map((l) =>
          l.id === listId
            ? { ...l, creators: [...l.creators, creator] }
            : l
        );
        try {
          localStorage.setItem("parade-deck-lists", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    []
  );

  const removeCreatorFromList = useCallback((listId: string, creatorId: string) => {
    setLists((prev) => {
      const next = prev.map((l) =>
        l.id === listId
          ? { ...l, creators: l.creators.filter((c) => c.id !== creatorId) }
          : l
      );
      try {
        localStorage.setItem("parade-deck-lists", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const createList = useCallback(
    (name: string): string => {
      const id = `list-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newList: List = { id, name, creators: [] };
      setLists((prev) => {
        const next = [...prev, newList];
        try {
          localStorage.setItem("parade-deck-lists", JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
      return id;
    },
    []
  );

  const isCreatorInList = useCallback(
    (creatorId: string, listId?: string): boolean => {
      if (listId) {
        const list = lists.find((l) => l.id === listId);
        return list ? list.creators.some((c) => c.id === creatorId) : false;
      }
      return lists.some((l) => l.creators.some((c) => c.id === creatorId));
    },
    [lists]
  );

  const value = useMemo(
    () => ({
      lists,
      addCreatorToList,
      removeCreatorFromList,
      createList,
      isCreatorInList,
    }),
    [lists, addCreatorToList, removeCreatorFromList, createList, isCreatorInList]
  );

  return (
    <ListContext.Provider value={value}>{children}</ListContext.Provider>
  );
}

export function useLists() {
  const ctx = useContext(ListContext);
  if (!ctx) {
    throw new Error("useLists must be used within ListProvider");
  }
  return ctx;
}
