import { describe, expect, it, vi } from "vitest";

import { submitFrozenMockInterviewReport } from "./report-submission-client";

describe("submitFrozenMockInterviewReport", () => {
  it("does not send a report when the frozen session loses its storage revision", async () => {
    const sendReport = vi.fn<() => Promise<Response>>();

    const result = await submitFrozenMockInterviewReport({
      lockName: "mock-report:test",
      persistFrozenSession: () => false,
      sendReport,
    });

    expect(result).toEqual({ kind: "storage_conflict" });
    expect(sendReport).not.toHaveBeenCalled();
  });

  it("sends only after the frozen session is durable", async () => {
    const response = new Response(null, { status: 200 });
    const order: string[] = [];
    const sendReport = vi.fn(async () => {
      order.push("send");
      return response;
    });

    const result = await submitFrozenMockInterviewReport({
      lockName: "mock-report:test",
      persistFrozenSession: async () => {
        await Promise.resolve();
        order.push("persist");
        return true;
      },
      sendReport,
    });

    expect(order).toEqual(["persist", "send"]);
    expect(sendReport).toHaveBeenCalledOnce();
    expect(result).toEqual({ kind: "submitted", response });
  });

  it("serializes cross-tab persistence so only one stale revision is submitted", async () => {
    let revision = 0;
    let queue = Promise.resolve();
    const runExclusive = <T>(
      _name: string,
      operation: () => T | Promise<T>,
    ) => {
      const result = queue.then(operation);
      queue = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    };
    const sendReport = vi.fn(async () => new Response(null, { status: 200 }));
    const stalePersist = () => {
      if (revision !== 0) return false;
      revision += 1;
      return true;
    };

    const results = await Promise.all([
      submitFrozenMockInterviewReport({
        lockName: "mock-report:shared-session",
        persistFrozenSession: stalePersist,
        runExclusive,
        sendReport,
      }),
      submitFrozenMockInterviewReport({
        lockName: "mock-report:shared-session",
        persistFrozenSession: stalePersist,
        runExclusive,
        sendReport,
      }),
    ]);

    expect(results.map((result) => result.kind).sort()).toEqual([
      "storage_conflict",
      "submitted",
    ]);
    expect(sendReport).toHaveBeenCalledOnce();
  });
});
