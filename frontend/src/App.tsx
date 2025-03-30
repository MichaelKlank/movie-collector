import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Movie } from "./types";
import MovieCard from "./components/MovieCard";
import { MovieDialog } from "./components/MovieDialog";
import { AddMovieDialog } from "./components/AddMovieDialog";
import { AlphabetIndex } from "./components/AlphabetIndex";
import { Container, Box, Typography, Grid, CircularProgress, Alert, Fab } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { BACKEND_URL } from "./config";

function App() {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [selectedLetter, setSelectedLetter] = useState<string | undefined>(undefined);

    const {
        data: movies = [],
        isLoading,
        error,
    } = useQuery<Movie[]>({
        queryKey: ["movies"],
        queryFn: async () => {
            const response = await fetch(`${BACKEND_URL}/movies`);
            if (!response.ok) {
                throw new Error("Failed to fetch movies");
            }
            return response.json();
        },
    });

    const sortedMovies = useMemo(() => {
        return [...movies].sort((a, b) => a.title.localeCompare(b.title));
    }, [movies]);

    const moviesByLetter = useMemo(() => {
        const grouped = sortedMovies.reduce((acc, movie) => {
            const firstLetter = movie.title.charAt(0).toUpperCase();
            const letter = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
            if (!acc[letter]) {
                acc[letter] = [];
            }
            acc[letter].push(movie);
            return acc;
        }, {} as Record<string, Movie[]>);

        return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)) as [string, Movie[]][];
    }, [sortedMovies]);

    const availableLetters = useMemo(() => {
        return moviesByLetter.map(([letter]) => letter);
    }, [moviesByLetter]);

    if (isLoading)
        return (
            <Box display='flex' justifyContent='center' alignItems='center' minHeight='100vh'>
                <CircularProgress />
            </Box>
        );
    if (error)
        return (
            <Box display='flex' justifyContent='center' alignItems='center' minHeight='100vh'>
                <Alert severity='error'>Fehler beim Laden der Filme</Alert>
            </Box>
        );

    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
            <Container sx={{ py: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
                    <Typography variant='h3' component='h1' color='text.primary'>
                        Meine DVD-Sammlung
                    </Typography>
                </Box>
                <Box>
                    {moviesByLetter.map(([letter, moviesInSection]) => (
                        <Box key={letter} id={`section-${letter}`} sx={{ mb: 6, scrollMarginTop: "2rem" }}>
                            <Typography
                                variant='h4'
                                component='h2'
                                sx={{ mb: 3, borderBottom: "2px solid", borderColor: "primary.main", pb: 1 }}
                            >
                                {letter}
                            </Typography>
                            <Grid container spacing={3}>
                                {moviesInSection.map((movie) => (
                                    <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={movie.id}>
                                        <MovieCard movie={movie} onClick={setSelectedMovie} />
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    ))}
                </Box>
            </Container>
            <MovieDialog open={!!selectedMovie} onClose={() => setSelectedMovie(null)} movie={selectedMovie} />
            <AddMovieDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} />
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
        </Box>
    );
}

export default App;
