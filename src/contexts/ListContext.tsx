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
  avatar_url?: string;
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
  deleteList: (listId: string) => void;
  renameList: (listId: string, name: string) => void;
  updateListAvatar: (listId: string, avatarUrl: string) => void;
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
      const avatar_url = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}&backgroundColor=6d28d9,e5e5e5,7c3aed&shape1Color=ffffff`;
      const newList: List = { id, name, avatar_url, creators: [] };
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

  const deleteList = useCallback((listId: string) => {
    setLists((prev) => {
      const next = prev.filter((l) => l.id !== listId);
      try { localStorage.setItem("parade-deck-lists", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const renameList = useCallback((listId: string, name: string) => {
    setLists((prev) => {
      const next = prev.map((l) => l.id === listId ? { ...l, name } : l);
      try { localStorage.setItem("parade-deck-lists", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const updateListAvatar = useCallback((listId: string, avatarUrl: string) => {
    setLists((prev) => {
      const next = prev.map((l) => l.id === listId ? { ...l, avatar_url: avatarUrl } : l);
      try { localStorage.setItem("parade-deck-lists", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

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
      deleteList,
      renameList,
      updateListAvatar,
      isCreatorInList,
    }),
    [lists, addCreatorToList, removeCreatorFromList, createList, deleteList, renameList, updateListAvatar, isCreatorInList]
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
