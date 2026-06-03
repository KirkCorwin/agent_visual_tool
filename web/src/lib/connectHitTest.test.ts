import { describe, expect, it } from "vitest";
import type { PlanningGraph } from "../graph/types";
import { pickConnectTargetFromIds } from "./connectHitTest";

describe("pickConnectTargetFromIds", () => {
  const graph: PlanningGraph = {
    schemaVersion: 1,
    meta: {
      id: "g1",
      name: "Test",
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z",
    },
    nodes: [
      {
        id: "folder-1",
        type: "folder",
        position: { x: 0, y: 0 },
        data: { title: "Folder", width: 400, height: 300 },
      },
      {
        id: "task-1",
        type: "task",
        position: { x: 40, y: 40 },
        folderId: "folder-1",
        data: { title: "Task" },
      },
    ],
    edges: [],
  };

  it("prefers a non-folder node when both are under the pointer", () => {
    expect(
      pickConnectTargetFromIds(["task-1", "folder-1"], graph, "source"),
    ).toBe("task-1");
  });

  it("returns folder when only the folder is under the pointer", () => {
    expect(pickConnectTargetFromIds(["folder-1"], graph, "source")).toBe(
      "folder-1",
    );
  });

  it("ignores the connect source id", () => {
    expect(pickConnectTargetFromIds(["task-1"], graph, "task-1")).toBeNull();
  });
});
