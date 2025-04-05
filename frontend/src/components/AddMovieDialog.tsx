import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MovieIcon from "@mui/icons-material/Movie";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "../config";
import { TMDBMovie } from "../types/tmdb";

const MoviePoster = styled(Avatar)(({ theme }) => ({
    width: 120,
    height: 180,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[2],
}));

interface MovieMetadata {
    seen: boolean;
    watchlist: boolean;
    rating: number;
    mediaType: "Blu-ray" | "DVD" | "4K";
}

interface AddMovieDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddMovieDialog({ isOpen, onClose }: AddMovieDialogProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMovie, setSelectedMovie] = useState<TMDBMovie | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [movieMetadata, setMovieMetadata] = useState<Record<number, MovieMetadata>>({});
    const [debugInfo, setDebugInfo] = useState<string>("");
    const [searchError, setSearchError] = useState<string>("");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
        } else {
            // Reset all state when dialog is closed
            setSearchTerm("");
            setSearchQuery("");
            setSelectedMovie(null);
            setMovieMetadata({});
            setDebugInfo("");
            setSearchError("");
            setError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        setError(null);
    }, [searchQuery]);

    const testTMDBConnection = async () => {
        try {
            setDebugInfo("Starte TMDB Test...");
            const response = await axios.get(`${BACKEND_URL}/tmdb/test`);
            setDebugInfo(`TMDB Test erfolgreich: ${JSON.stringify(response.data, null, 2)}`);
        } catch (error) {
            console.error("TMDB Test Error:", error);
            if (axios.isAxiosError(error)) {
                setDebugInfo(
                    `TMDB Test fehlgeschlagen:\nError: ${error.message}\n` +
                        `Status: ${error.response?.status}\n` +
                        `Response: ${JSON.stringify(error.response?.data, null, 2)}\n` +
                        `Request URL: ${error.config?.url}`
                );
            } else {
                setDebugInfo(
                    `TMDB Test fehlgeschlagen: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
                );
            }
        }
    };

    const {
        data: searchResults = [],
        refetch,
        isFetching,
    } = useQuery<TMDBMovie[]>({
        queryKey: ["searchMovies", searchQuery],
        queryFn: async () => {
            if (!searchQuery) return [];
            try {
                setSearchError("");
                const encodedQuery = encodeURIComponent(searchQuery.trim());
                console.log("Sending search request for query:", encodedQuery);
                console.log("Search URL:", `${BACKEND_URL}/tmdb/search?query=${encodedQuery}`);
                const response = await axios.get<TMDBMovie[]>(`${BACKEND_URL}/tmdb/search?query=${encodedQuery}`);
                console.log("TMDB Suchergebnisse (vollständig):", JSON.stringify(response.data, null, 2));

                // Stelle sicher, dass response.data ein Array ist
                const movies = Array.isArray(response.data) ? response.data : [];

                console.log("Anzahl der gefundenen Filme:", movies.length);
                console.log(
                    "TMDB Suchergebnisse (mit Overview):",
                    movies.map((movie: TMDBMovie) => ({
                        title: movie.title,
                        overview: movie.overview || "Keine Beschreibung",
                        overviewLength: movie.overview ? movie.overview.length : 0,
                    }))
                );
                setDebugInfo(`Suche erfolgreich: ${JSON.stringify(movies, null, 2)}`);
                return movies;
            } catch (error) {
                console.error("TMDB Suchfehler:", error);
                setSearchError("Bei der Suche ist ein Fehler aufgetreten");
                return [];
            }
        },
        enabled: true,
        gcTime: 0,
        staleTime: 0,
    });

    const addMovieMutation = useMutation({
        mutationFn: async (movie: TMDBMovie) => {
            const metadata = movieMetadata[movie.id];
            const movieData = {
                title: movie.title,
                description: movie.overview || "",
                year: movie.release_date ? parseInt(movie.release_date.split("-")[0]) : 0,
                image_path: movie.poster_path,
                poster_path: movie.poster_path,
                tmdb_id: movie.id.toString(),
                overview: movie.overview || "",
                release_date: movie.release_date,
                rating: metadata?.rating || 0,
            };
            console.log("Sende Daten:", movieData);
            const response = await axios.post(`${BACKEND_URL}/movies`, movieData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["movies"] });
            onClose();
        },
        onError: (error) => {
            console.error("Fehler beim Hinzufügen des Films:", error);
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                setError("Dieser Film existiert bereits in Ihrer Sammlung");
            } else {
                setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
            }
        },
    });

    const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(event.target.value);
        setError(null);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        console.log("Key pressed:", event.key);
        if (event.key === "Enter") {
            console.log("Enter key detected, preventing default and triggering search");
            event.preventDefault();
            event.stopPropagation();
            if (searchTerm.trim()) {
                handleSearchClick();
            } else {
                console.log("Search term is empty, not triggering search");
            }
        }
    };

    const handleSearchClick = () => {
        console.log("Search clicked with term:", searchTerm);
        const trimmedTerm = searchTerm.trim();
        if (trimmedTerm) {
            console.log("Setting search query and triggering search");
            setIsSearching(true);
            setSearchQuery(trimmedTerm);
            // Wir erzwingen eine neue Abfrage durch Invalidierung des Cache
            queryClient.invalidateQueries({ queryKey: ["searchMovies", trimmedTerm] });
            refetch().finally(() => {
                setTimeout(() => {
                    setIsSearching(false);
                }, 1000);
            });
        } else {
            console.log("Empty search term, not triggering search");
        }
    };

    const handleMovieSelect = (movie: TMDBMovie) => {
        console.log("Selected movie:", {
            ...movie,
            overview: movie.overview ? `${movie.overview.substring(0, 100)}...` : "Keine Beschreibung",
        });
        setSelectedMovie(movie);
        setError(null);
        if (!movieMetadata[movie.id]) {
            setMovieMetadata((prev) => ({
                ...prev,
                [movie.id]: {
                    seen: false,
                    watchlist: false,
                    rating: 0,
                    mediaType: "Blu-ray",
                },
            }));
        }
    };

    const toggleMovieSeen = (movieId: number) => {
        setMovieMetadata((prev) => ({
            ...prev,
            [movieId]: {
                ...prev[movieId],
                seen: !prev[movieId].seen,
            },
        }));
    };

    const toggleMovieWatchlist = (movieId: number) => {
        setMovieMetadata((prev) => ({
            ...prev,
            [movieId]: {
                ...prev[movieId],
                watchlist: !prev[movieId].watchlist,
            },
        }));
    };

    const handleAddMovie = () => {
        if (!selectedMovie) return;
        addMovieMutation.mutate(selectedMovie);
    };

    const isAddButtonDisabled = () => {
        if (!selectedMovie) return true;
        return !selectedMovie.title || !selectedMovie.overview || !selectedMovie.release_date;
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth='md'
            fullWidth
            PaperProps={{
                sx: {
                    bgcolor: "background.paper",
                    m: { xs: 1, sm: 2 },
                    width: { xs: "100%", sm: "90vw", md: "80vw", lg: "900px" },
                    maxWidth: "900px",
                },
            }}
        >
            <DialogTitle
                sx={{
                    pb: { xs: 1, sm: 2 },
                    fontSize: { xs: "1.2rem", sm: "1.5rem" },
                    px: { xs: 2, sm: 3 },
                }}
            >
                Film hinzufügen
            </DialogTitle>
            <DialogContent
                sx={{
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1, sm: 2 },
                }}
            >
                <Accordion sx={{ mb: 2, "&.MuiAccordion-root": { borderRadius: 1, "&:before": { display: "none" } } }}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{ bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.800" : "grey.100") }}
                    >
                        <Typography variant='body2' color='text.secondary'>
                            Debug Informationen
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Button
                            variant='outlined'
                            size='small'
                            color='primary'
                            onClick={testTMDBConnection}
                            sx={{ mb: 2 }}
                        >
                            TMDB Verbindung testen
                        </Button>
                        {debugInfo && (
                            <Box
                                sx={{
                                    p: 1,
                                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.800" : "grey.100"),
                                    borderRadius: 1,
                                    maxHeight: "200px",
                                    overflow: "auto",
                                }}
                            >
                                <pre
                                    style={{
                                        margin: 0,
                                        fontSize: "0.8rem",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                    }}
                                >
                                    {debugInfo}
                                </pre>
                            </Box>
                        )}
                    </AccordionDetails>
                </Accordion>

                {searchError && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                        {searchError}
                    </Alert>
                )}

                {error && (
                    <Alert severity='error' sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <TextField
                    inputRef={searchInputRef}
                    autoFocus
                    margin='dense'
                    label='Film suchen'
                    type='text'
                    fullWidth
                    value={searchTerm}
                    onChange={handleSearch}
                    onKeyDown={handleKeyDown}
                    sx={{
                        mb: { xs: 2, sm: 2 },
                        "& .MuiInputBase-root": {
                            height: { xs: "48px", sm: "56px" },
                            bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.800" : "background.paper"),
                        },
                        "& .MuiInputLabel-root": {
                            fontSize: { xs: "0.875rem", sm: "1rem" },
                            color: (theme) => (theme.palette.mode === "dark" ? "grey.400" : "grey.600"),
                        },
                        "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                                borderColor: (theme) => (theme.palette.mode === "dark" ? "grey.700" : "grey.300"),
                            },
                            "&:hover fieldset": {
                                borderColor: (theme) => (theme.palette.mode === "dark" ? "grey.600" : "grey.400"),
                            },
                        },
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position='end'>
                                <Button
                                    variant='contained'
                                    onClick={handleSearchClick}
                                    startIcon={<SearchIcon />}
                                    type='submit'
                                    sx={{
                                        minWidth: { xs: "auto", sm: "100px" },
                                        px: { xs: 1, sm: 2 },
                                        fontSize: { xs: "0.875rem", sm: "1rem" },
                                    }}
                                >
                                    {window.innerWidth < 600 ? <SearchIcon /> : "Suchen"}
                                </Button>
                            </InputAdornment>
                        ),
                    }}
                />
                {searchQuery && (
                    <>
                        {isSearching || isFetching ? (
                            <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <>
                                {(!searchResults || searchResults.length === 0) && (
                                    <Box
                                        sx={{
                                            mt: 2,
                                            p: 2,
                                            textAlign: "center",
                                            bgcolor: "background.paper",
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Typography variant='body1' color='text.secondary'>
                                            Keine Filme gefunden für "{searchQuery}"
                                        </Typography>
                                    </Box>
                                )}
                                {searchResults && searchResults.length > 0 && (
                                    <Stack spacing={2} sx={{ mt: 2 }}>
                                        {searchResults.map((movie: TMDBMovie) => {
                                            const metadata = movieMetadata[movie.id] || {
                                                seen: false,
                                                watchlist: false,
                                                rating: 0,
                                                mediaType: "Blu-ray",
                                            };
                                            return (
                                                <ListItemButton
                                                    key={movie.id}
                                                    selected={selectedMovie?.id === movie.id}
                                                    onClick={() => handleMovieSelect(movie)}
                                                    role='button'
                                                    aria-label={movie.title}
                                                    sx={{
                                                        borderRadius: 2,
                                                        border: "1px solid",
                                                        borderColor: (theme) =>
                                                            theme.palette.mode === "dark" ? "grey.700" : "grey.300",
                                                        p: { xs: 2, sm: 3 },
                                                        display: "flex",
                                                        flexDirection: "row",
                                                        alignItems: "flex-start",
                                                        width: "100%",
                                                        maxWidth: "100%",
                                                        bgcolor: (theme) =>
                                                            theme.palette.mode === "dark"
                                                                ? "grey.800"
                                                                : "background.paper",
                                                        "&:hover": {
                                                            borderColor: "primary.main",
                                                            bgcolor: (theme) =>
                                                                theme.palette.mode === "dark" ? "grey.700" : "grey.100",
                                                        },
                                                        "&.Mui-selected": {
                                                            borderColor: "primary.main",
                                                            bgcolor: (theme) =>
                                                                theme.palette.mode === "dark"
                                                                    ? "primary.dark"
                                                                    : "primary.light",
                                                        },
                                                    }}
                                                >
                                                    <ListItemAvatar
                                                        sx={{
                                                            mb: 0,
                                                            mr: 3,
                                                            minWidth: "auto",
                                                            alignSelf: "flex-start",
                                                        }}
                                                    >
                                                        <MoviePoster
                                                            variant='rounded'
                                                            src={
                                                                movie.poster_path
                                                                    ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
                                                                    : undefined
                                                            }
                                                            alt={movie.title}
                                                        >
                                                            {!movie.poster_path && (
                                                                <MovieIcon sx={{ width: 40, height: 40 }} />
                                                            )}
                                                        </MoviePoster>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Typography
                                                                component='div'
                                                                variant='body2'
                                                                sx={{
                                                                    display: "flex",
                                                                    flexDirection: "row",
                                                                    alignItems: "center",
                                                                    gap: 2,
                                                                    mb: 1,
                                                                    flexWrap: "wrap",
                                                                    width: "100%",
                                                                    maxWidth: "600px",
                                                                }}
                                                            >
                                                                <Typography
                                                                    component='div'
                                                                    variant='h6'
                                                                    sx={{
                                                                        fontSize: "1.25rem",
                                                                        fontWeight: 500,
                                                                        flex: "1 1 auto",
                                                                        minWidth: "200px",
                                                                    }}
                                                                >
                                                                    {movie.title}
                                                                </Typography>
                                                                <Box sx={{ display: "flex", gap: 1 }}>
                                                                    <IconButton
                                                                        size='small'
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleMovieSeen(movie.id);
                                                                        }}
                                                                        aria-label='Als gesehen markieren'
                                                                        aria-pressed={metadata.seen}
                                                                    >
                                                                        {metadata.seen ? (
                                                                            <VisibilityIcon />
                                                                        ) : (
                                                                            <VisibilityOffIcon />
                                                                        )}
                                                                    </IconButton>
                                                                    <IconButton
                                                                        size='small'
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleMovieWatchlist(movie.id);
                                                                        }}
                                                                        aria-label='Zur Merkliste hinzufügen'
                                                                        aria-pressed={metadata.watchlist}
                                                                    >
                                                                        {metadata.watchlist ? (
                                                                            <BookmarkIcon />
                                                                        ) : (
                                                                            <BookmarkBorderIcon />
                                                                        )}
                                                                    </IconButton>
                                                                </Box>
                                                            </Typography>
                                                        }
                                                        secondary={
                                                            <Typography
                                                                component='div'
                                                                variant='body2'
                                                                color='text.secondary'
                                                            >
                                                                <Typography
                                                                    component='div'
                                                                    variant='body2'
                                                                    sx={{
                                                                        fontSize: {
                                                                            xs: "0.875rem",
                                                                            sm: "0.875rem",
                                                                        },
                                                                    }}
                                                                >
                                                                    {movie.overview
                                                                        ? movie.overview.length > 150
                                                                            ? `${movie.overview.substring(0, 150)}...`
                                                                            : movie.overview
                                                                        : "Keine Beschreibung verfügbar"}
                                                                </Typography>
                                                                {movie.credits?.cast &&
                                                                    movie.credits.cast.length > 0 && (
                                                                        <Typography
                                                                            component='div'
                                                                            variant='body2'
                                                                            sx={{
                                                                                fontSize: {
                                                                                    xs: "0.875rem",
                                                                                    sm: "0.875rem",
                                                                                },
                                                                            }}
                                                                        >
                                                                            Mit:{" "}
                                                                            {movie.credits.cast
                                                                                .slice(0, 3)
                                                                                .map((actor) => actor.name)
                                                                                .join(", ")}
                                                                        </Typography>
                                                                    )}
                                                                {movie.credits?.crew &&
                                                                    movie.credits.crew.length > 0 &&
                                                                    movie.credits.crew.find(
                                                                        (c) => c.job === "Director"
                                                                    ) && (
                                                                        <Typography
                                                                            component='div'
                                                                            variant='body2'
                                                                            sx={{
                                                                                fontSize: {
                                                                                    xs: "0.875rem",
                                                                                    sm: "0.875rem",
                                                                                },
                                                                            }}
                                                                        >
                                                                            Regie:{" "}
                                                                            {
                                                                                movie.credits.crew.find(
                                                                                    (c) => c.job === "Director"
                                                                                )?.name
                                                                            }
                                                                        </Typography>
                                                                    )}
                                                            </Typography>
                                                        }
                                                    />
                                                </ListItemButton>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </>
                        )}
                    </>
                )}
            </DialogContent>
            <DialogActions
                sx={{
                    px: { xs: 1, sm: 3 },
                    py: { xs: 1, sm: 2 },
                    borderTop: (theme) => `1px solid ${theme.palette.divider}`,
                }}
            >
                <Button
                    onClick={onClose}
                    sx={{
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                        color: (theme) => (theme.palette.mode === "dark" ? "grey.300" : "grey.700"),
                    }}
                >
                    Abbrechen
                </Button>
                <Button
                    onClick={handleAddMovie}
                    disabled={isAddButtonDisabled()}
                    variant='contained'
                    color='primary'
                    sx={{
                        fontSize: { xs: "0.875rem", sm: "1rem" },
                        bgcolor: (theme) => (theme.palette.mode === "dark" ? "primary.dark" : "primary.main"),
                        "&:hover": {
                            bgcolor: (theme) => (theme.palette.mode === "dark" ? "primary.main" : "primary.dark"),
                        },
                    }}
                >
                    Hinzufügen
                </Button>
            </DialogActions>
        </Dialog>
    );
}
