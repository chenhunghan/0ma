import { describe, expect, it } from "vitest";
import { insertLog } from "./insertLog";
import type { Log } from "src/types/Log";

describe("insertLog", () => {
  const makeLog = (ts: string, id: string): Log => ({
    id,
    message: `msg ${id}`,
    timestamp: ts,
  });

  it("should append eagerly if log is newer", () => {
    const logs = [makeLog("10", "1")];
    const newLog = makeLog("20", "2");
    const result = insertLog(logs, newLog);
    expect(result).toHaveLength(2);
    expect(result[1]).toBe(newLog);
    expect(result[0].id).toBe("1");
  });

  it("should insert in the middle", () => {
    const logs = [makeLog("10", "1"), makeLog("30", "3")];
    const newLog = makeLog("20", "2");
    const result = insertLog(logs, newLog);
    expect(result.map((l) => l.id)).toStrictEqual(["1", "2", "3"]);
  });

  it("should insert at start", () => {
    const logs = [makeLog("20", "2")];
    const newLog = makeLog("10", "1");
    const result = insertLog(logs, newLog);
    expect(result[0]).toBe(newLog);
    expect(result[1].id).toBe("2");
  });

  it("should handle equal timestamps by appending (stable-ish)", () => {
    const logs = [makeLog("10", "1")];
    const newLog = makeLog("10", "2");
    const result = insertLog(logs, newLog);
    expect(result.map((l) => l.id)).toStrictEqual(["1", "2"]);
  });

  it("should handle empty logs", () => {
    const logs: Log[] = [];
    const newLog = makeLog("10", "1");
    const result = insertLog(logs, newLog);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(newLog);
  });
});
