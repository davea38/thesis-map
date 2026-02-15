import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { appRouter } from "../router.js";

// Mock the db module
vi.mock("../db.js", () => {
  const mockDb = {
    $transaction: vi.fn(),
    map: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
    },
    node: {
      create: vi.fn(),
    },
  };
  return { db: mockDb };
});

// Import the mocked db after mocking
import { db } from "../db.js";
const mockDb = db as unknown as {
  $transaction: Mock;
  map: { findMany: Mock; findUnique: Mock; update: Mock; delete: Mock; create: Mock };
  node: { create: Mock };
};

describe("map router", () => {
  const caller = appRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("map.create", () => {
    it("creates a map and root node in a transaction", async () => {
      const mockMap = {
        id: "map-1",
        name: "Test Map",
        thesisStatement: "Testing is good",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockRootNode = {
        id: "node-1",
        mapId: "map-1",
        parentId: null,
        statement: "Testing is good",
        body: "",
        strength: null,
        polarity: null,
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.$transaction.mockImplementation(async (fn: any) => {
        const txClient = {
          map: { create: vi.fn().mockResolvedValue(mockMap) },
          node: { create: vi.fn().mockResolvedValue(mockRootNode) },
        };
        return fn(txClient);
      });

      const result = await caller.map.create({
        name: "Test Map",
        thesisStatement: "Testing is good",
      });

      expect(result.id).toBe("map-1");
      expect(result.name).toBe("Test Map");
      expect(result.thesisStatement).toBe("Testing is good");
      expect(result.rootNode.parentId).toBeNull();
      expect(result.rootNode.polarity).toBeNull();
      expect(result.rootNode.strength).toBeNull();
      expect(result.rootNode.statement).toBe("Testing is good");
      expect(mockDb.$transaction).toHaveBeenCalledOnce();
    });

    it("rejects empty name", async () => {
      await expect(
        caller.map.create({ name: "", thesisStatement: "Test" })
      ).rejects.toThrow();
    });

    it("rejects empty thesis statement", async () => {
      await expect(
        caller.map.create({ name: "Test", thesisStatement: "" })
      ).rejects.toThrow();
    });
  });

  describe("map.list", () => {
    it("returns maps sorted by updatedAt descending", async () => {
      const mockMaps = [
        {
          id: "map-2",
          name: "Newer Map",
          thesisStatement: "Thesis 2",
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
        },
        {
          id: "map-1",
          name: "Older Map",
          thesisStatement: "Thesis 1",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ];

      mockDb.map.findMany.mockResolvedValue(mockMaps);

      const result = await caller.map.list();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Newer Map");
      expect(mockDb.map.findMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          thesisStatement: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });
  });

  describe("map.getById", () => {
    it("returns map with nodes, tags, and aggregation", async () => {
      const mockMap = {
        id: "map-1",
        name: "Test Map",
        thesisStatement: "Root statement",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [{ id: "tag-1", mapId: "map-1", name: "Important", color: "#ff0000" }],
        nodes: [
          {
            id: "root",
            mapId: "map-1",
            parentId: null,
            statement: "Root statement",
            body: "",
            strength: null,
            polarity: null,
            orderIndex: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            nodeTags: [],
            attachments: [],
          },
          {
            id: "child-1",
            mapId: "map-1",
            parentId: "root",
            statement: "Tailwind argument",
            body: "",
            strength: 80,
            polarity: "tailwind",
            orderIndex: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            nodeTags: [
              { nodeId: "child-1", tagId: "tag-1", tag: { id: "tag-1", mapId: "map-1", name: "Important", color: "#ff0000" } },
            ],
            attachments: [],
          },
          {
            id: "child-2",
            mapId: "map-1",
            parentId: "root",
            statement: "Headwind argument",
            body: "",
            strength: 60,
            polarity: "headwind",
            orderIndex: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            nodeTags: [],
            attachments: [],
          },
        ],
      };

      mockDb.map.findUnique.mockResolvedValue(mockMap);

      const result = await caller.map.getById({ id: "map-1" });

      expect(result.id).toBe("map-1");
      expect(result.nodes).toHaveLength(3);

      // Root node should have aggregation from children
      const rootNode = result.nodes.find((n) => n.id === "root")!;
      expect(rootNode.aggregation).not.toBeNull();
      expect(rootNode.aggregation!.tailwindTotal).toBe(80);
      expect(rootNode.aggregation!.headwindTotal).toBe(60);
      expect(rootNode.aggregation!.balanceRatio).toBeCloseTo(80 / 140);

      // Child with tag should have tags array
      const child1 = result.nodes.find((n) => n.id === "child-1")!;
      expect(child1.tags).toHaveLength(1);
      expect(child1.tags[0].name).toBe("Important");

      // Leaf nodes should have null aggregation
      expect(child1.aggregation).toBeNull();
    });

    it("throws when map is not found", async () => {
      mockDb.map.findUnique.mockResolvedValue(null);

      await expect(
        caller.map.getById({ id: "nonexistent" })
      ).rejects.toThrow("Map not found");
    });

    it("returns null aggregation when all children are neutral", async () => {
      const mockMap = {
        id: "map-1",
        name: "Test",
        thesisStatement: "Root",
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        nodes: [
          {
            id: "root",
            mapId: "map-1",
            parentId: null,
            statement: "Root",
            body: "",
            strength: null,
            polarity: null,
            orderIndex: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            nodeTags: [],
            attachments: [],
          },
          {
            id: "child-1",
            mapId: "map-1",
            parentId: "root",
            statement: "Neutral child",
            body: "",
            strength: 50,
            polarity: "neutral",
            orderIndex: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            nodeTags: [],
            attachments: [],
          },
        ],
      };

      mockDb.map.findUnique.mockResolvedValue(mockMap);

      const result = await caller.map.getById({ id: "map-1" });
      const rootNode = result.nodes.find((n) => n.id === "root")!;
      expect(rootNode.aggregation).toBeNull();
    });
  });

  describe("map.update", () => {
    it("updates the map name", async () => {
      const updatedMap = {
        id: "map-1",
        name: "Updated Name",
        thesisStatement: "Original thesis",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.map.update.mockResolvedValue(updatedMap);

      const result = await caller.map.update({
        id: "map-1",
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { name: "Updated Name" },
      });
    });

    it("rejects empty name", async () => {
      await expect(
        caller.map.update({ id: "map-1", name: "" })
      ).rejects.toThrow();
    });
  });

  describe("map.delete", () => {
    it("deletes the map and returns success", async () => {
      mockDb.map.delete.mockResolvedValue({
        id: "map-1",
        name: "Deleted",
        thesisStatement: "Gone",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await caller.map.delete({ id: "map-1" });

      expect(result.success).toBe(true);
      expect(mockDb.map.delete).toHaveBeenCalledWith({
        where: { id: "map-1" },
      });
    });
  });
});
