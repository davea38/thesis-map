import { create } from "zustand";

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

interface UIState {
  selectedNodeId: string | null;
  sidePanelOpen: boolean;
  sidePanelScrollTarget: string | null;
  activeTagFilters: Set<string>;
  inlineEditNodeId: string | null;
  contextMenuState: ContextMenuState | null;

  selectNode: (nodeId: string) => void;
  clearSelection: () => void;
  openSidePanel: (scrollTarget?: string) => void;
  closeSidePanel: () => void;
  setActiveTagFilters: (tagIds: Set<string>) => void;
  toggleTagFilter: (tagId: string) => void;
  clearTagFilters: () => void;
  setInlineEditNodeId: (nodeId: string | null) => void;
  openContextMenu: (state: ContextMenuState) => void;
  closeContextMenu: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedNodeId: null,
  sidePanelOpen: false,
  sidePanelScrollTarget: null,
  activeTagFilters: new Set<string>(),
  inlineEditNodeId: null,
  contextMenuState: null,

  selectNode: (nodeId) =>
    set({ selectedNodeId: nodeId, sidePanelOpen: true }),

  clearSelection: () =>
    set({
      selectedNodeId: null,
      sidePanelOpen: false,
      sidePanelScrollTarget: null,
    }),

  openSidePanel: (scrollTarget) =>
    set({ sidePanelOpen: true, sidePanelScrollTarget: scrollTarget ?? null }),

  closeSidePanel: () =>
    set({ sidePanelOpen: false, sidePanelScrollTarget: null }),

  setActiveTagFilters: (tagIds) => set({ activeTagFilters: tagIds }),

  toggleTagFilter: (tagId) =>
    set((state) => {
      const next = new Set(state.activeTagFilters);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return { activeTagFilters: next };
    }),

  clearTagFilters: () => set({ activeTagFilters: new Set<string>() }),

  setInlineEditNodeId: (nodeId) => set({ inlineEditNodeId: nodeId }),

  openContextMenu: (state) => set({ contextMenuState: state }),

  closeContextMenu: () => set({ contextMenuState: null }),
}));
