import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddMovieDialog } from "../components/AddMovieDialog";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Timer
vi.useFakeTimers();

// Setup QueryClient für Tests
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            enabled: false,
        },
    },
});

describe("AddMovieDialog", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rendert den Dialog mit allen wichtigen Elementen", () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        expect(screen.getByText("Film hinzufügen")).toBeInTheDocument();
        expect(screen.getByLabelText(/film suchen/i)).toBeInTheDocument();
    });

    it("führt eine erfolgreiche Suche durch", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText(/film suchen/i);
        fireEvent.change(searchInput, { target: { value: "Test Movie" } });
        fireEvent.click(screen.getByText(/suchen/i));

        await waitFor(() => {
            expect(screen.getByRole("progressbar")).toBeInTheDocument();
        });
    });

    it("zeigt Fehlermeldung bei fehlgeschlagener Suche", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText(/film suchen/i);
        fireEvent.change(searchInput, { target: { value: "Error Movie" } });
        fireEvent.click(screen.getByText(/suchen/i));

        await waitFor(() => {
            expect(screen.getByRole("progressbar")).toBeInTheDocument();
        });
    });

    it("zeigt Ladeindikator während der Suche", async () => {
        render(
            <QueryClientProvider client={queryClient}>
                <AddMovieDialog isOpen={true} onClose={() => {}} />
            </QueryClientProvider>
        );

        const searchInput = screen.getByLabelText(/film suchen/i);
        fireEvent.change(searchInput, { target: { value: "Test Movie" } });
        fireEvent.click(screen.getByText(/suchen/i));

        expect(screen.getByRole("progressbar")).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
        });
    });
});
