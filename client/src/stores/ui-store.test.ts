import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "./ui-store";

describe("useUIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      selectedNodeId: null,
      sidePanelOpen: false,
      sidePanelScrollTarget: null,
      activeTagFilters: new Set<string>(),
      inlineEditNodeId: null,
      contextMenuState: null,
    });
  });

  it("starts with default state", () => {
    const state = useUIStore.getState();
    expect(state.selectedNodeId).toBeNull();
    expect(state.sidePanelOpen).toBe(false);
    expect(state.sidePanelScrollTarget).toBeNull();
    expect(state.activeTagFilters.size).toBe(0);
    expect(state.inlineEditNodeId).toBeNull();
    expect(state.contextMenuState).toBeNull();
  });

  it("selectNode sets selectedNodeId and opens side panel", () => {
    useUIStore.getState().selectNode("node-1");
    const state = useUIStore.getState();
    expect(state.selectedNodeId).toBe("node-1");
    expect(state.sidePanelOpen).toBe(true);
  });

  it("clearSelection resets selection and closes side panel", () => {
    useUIStore.getState().selectNode("node-1");
    useUIStore.getState().openSidePanel("attachments");
    useUIStore.getState().clearSelection();
    const state = useUIStore.getState();
    expect(state.selectedNodeId).toBeNull();
    expect(state.sidePanelOpen).toBe(false);
    expect(state.sidePanelScrollTarget).toBeNull();
  });

  it("openSidePanel sets scroll target", () => {
    useUIStore.getState().openSidePanel("attachments");
    const state = useUIStore.getState();
    expect(state.sidePanelOpen).toBe(true);
    expect(state.sidePanelScrollTarget).toBe("attachments");
  });

  it("openSidePanel without target sets scrollTarget to null", () => {
    useUIStore.getState().openSidePanel();
    const state = useUIStore.getState();
    expect(state.sidePanelOpen).toBe(true);
    expect(state.sidePanelScrollTarget).toBeNull();
  });

  it("closeSidePanel resets panel state", () => {
    useUIStore.getState().openSidePanel("attachments");
    useUIStore.getState().closeSidePanel();
    const state = useUIStore.getState();
    expect(state.sidePanelOpen).toBe(false);
    expect(state.sidePanelScrollTarget).toBeNull();
  });

  it("toggleTagFilter adds and removes tags", () => {
    useUIStore.getState().toggleTagFilter("tag-1");
    expect(useUIStore.getState().activeTagFilters.has("tag-1")).toBe(true);

    useUIStore.getState().toggleTagFilter("tag-2");
    expect(useUIStore.getState().activeTagFilters.has("tag-1")).toBe(true);
    expect(useUIStore.getState().activeTagFilters.has("tag-2")).toBe(true);

    useUIStore.getState().toggleTagFilter("tag-1");
    expect(useUIStore.getState().activeTagFilters.has("tag-1")).toBe(false);
    expect(useUIStore.getState().activeTagFilters.has("tag-2")).toBe(true);
  });

  it("setActiveTagFilters replaces the entire set", () => {
    useUIStore.getState().toggleTagFilter("tag-1");
    useUIStore.getState().setActiveTagFilters(new Set(["tag-3", "tag-4"]));
    const filters = useUIStore.getState().activeTagFilters;
    expect(filters.has("tag-1")).toBe(false);
    expect(filters.has("tag-3")).toBe(true);
    expect(filters.has("tag-4")).toBe(true);
  });

  it("clearTagFilters empties the set", () => {
    useUIStore.getState().toggleTagFilter("tag-1");
    useUIStore.getState().toggleTagFilter("tag-2");
    useUIStore.getState().clearTagFilters();
    expect(useUIStore.getState().activeTagFilters.size).toBe(0);
  });

  it("setInlineEditNodeId updates the editing node", () => {
    useUIStore.getState().setInlineEditNodeId("node-5");
    expect(useUIStore.getState().inlineEditNodeId).toBe("node-5");

    useUIStore.getState().setInlineEditNodeId(null);
    expect(useUIStore.getState().inlineEditNodeId).toBeNull();
  });

  it("openContextMenu and closeContextMenu manage context menu state", () => {
    const menuState = { x: 100, y: 200, nodeId: "node-3" };
    useUIStore.getState().openContextMenu(menuState);
    expect(useUIStore.getState().contextMenuState).toEqual(menuState);

    useUIStore.getState().closeContextMenu();
    expect(useUIStore.getState().contextMenuState).toBeNull();
  });
});
