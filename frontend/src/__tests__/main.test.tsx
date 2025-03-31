import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRoot } from "react-dom/client";
import { QueryClientProviderProps } from "@tanstack/react-query";
import { ReactElement } from "react";
import { StrictMode } from "react";

const mockRender = vi.fn();
const mockRoot = {
    render: mockRender,
};

const mockQueryClientProvider = vi.fn(({ client, children }: QueryClientProviderProps): ReactElement => {
    expect(client).toBeDefined();
    return children as ReactElement;
});

const mockQueryClient = vi.fn(() => ({
    mount: vi.fn(),
}));

vi.mock("react-dom/client", () => ({
    createRoot: vi.fn(() => mockRoot),
}));

vi.mock("../App", () => ({
    default: vi.fn(() => null),
}));

vi.mock("@tanstack/react-query", () => {
    const MockQueryClientProvider = (props: QueryClientProviderProps) => {
        mockQueryClientProvider(props);
        return props.children;
    };
    return {
        QueryClient: mockQueryClient,
        QueryClientProvider: MockQueryClientProvider,
    };
});

describe("main.tsx", () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="root"></div>';
        vi.clearAllMocks();
    });

    it("initialisiert die App korrekt", async () => {
        const root = document.getElementById("root");
        await import("../main");

        expect(createRoot).toHaveBeenCalledWith(root);
        expect(mockQueryClient).toHaveBeenCalled();
        expect(mockRender).toHaveBeenCalledWith(
            expect.objectContaining({
                type: StrictMode,
                props: expect.objectContaining({
                    children: expect.any(Object),
                }),
            })
        );
    });
});
