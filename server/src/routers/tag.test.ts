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
    tag: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    nodeTag: {
      create: vi.fn(),
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
  tag: { create: Mock; findUnique: Mock; findMany: Mock; update: Mock; delete: Mock };
  nodeTag: { create: Mock; delete: Mock };
};

describe("tag router", () => {
  const caller = appRouter.createCaller({});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tag.create", () => {
    it("creates a tag with valid inputs", async () => {
      const mockTag = {
        id: "tag-1",
        mapId: "map-1",
        name: "Evidence",
        color: "#3b82f6",
      };

      mockDb.map.findUnique.mockResolvedValue({ id: "map-1" } as any);
      mockDb.tag.findUnique.mockResolvedValue(null); // no duplicate
      mockDb.tag.create.mockResolvedValue(mockTag as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.tag.create({
        mapId: "map-1",
        name: "Evidence",
        color: "#3b82f6",
      });

      expect(result.id).toBe("tag-1");
      expect(result.name).toBe("Evidence");
      expect(result.color).toBe("#3b82f6");
      expect(mockDb.tag.create).toHaveBeenCalledWith({
        data: {
          mapId: "map-1",
          name: "Evidence",
          color: "#3b82f6",
        },
      });
    });

    it("rejects empty tag name", async () => {
      await expect(
        caller.tag.create({ mapId: "map-1", name: "", color: "#3b82f6" })
      ).rejects.toThrow();
    });

    it("rejects color not in the preset palette", async () => {
      await expect(
        caller.tag.create({ mapId: "map-1", name: "Test", color: "#000000" })
      ).rejects.toThrow();
    });

    it("throws when map not found", async () => {
      mockDb.map.findUnique.mockResolvedValue(null);

      await expect(
        caller.tag.create({ mapId: "nonexistent", name: "Test", color: "#3b82f6" })
      ).rejects.toThrow("Map not found");
    });

    it("rejects duplicate tag name within the same map", async () => {
      mockDb.map.findUnique.mockResolvedValue({ id: "map-1" } as any);
      mockDb.tag.findUnique.mockResolvedValue({ id: "existing-tag" } as any);

      await expect(
        caller.tag.create({ mapId: "map-1", name: "Duplicate", color: "#3b82f6" })
      ).rejects.toThrow("A tag with this name already exists in this map");
    });

    it("bumps map updatedAt after creation", async () => {
      mockDb.map.findUnique.mockResolvedValue({ id: "map-1" } as any);
      mockDb.tag.findUnique.mockResolvedValue(null);
      mockDb.tag.create.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
        name: "Test",
        color: "#3b82f6",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.tag.create({ mapId: "map-1", name: "Test", color: "#3b82f6" });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });

  describe("tag.list", () => {
    it("returns tags with node counts for a map", async () => {
      const mockTags = [
        {
          id: "tag-1",
          mapId: "map-1",
          name: "Evidence",
          color: "#3b82f6",
          _count: { nodeTags: 3 },
        },
        {
          id: "tag-2",
          mapId: "map-1",
          name: "Risk",
          color: "#ef4444",
          _count: { nodeTags: 0 },
        },
      ];

      mockDb.tag.findMany.mockResolvedValue(mockTags as any);

      const result = await caller.tag.list({ mapId: "map-1" });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Evidence");
      expect(result[0].nodeCount).toBe(3);
      expect(result[1].name).toBe("Risk");
      expect(result[1].nodeCount).toBe(0);

      expect(mockDb.tag.findMany).toHaveBeenCalledWith({
        where: { mapId: "map-1" },
        include: {
          _count: {
            select: { nodeTags: true },
          },
        },
        orderBy: { name: "asc" },
      });
    });

    it("returns empty array for map with no tags", async () => {
      mockDb.tag.findMany.mockResolvedValue([]);

      const result = await caller.tag.list({ mapId: "map-1" });

      expect(result).toHaveLength(0);
    });
  });

  describe("tag.update", () => {
    it("updates tag name", async () => {
      mockDb.tag.findUnique
        .mockResolvedValueOnce({ id: "tag-1", mapId: "map-1", name: "Old Name" } as any) // existing tag
        .mockResolvedValueOnce(null); // no duplicate

      mockDb.tag.update.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
        name: "New Name",
        color: "#3b82f6",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.tag.update({
        id: "tag-1",
        name: "New Name",
      });

      expect(result.name).toBe("New Name");
      expect(mockDb.tag.update).toHaveBeenCalledWith({
        where: { id: "tag-1" },
        data: { name: "New Name" },
      });
    });

    it("updates tag color", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
        name: "Test",
      } as any);

      mockDb.tag.update.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
        name: "Test",
        color: "#ef4444",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.tag.update({
        id: "tag-1",
        color: "#ef4444",
      });

      expect(result.color).toBe("#ef4444");
      expect(mockDb.tag.update).toHaveBeenCalledWith({
        where: { id: "tag-1" },
        data: { color: "#ef4444" },
      });
    });

    it("rejects empty tag name", async () => {
      await expect(
        caller.tag.update({ id: "tag-1", name: "" })
      ).rejects.toThrow();
    });

    it("rejects color not in the preset palette", async () => {
      await expect(
        caller.tag.update({ id: "tag-1", color: "#000000" })
      ).rejects.toThrow();
    });

    it("throws when tag not found", async () => {
      mockDb.tag.findUnique.mockResolvedValue(null);

      await expect(
        caller.tag.update({ id: "nonexistent", name: "Test" })
      ).rejects.toThrow("Tag not found");
    });

    it("rejects duplicate name within the same map", async () => {
      mockDb.tag.findUnique
        .mockResolvedValueOnce({ id: "tag-1", mapId: "map-1", name: "Original" } as any)
        .mockResolvedValueOnce({ id: "tag-2" } as any); // duplicate found

      await expect(
        caller.tag.update({ id: "tag-1", name: "Duplicate" })
      ).rejects.toThrow("A tag with this name already exists in this map");
    });

    it("allows updating to the same name (no-op rename)", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
        name: "Same Name",
      } as any);

      mockDb.tag.update.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
        name: "Same Name",
        color: "#3b82f6",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.tag.update({
        id: "tag-1",
        name: "Same Name",
      });

      expect(result.name).toBe("Same Name");
      // Should not check for duplicates when name hasn't changed
    });

    it("bumps map updatedAt after update", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
        name: "Test",
      } as any);
      mockDb.tag.update.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
        name: "Test",
        color: "#ef4444",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.tag.update({ id: "tag-1", color: "#ef4444" });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });

  describe("tag.delete", () => {
    it("deletes a tag and returns success", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
      } as any);
      mockDb.tag.delete.mockResolvedValue({} as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.tag.delete({ id: "tag-1" });

      expect(result.success).toBe(true);
      expect(mockDb.tag.delete).toHaveBeenCalledWith({
        where: { id: "tag-1" },
      });
    });

    it("throws when tag not found", async () => {
      mockDb.tag.findUnique.mockResolvedValue(null);

      await expect(
        caller.tag.delete({ id: "nonexistent" })
      ).rejects.toThrow("Tag not found");
    });

    it("bumps map updatedAt after deletion", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
      } as any);
      mockDb.tag.delete.mockResolvedValue({} as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.tag.delete({ id: "tag-1" });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });

  describe("tag.addToNode", () => {
    it("adds a tag to a node in the same map", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
      } as any);
      mockDb.node.findUnique.mockResolvedValue({
        id: "node-1",
        mapId: "map-1",
      } as any);
      mockDb.nodeTag.create.mockResolvedValue({
        tagId: "tag-1",
        nodeId: "node-1",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.tag.addToNode({
        tagId: "tag-1",
        nodeId: "node-1",
      });

      expect(result.tagId).toBe("tag-1");
      expect(result.nodeId).toBe("node-1");
      expect(mockDb.nodeTag.create).toHaveBeenCalledWith({
        data: {
          tagId: "tag-1",
          nodeId: "node-1",
        },
      });
    });

    it("throws when tag not found", async () => {
      mockDb.tag.findUnique.mockResolvedValue(null);
      mockDb.node.findUnique.mockResolvedValue({
        id: "node-1",
        mapId: "map-1",
      } as any);

      await expect(
        caller.tag.addToNode({ tagId: "nonexistent", nodeId: "node-1" })
      ).rejects.toThrow("Tag not found");
    });

    it("throws when node not found", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
      } as any);
      mockDb.node.findUnique.mockResolvedValue(null);

      await expect(
        caller.tag.addToNode({ tagId: "tag-1", nodeId: "nonexistent" })
      ).rejects.toThrow("Node not found");
    });

    it("rejects when tag and node belong to different maps", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
      } as any);
      mockDb.node.findUnique.mockResolvedValue({
        id: "node-1",
        mapId: "map-2",
      } as any);

      await expect(
        caller.tag.addToNode({ tagId: "tag-1", nodeId: "node-1" })
      ).rejects.toThrow("Tag and node must belong to the same map");
    });

    it("bumps map updatedAt after adding tag to node", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
      } as any);
      mockDb.node.findUnique.mockResolvedValue({
        id: "node-1",
        mapId: "map-1",
      } as any);
      mockDb.nodeTag.create.mockResolvedValue({
        tagId: "tag-1",
        nodeId: "node-1",
      } as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.tag.addToNode({ tagId: "tag-1", nodeId: "node-1" });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });

  describe("tag.removeFromNode", () => {
    it("removes a tag from a node", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
      } as any);
      mockDb.nodeTag.delete.mockResolvedValue({} as any);
      mockDb.map.update.mockResolvedValue({} as any);

      const result = await caller.tag.removeFromNode({
        tagId: "tag-1",
        nodeId: "node-1",
      });

      expect(result.success).toBe(true);
      expect(mockDb.nodeTag.delete).toHaveBeenCalledWith({
        where: {
          nodeId_tagId: {
            nodeId: "node-1",
            tagId: "tag-1",
          },
        },
      });
    });

    it("throws when tag not found", async () => {
      mockDb.tag.findUnique.mockResolvedValue(null);

      await expect(
        caller.tag.removeFromNode({ tagId: "nonexistent", nodeId: "node-1" })
      ).rejects.toThrow("Tag not found");
    });

    it("bumps map updatedAt after removing tag from node", async () => {
      mockDb.tag.findUnique.mockResolvedValue({
        id: "tag-1",
        mapId: "map-1",
      } as any);
      mockDb.nodeTag.delete.mockResolvedValue({} as any);
      mockDb.map.update.mockResolvedValue({} as any);

      await caller.tag.removeFromNode({ tagId: "tag-1", nodeId: "node-1" });

      expect(mockDb.map.update).toHaveBeenCalledWith({
        where: { id: "map-1" },
        data: { updatedAt: expect.any(Date) },
      });
    });
  });
});
