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
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { db: mockDb };
});

import { db } from "../db.js";
const mockDb = db as unknown as {
  $transaction: Mock;
  map: { findMany: Mock; findUnique: Mock; update: Mock; delete: Mock; create: Mock };
  node: { create: Mock; findUnique: Mock; findMany: Mock; update: Mock; delete: Mock };
};

describe("node router", () => {
  const caller = appRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("node.create", () => {
    it("creates a child node with defaults", async () => {
      const mockParent = { id: "parent-1", mapId: "map-1" };
      const mockNode = {
        id: "node-new",
        mapId: "map-1",
        parentId: "parent-1",
        statement: "",
        body: "",
        strength: 0,
        polarity: "neutral",
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.node.findUnique.mockResolvedValue(mockParent as any);
      mockDb.node.create.mockResolvedValue(mockNode as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.node.create({
        parentId: "parent-1",
        mapId: "map-1",
      });

      expect(result.id).toBe("node-new");
      expect(result.statement).toBe("");
      expect(result.polarity).toBe("neutral");
      expect(result.strength).toBe(0);
      expect(result.parentId).toBe("parent-1");

      expect(mockDb.node.create).toHaveBeenCalledWith({
        data: {
          mapId: "map-1",
          parentId: "parent-1",
          statement: "",
          polarity: "neutral",
          strength: 0,
        },
      });
    });

    it("rejects when parent node not found", async () => {
      mockDb.node.findUnique.mockResolvedValue(null);

      await expect(
        caller.node.create({ parentId: "nonexistent", mapId: "map-1" })
      ).rejects.toThrow("Parent node not found");
    });

    it("rejects when parent belongs to different map", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "parent-1",
        mapId: "map-other",
      } as any);

      await expect(
        caller.node.create({ parentId: "parent-1", mapId: "map-1" })
      ).rejects.toThrow("Parent node does not belong to the specified map");
    });

    it("bumps map updatedAt after creation", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "parent-1",
        mapId: "map-1",
      } as any);
      mockDb.node.create.mockResolvedValue({
        id: "node-new",
        mapId: "map-1",
        parentId: "parent-1",
        statement: "",
        body: "",
        strength: 0,
        polarity: "neutral",
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.node.create({ parentId: "parent-1", mapId: "map-1" });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });

  describe("node.getById", () => {
    it("returns node with children, tags, attachments, and aggregation", async () => {
      const mockNode = {
        id: "node-1",
        mapId: "map-1",
        parentId: "root",
        statement: "Test node",
        body: "Some body",
        strength: 50,
        polarity: "tailwind",
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodeTags: [
          {
            nodeId: "node-1",
            tagId: "tag-1",
            tag: { id: "tag-1", mapId: "map-1", name: "Evidence", color: "#00ff00" },
          },
        ],
        attachments: [],
        children: [
          {
            id: "child-1",
            mapId: "map-1",
            parentId: "node-1",
            statement: "Tailwind child",
            body: "",
            strength: 80,
            polarity: "tailwind",
            orderIndex: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            nodeTags: [],
            attachments: [],
          },
          {
            id: "child-2",
            mapId: "map-1",
            parentId: "node-1",
            statement: "Headwind child",
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

      mockDb.node.findUnique.mockResolvedValue(mockNode as any);

      const result = await caller.node.getById({ id: "node-1" });

      expect(result.id).toBe("node-1");
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].name).toBe("Evidence");
      expect(result.children).toHaveLength(2);
      expect(result.aggregation).not.toBeNull();
      expect(result.aggregation!.tailwindTotal).toBe(80);
      expect(result.aggregation!.headwindTotal).toBe(60);
      expect(result.aggregation!.balanceRatio).toBeCloseTo(80 / 140);
    });

    it("returns null aggregation for leaf node", async () => {
      const mockNode = {
        id: "leaf-1",
        mapId: "map-1",
        parentId: "root",
        statement: "Leaf",
        body: "",
        strength: 50,
        polarity: "tailwind",
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodeTags: [],
        attachments: [],
        children: [],
      };

      mockDb.node.findUnique.mockResolvedValue(mockNode as any);

      const result = await caller.node.getById({ id: "leaf-1" });
      expect(result.aggregation).toBeNull();
    });

    it("returns null aggregation when all children are neutral", async () => {
      const mockNode = {
        id: "node-1",
        mapId: "map-1",
        parentId: "root",
        statement: "Node",
        body: "",
        strength: 50,
        polarity: "tailwind",
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodeTags: [],
        attachments: [],
        children: [
          {
            id: "child-1",
            mapId: "map-1",
            parentId: "node-1",
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

      mockDb.node.findUnique.mockResolvedValue(mockNode as any);

      const result = await caller.node.getById({ id: "node-1" });
      expect(result.aggregation).toBeNull();
    });

    it("throws when node not found", async () => {
      mockDb.node.findUnique.mockResolvedValue(null);

      await expect(
        caller.node.getById({ id: "nonexistent" })
      ).rejects.toThrow("Node not found");
    });
  });

  describe("node.update", () => {
    it("updates statement on a non-root node", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "node-1",
        mapId: "map-1",
        parentId: "root",
      } as any);

      const updatedNode = {
        id: "node-1",
        mapId: "map-1",
        parentId: "root",
        statement: "Updated statement",
        body: "",
        strength: 50,
        polarity: "tailwind",
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.node.update.mockResolvedValue(updatedNode as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.node.update({
        id: "node-1",
        statement: "Updated statement",
      });

      expect(result.statement).toBe("Updated statement");
      expect(mockDb.node.update).toHaveBeenCalledWith({
        where: { id: "node-1" },
        data: { statement: "Updated statement" },
      });
    });

    it("updates strength and polarity on non-root node", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "node-1",
        mapId: "map-1",
        parentId: "root",
      } as any);

      mockDb.node.update.mockResolvedValue({
        id: "node-1",
        strength: 75,
        polarity: "headwind",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.node.update({
        id: "node-1",
        strength: 75,
        polarity: "headwind",
      });

      expect(result.strength).toBe(75);
      expect(result.polarity).toBe("headwind");
    });

    it("rejects strength update on root node", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "root",
        mapId: "map-1",
        parentId: null,
      } as any);

      await expect(
        caller.node.update({ id: "root", strength: 50 })
      ).rejects.toThrow("Cannot set strength on the root node");
    });

    it("rejects polarity update on root node", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "root",
        mapId: "map-1",
        parentId: null,
      } as any);

      await expect(
        caller.node.update({ id: "root", polarity: "tailwind" })
      ).rejects.toThrow("Cannot set polarity on the root node");
    });

    it("syncs root node statement with map thesis in a transaction", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "root",
        mapId: "map-1",
        parentId: null,
      } as any);

      const updatedNode = {
        id: "root",
        mapId: "map-1",
        parentId: null,
        statement: "New thesis",
        body: "",
        strength: null,
        polarity: null,
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDb.$transaction.mockImplementation(async (fn: any) => {
        const txClient = {
          node: { update: vi.fn().mockResolvedValue(updatedNode) },
          map: { update: vi.fn().mockResolvedValue({}) },
        };
        return fn(txClient);
      });

      const result = await caller.node.update({
        id: "root",
        statement: "New thesis",
      });

      expect(result.statement).toBe("New thesis");
      expect(mockDb.$transaction).toHaveBeenCalledOnce();
    });

    it("throws when node not found", async () => {
      mockDb.node.findUnique.mockResolvedValue(null);

      await expect(
        caller.node.update({ id: "nonexistent", statement: "Test" })
      ).rejects.toThrow("Node not found");
    });

    it("rejects strength outside 0-100 range", async () => {
      await expect(
        caller.node.update({ id: "node-1", strength: 101 })
      ).rejects.toThrow();

      await expect(
        caller.node.update({ id: "node-1", strength: -1 })
      ).rejects.toThrow();
    });

    it("rejects invalid polarity value", async () => {
      await expect(
        caller.node.update({ id: "node-1", polarity: "invalid" as any })
      ).rejects.toThrow();
    });
  });

  describe("node.delete", () => {
    it("returns pending status with descendant count when not confirmed", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "node-1",
        mapId: "map-1",
        parentId: "root",
      } as any);

      mockDb.node.findMany.mockResolvedValue([
        { id: "node-1", parentId: "root" },
        { id: "child-1", parentId: "node-1" },
        { id: "child-2", parentId: "node-1" },
        { id: "grandchild-1", parentId: "child-1" },
      ] as any);

      const result = await caller.node.delete({ id: "node-1" });

      expect(result.status).toBe("pending");
      expect(result.descendantCount).toBe(3); // child-1, child-2, grandchild-1
      expect(mockDb.node.delete).not.toHaveBeenCalled();
    });

    it("deletes node and returns deleted status when confirmed", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "node-1",
        mapId: "map-1",
        parentId: "root",
      } as any);

      mockDb.node.findMany.mockResolvedValue([
        { id: "node-1", parentId: "root" },
        { id: "child-1", parentId: "node-1" },
      ] as any);

      mockDb.node.delete.mockResolvedValue({} as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.node.delete({ id: "node-1", confirm: true });

      expect(result.status).toBe("deleted");
      expect(result.descendantCount).toBe(1);
      expect(mockDb.node.delete).toHaveBeenCalledWith({
        where: { id: "node-1" },
      });
    });

    it("deletes leaf node with 0 descendants when confirmed", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "leaf-1",
        mapId: "map-1",
        parentId: "root",
      } as any);

      mockDb.node.findMany.mockResolvedValue([
        { id: "root", parentId: null },
        { id: "leaf-1", parentId: "root" },
      ] as any);

      mockDb.node.delete.mockResolvedValue({} as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.node.delete({ id: "leaf-1", confirm: true });

      expect(result.status).toBe("deleted");
      expect(result.descendantCount).toBe(0);
    });

    it("rejects deletion of root node", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "root",
        mapId: "map-1",
        parentId: null,
      } as any);

      await expect(
        caller.node.delete({ id: "root", confirm: true })
      ).rejects.toThrow("Cannot delete the root node. Delete the map instead.");
    });

    it("throws when node not found", async () => {
      mockDb.node.findUnique.mockResolvedValue(null);

      await expect(
        caller.node.delete({ id: "nonexistent" })
      ).rejects.toThrow("Node not found");
    });

    it("bumps map updatedAt after confirmed deletion", async () => {
      mockDb.node.findUnique.mockResolvedValue({
        id: "node-1",
        mapId: "map-1",
        parentId: "root",
      } as any);

      mockDb.node.findMany.mockResolvedValue([
        { id: "node-1", parentId: "root" },
      ] as any);

      mockDb.node.delete.mockResolvedValue({} as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.node.delete({ id: "node-1", confirm: true });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });
});
