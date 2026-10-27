// A small, read-only protocol probe. No AI provider credentials are needed.
export async function probeMcp(endpoint: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let nextId = 1;
  let protocol = "2025-11-25";
  async function rpc(
    method: string,
    params: unknown,
    notification = false,
  ): Promise<any> {
    const id = notification ? undefined : nextId++;
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "MCP-Protocol-Version": protocol,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        ...(id === undefined ? {} : { id }),
        method,
        params,
      }),
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (notification) return;
    const messages = response.headers
      .get("content-type")
      ?.includes("text/event-stream")
      ? raw.split(/\r?\n\r?\n/).flatMap((event) => {
          const data = event
            .split(/\r?\n/)
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          return data ? [JSON.parse(data)] : [];
        })
      : [JSON.parse(raw)];
    const message = messages.find((item) => item.id === id);
    if (!message || message.error)
      throw new Error(message?.error?.message || "Invalid MCP response");
    return message.result;
  }
  try {
    const init = await rpc("initialize", {
      protocolVersion: protocol,
      capabilities: {},
      clientInfo: { name: "elan-connection-check", version: "0.1.0" },
    });
    protocol = init.protocolVersion;
    await rpc("notifications/initialized", {}, true);
    const list = await rpc("tools/list", {});
    const status = await rpc("tools/call", {
      name: "elan_status",
      arguments: {},
    });
    const value =
      status.structuredContent ||
      JSON.parse(status.content.find((c: any) => c.type === "text").text);
    return {
      protocol,
      toolCount: list.tools.length as number,
      databaseReady: value.ready === true,
      code: value.error?.code || value.code,
    };
  } finally {
    clearTimeout(timer);
  }
}
