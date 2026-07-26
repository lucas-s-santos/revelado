import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A regra mais importante da Fase 1 (SPEC 6.4): **um** listener de scroll para
 * a aplicação inteira, não importa quantos componentes assinem. Este teste
 * existe para que a regra não dependa de alguém lembrar de abrir o DevTools.
 *
 * Sem jsdom: o driver só toca em window/document/rAF, então stubs bastam.
 */

interface Listener {
  type: string;
  handler: EventListener;
}

function stubEnvironment() {
  const added: Listener[] = [];
  const removed: Listener[] = [];

  const fakeWindow = {
    scrollY: 0,
    innerHeight: 800,
    addEventListener: (type: string, handler: EventListener) => {
      added.push({ type, handler });
    },
    removeEventListener: (type: string, handler: EventListener) => {
      removed.push({ type, handler });
    },
  };

  const properties = new Map<string, string>();

  const fakeDocument = {
    documentElement: {
      scrollHeight: 2400,
      style: {
        setProperty: (name: string, value: string) => {
          properties.set(name, value);
        },
      },
    },
  };

  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal("document", fakeDocument);
  // rAF síncrono: o teste não precisa esperar frame.
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});

  return { added, removed, properties, fakeWindow };
}

describe("scroll driver", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it("registra um único listener de scroll para vários assinantes", async () => {
    const { added } = stubEnvironment();
    const { subscribeScroll, getScrollDriverStats } =
      await import("@/hooks/use-scroll-driver");

    const unsubscribes = [
      subscribeScroll(() => {}),
      subscribeScroll(() => {}),
      subscribeScroll(() => {}),
    ];

    expect(added.filter((l) => l.type === "scroll")).toHaveLength(1);
    expect(getScrollDriverStats()).toEqual({ subscribers: 3, listeners: 1 });

    for (const unsubscribe of unsubscribes) unsubscribe();
  });

  it("solta o listener quando o último assinante sai", async () => {
    const { added, removed } = stubEnvironment();
    const { subscribeScroll, getScrollDriverStats } =
      await import("@/hooks/use-scroll-driver");

    const a = subscribeScroll(() => {});
    const b = subscribeScroll(() => {});

    a();
    expect(removed).toHaveLength(0); // ainda tem gente ouvindo

    b();
    expect(removed.filter((l) => l.type === "scroll")).toHaveLength(1);
    expect(getScrollDriverStats()).toEqual({ subscribers: 0, listeners: 0 });
    expect(added.filter((l) => l.type === "scroll")).toHaveLength(1);
  });

  it("entrega o estado atual na assinatura e escreve --scroll no :root", async () => {
    const { properties, fakeWindow } = stubEnvironment();
    fakeWindow.scrollY = 800; // 2400 de conteúdo - 800 de viewport = 1600 roláveis

    const { subscribeScroll } = await import("@/hooks/use-scroll-driver");

    const seen: number[] = [];
    const unsubscribe = subscribeScroll(({ progress }) => {
      seen.push(progress);
    });

    expect(seen[0]).toBeCloseTo(0.5, 4);
    expect(properties.get("--scroll")).toBe("0.5000");

    unsubscribe();
  });
});
