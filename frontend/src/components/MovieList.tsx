import { useState } from "react";
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Fab,
    Container,
    Pagination,
    TextField,
    InputAdornment,
    Button,
    Grid,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Movie, PaginatedResponse } from "../types";
import { BACKEND_URL } from "../config";
import { MovieCard } from "./MovieCard";
import { MovieDialog } from "./MovieDialog";
import { AddMovieDialog } from "./AddMovieDialog";
import { AlphabetIndex } from "./AlphabetIndex";

export const MovieList = () => {
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<string>("");
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const pageSize = 20;

    const {
        data: response,
        isLoading,
        error,
    } = useQuery<PaginatedResponse<Movie>>({
        queryKey: ["movies", searchQuery, page, pageSize],
        queryFn: async () => {
            let url = `${BACKEND_URL}/movies`;
            const params = new URLSearchParams();

            if (searchQuery) {
                url = `${BACKEND_URL}/movies/search`;
                params.append("q", searchQuery);
            }

            params.append("page", page.toString());
            params.append("limit", pageSize.toString());

            // Füge einen Cache-Buster hinzu, um sicherzustellen, dass wir keine gecachten Daten erhalten
            params.append("t", Date.now().toString());

            const response = await axios.get(`${url}?${params.toString()}`);
            return response.data;
        },
        refetchOnWindowFocus: true,
        staleTime: 1000 * 10, // 10 Sekunden
        gcTime: 1000 * 30, // 30 Sekunden
    });

    const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
        window.scrollTo(0, 0);
    };

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
    };

    const handleSearchSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setSearchQuery(searchTerm);
        setPage(1); // Bei neuer Suche zur ersten Seite zurückkehren
    };

    const handleSearchClear = () => {
        setSearchTerm("");
        setSearchQuery("");
        setPage(1);
    };

    if (isLoading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity='error' role='alert'>
                    {error instanceof Error ? error.message : String(error)}
                </Alert>
            </Box>
        );
    }

    const movies = response?.data || [];
    const meta = response?.meta || { page: 1, limit: pageSize, total: 0, total_pages: 1 };

    if (!movies || movies.length === 0) {
        return (
            <Container>
                <Box sx={{ p: 4 }}>
                    <Alert severity='info' role='alert'>
                        Keine Filme in der Sammlung
                    </Alert>
                </Box>
                <AlphabetIndex currentLetter={selectedLetter} availableLetters={[]} onLetterClick={() => {}} />
                <AddMovieDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} />
                <Fab
                    color='primary'
                    aria-label='Film hinzufügen'
                    onClick={() => setIsAddDialogOpen(true)}
                    sx={{
                        position: "fixed",
                        bottom: { xs: 90, sm: 32 },
                        right: 32,
                        zIndex: 1200,
                    }}
                >
                    <AddIcon />
                </Fab>
            </Container>
        );
    }

    const moviesByLetter = !searchQuery
        ? movies
              .reduce<[string, Movie[]][]>((acc, movie) => {
                  const firstLetter = movie.title.charAt(0).toUpperCase();
                  const existingGroup = acc.find(([letter]) => letter === firstLetter);
                  if (existingGroup) {
                      existingGroup[1].push(movie);
                  } else {
                      acc.push([firstLetter, [movie]]);
                  }
                  return acc;
              }, [])
              .sort(([a], [b]) => a.localeCompare(b))
        : [];

    const availableLetters = moviesByLetter.map(([letter]) => letter);

    return (
        <Container>
            {/* Suchleiste */}
            <Box
                component='form'
                onSubmit={handleSearchSubmit}
                sx={{ mb: 4, mt: 2, display: "flex", alignItems: "center" }}
            >
                <TextField
                    fullWidth
                    placeholder='Filme suchen...'
                    value={searchTerm}
                    onChange={handleSearch}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position='start'>
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                    sx={{ mr: 1 }}
                />
                <Button type='submit' variant='contained' sx={{ height: 56 }}>
                    Suchen
                </Button>
                {searchQuery && (
                    <Button variant='outlined' onClick={handleSearchClear} sx={{ ml: 1, height: 56 }}>
                        Zurücksetzen
                    </Button>
                )}
            </Box>

            {searchQuery && (
                <Box sx={{ mb: 4 }}>
                    <Typography variant='h6'>
                        Suchergebnisse für "{searchQuery}" ({meta.total} Filme gefunden)
                    </Typography>
                </Box>
            )}

            {(!movies || movies.length === 0) && (
                <Box sx={{ p: 4 }}>
                    <Alert severity='info' role='alert'>
                        {searchQuery ? `Keine Filme gefunden für "${searchQuery}"` : "Keine Filme in der Sammlung"}
                    </Alert>
                </Box>
            )}

            {movies.length > 0 && (
                <>
                    {/* Wenn keine Suche aktiv ist, zeige die alphabetische Gruppierung */}
                    {!searchQuery ? (
                        <>
                            {moviesByLetter.map(([letter, moviesInSection]) => (
                                <Box
                                    key={letter}
                                    id={`section-${letter}`}
                                    data-testid={`section-${letter}`}
                                    sx={{ mb: 6, scrollMarginTop: "2rem" }}
                                >
                                    <Typography
                                        variant='h4'
                                        component='h2'
                                        sx={{ mb: 3, borderBottom: "2px solid", borderColor: "primary.main", pb: 1 }}
                                    >
                                        {letter}
                                    </Typography>
                                    <Grid container spacing={3}>
                                        {moviesInSection.map((movie) => (
                                            <Grid
                                                key={movie.id}
                                                sx={{
                                                    flexBasis: {
                                                        xs: "100%",
                                                        sm: "50%",
                                                        md: "33.33%",
                                                        lg: "25%",
                                                        xl: "20%",
                                                    },
                                                }}
                                            >
                                                <MovieCard movie={movie} onClick={setSelectedMovie} />
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            ))}

                            {/* AlphabetIndex nur anzeigen, wenn wir nicht in Suchergebnissen sind */}
                            <AlphabetIndex
                                currentLetter={selectedLetter}
                                availableLetters={availableLetters}
                                onLetterClick={(letter) => {
                                    setSelectedLetter(letter);
                                    const section = document.getElementById(`section-${letter}`);
                                    if (section) {
                                        section.scrollIntoView({ behavior: "smooth" });
                                    }
                                }}
                            />
                        </>
                    ) : (
                        // Bei einer Suche zeigen wir die Ergebnisse ohne Gruppierung an
                        <Grid container spacing={3}>
                            {movies.map((movie) => (
                                <Grid
                                    key={movie.id}
                                    sx={{ flexBasis: { xs: "100%", sm: "50%", md: "33.33%", lg: "25%", xl: "20%" } }}
                                >
                                    <MovieCard movie={movie} onClick={setSelectedMovie} />
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </>
            )}

            {/* Paginierung hinzufügen */}
            {meta.total_pages > 1 && (
                <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                    <Pagination
                        count={meta.total_pages}
                        page={page}
                        onChange={handlePageChange}
                        color='primary'
                        size='large'
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}

            <MovieDialog open={!!selectedMovie} onClose={() => setSelectedMovie(null)} movie={selectedMovie} />
            <AddMovieDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} />

            <Fab
                color='primary'
                aria-label='Film hinzufügen'
                onClick={() => setIsAddDialogOpen(true)}
                sx={{
                    position: "fixed",
                    bottom: { xs: 90, sm: 32 },
                    right: 32,
                    zIndex: 1200,
                }}
            >
                <AddIcon />
            </Fab>
        </Container>
    );
};
