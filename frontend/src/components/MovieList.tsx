import { useState } from "react";
import { Box, Typography, Grid, CircularProgress, Alert, Fab, Container } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Movie } from "../types";
import { BACKEND_URL } from "../config";
import { MovieCard } from "./MovieCard";
import { MovieDialog } from "./MovieDialog";
import { AddMovieDialog } from "./AddMovieDialog";
import { AlphabetIndex } from "./AlphabetIndex";

export const MovieList = () => {
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedLetter, setSelectedLetter] = useState<string>("");

    const {
        data: movies,
        isLoading,
        error,
    } = useQuery<Movie[]>({
        queryKey: ["movies"],
        queryFn: async () => {
            const response = await axios.get(`${BACKEND_URL}/movies`);
            return response.data;
        },
    });

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

    const moviesByLetter = movies.reduce<[string, Movie[]][]>((acc, movie) => {
        const firstLetter = movie.title.charAt(0).toUpperCase();
        const existingGroup = acc.find(([letter]) => letter === firstLetter);
        if (existingGroup) {
            existingGroup[1].push(movie);
        } else {
            acc.push([firstLetter, [movie]]);
        }
        return acc;
    }, []);

    moviesByLetter.sort(([a], [b]) => a.localeCompare(b));
    const availableLetters = moviesByLetter.map(([letter]) => letter);

    return (
        <Container>
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
                            <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={movie.id}>
                                <MovieCard movie={movie} onClick={setSelectedMovie} />
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            ))}
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
        </Container>
    );
};
