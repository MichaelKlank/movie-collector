import { useState, useRef, useEffect } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    TextField,
    Typography,
    Grid,
    Card,
    CardMedia,
    CardContent,
    Tooltip,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import axios from "axios";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BACKEND_URL } from "../config";
import { TMDBMovie } from "../types/tmdb";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";

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
    const [selectedMovies, setSelectedMovies] = useState<TMDBMovie[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [movieMetadata, setMovieMetadata] = useState<Record<number, MovieMetadata>>({});
    const [, setDebugInfo] = useState<string>("");
    const [searchError, setSearchError] = useState<string>("");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();
    const [existingMovies, setExistingMovies] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 100);
            fetchExistingMovies();
        } else {
            // Reset all state when dialog is closed
            setSearchTerm("");
            setSearchQuery("");
            setSelectedMovies([]);
            setMovieMetadata({});
            setDebugInfo("");
            setSearchError("");
            setError(null);
        }
    }, [isOpen]);

    useEffect(() => {
        setError(null);
    }, [searchQuery]);

    const fetchExistingMovies = async () => {
        try {
            const response = await axios.get(`${BACKEND_URL}/movies`);
            if (response.data && response.data.data) {
                const tmdbIds = response.data.data
                    .filter((movie: { tmdb_id?: string }) => movie.tmdb_id)
                    .map((movie: { tmdb_id: string }) => movie.tmdb_id);
                setExistingMovies(tmdbIds);
            }
        } catch (error) {
            console.error("Fehler beim Laden bestehender Filme:", error);
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
        // Überprüfen, ob der Film bereits ausgewählt ist
        const isSelected = selectedMovies.some((m) => m.id === movie.id);

        if (isSelected) {
            // Film aus der Auswahl entfernen
            setSelectedMovies((prev) => prev.filter((m) => m.id !== movie.id));
        } else {
            // Film zur Auswahl hinzufügen
            setSelectedMovies((prev) => [...prev, movie]);
        }

        setError(null);

        // Metadaten hinzufügen, falls noch nicht vorhanden
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

    const handleAddMovies = async () => {
        if (selectedMovies.length === 0) return;

        setError(null);

        try {
            // Nacheinander alle ausgewählten Filme hinzufügen
            for (const movie of selectedMovies) {
                await addMovieMutation.mutateAsync(movie);
            }

            // Nach erfolgreichem Hinzufügen den Dialog schließen
            queryClient.invalidateQueries({ queryKey: ["movies"] });
            onClose();
        } catch (error) {
            console.error("Fehler beim Hinzufügen der Filme:", error);
            if (axios.isAxiosError(error) && error.response?.status === 409) {
                setError("Mindestens ein Film existiert bereits in Ihrer Sammlung");
            } else {
                setError(error instanceof Error ? error.message : "Ein Fehler ist aufgetreten");
            }
        }
    };

    const isAddButtonDisabled = () => {
        return selectedMovies.length === 0;
    };

    // Funktion zur Prüfung, ob ein Film bereits ausgewählt ist
    const isMovieSelected = (movie: TMDBMovie) => {
        return selectedMovies.some((m) => m.id === movie.id);
    };

    // Funktion zur Prüfung, ob ein Film bereits in der Sammlung existiert
    const isMovieInCollection = (movie: TMDBMovie) => {
        return existingMovies.includes(movie.id.toString());
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
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {selectedMovies.length > 0
                    ? `Filme hinzufügen (${selectedMovies.length} ausgewählt)`
                    : "Filme hinzufügen"}
                <IconButton aria-label='close' onClick={onClose} sx={{ color: "text.secondary" }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent
                sx={{
                    px: { xs: 2, sm: 3 },
                    py: { xs: 1, sm: 2 },
                }}
            >
                <Box sx={{ mb: 2, borderRadius: 1 }}>
                    <Box sx={{ p: 2 }}>
                        <Typography variant='subtitle1' sx={{ mb: 2, fontWeight: 600 }}>
                            Nach Filmen suchen
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                            <TextField
                                fullWidth
                                placeholder='Filmtitel eingeben...'
                                value={searchTerm}
                                onChange={handleSearch}
                                onKeyDown={handleKeyDown}
                                inputRef={searchInputRef}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position='start'>
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ mb: 1 }}
                            />
                            <Button
                                variant='contained'
                                color='primary'
                                onClick={handleSearchClick}
                                disabled={isSearching || !searchTerm.trim()}
                                sx={{ height: "fit-content", minWidth: "120px", whiteSpace: "nowrap" }}
                            >
                                {isSearching ? <CircularProgress size={24} /> : "Suchen"}
                            </Button>
                        </Box>

                        {searchError && (
                            <Alert severity='error' sx={{ mt: 2 }}>
                                {searchError}
                            </Alert>
                        )}

                        {isFetching && !isSearching && (
                            <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
                                <CircularProgress />
                            </Box>
                        )}

                        {searchResults && searchResults.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant='subtitle1' sx={{ mb: 1, fontWeight: 600 }}>
                                    Gefundene Filme ({searchResults.length})
                                </Typography>
                                <Grid container spacing={2}>
                                    {searchResults.map((movie) => (
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
                                            <Card
                                                sx={{
                                                    height: "100%",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    border: isMovieSelected(movie)
                                                        ? "2px solid"
                                                        : isMovieInCollection(movie)
                                                        ? "2px dashed"
                                                        : "none",
                                                    borderColor: isMovieInCollection(movie)
                                                        ? "success.main"
                                                        : "primary.main",
                                                    position: "relative",
                                                    cursor: isMovieInCollection(movie) ? "default" : "pointer",
                                                    opacity: isMovieInCollection(movie) ? 0.8 : 1,
                                                    m: 1,
                                                }}
                                                onClick={() => {
                                                    if (!isMovieInCollection(movie)) {
                                                        handleMovieSelect(movie);
                                                    }
                                                }}
                                            >
                                                {isMovieSelected(movie) && (
                                                    <Box
                                                        sx={{
                                                            position: "absolute",
                                                            top: 8,
                                                            right: 8,
                                                            zIndex: 2,
                                                            bgcolor: "primary.main",
                                                            borderRadius: "50%",
                                                            width: 24,
                                                            height: 24,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                        }}
                                                    >
                                                        <CheckIcon sx={{ color: "white", fontSize: 16 }} />
                                                    </Box>
                                                )}

                                                {isMovieInCollection(movie) && (
                                                    <Tooltip title='Film bereits in Ihrer Sammlung'>
                                                        <Box
                                                            sx={{
                                                                position: "absolute",
                                                                top: 8,
                                                                right: 8,
                                                                zIndex: 2,
                                                                bgcolor: "success.main",
                                                                borderRadius: "50%",
                                                                width: 24,
                                                                height: 24,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            <BookmarkIcon sx={{ color: "white", fontSize: 16 }} />
                                                        </Box>
                                                    </Tooltip>
                                                )}

                                                <CardMedia
                                                    component='img'
                                                    alt={movie.title}
                                                    height='240'
                                                    image={
                                                        movie.poster_path
                                                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                                                            : "/placeholders/movie-placeholder.png"
                                                    }
                                                    sx={{ objectFit: "cover" }}
                                                />
                                                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                                                    <Typography variant='subtitle1' component='h3' noWrap>
                                                        {movie.title}
                                                    </Typography>
                                                    <Typography
                                                        variant='body2'
                                                        color='text.secondary'
                                                        sx={{
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 3,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden",
                                                            mt: 1,
                                                            mb: 2,
                                                        }}
                                                    >
                                                        {movie.overview || "Keine Beschreibung verfügbar."}
                                                    </Typography>
                                                    <Typography variant='body2' color='text.secondary'>
                                                        {movie.release_date
                                                            ? new Date(movie.release_date).getFullYear()
                                                            : "Unbekanntes Jahr"}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        )}
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions
                sx={{
                    px: { xs: 2, sm: 3 },
                    pb: { xs: 2, sm: 3 },
                    justifyContent: "space-between",
                }}
            >
                <Box>
                    {error && (
                        <Typography variant='body2' color='error' sx={{ mb: 1 }}>
                            {error}
                        </Typography>
                    )}
                </Box>
                <Box>
                    <Button onClick={onClose} color='inherit' sx={{ mr: 1 }}>
                        Abbrechen
                    </Button>
                    <LoadingButton
                        onClick={handleAddMovies}
                        disabled={isAddButtonDisabled()}
                        loading={addMovieMutation.isPending}
                        variant='contained'
                        color='primary'
                        startIcon={<AddIcon />}
                    >
                        {selectedMovies.length > 1 ? `${selectedMovies.length} Filme hinzufügen` : "Film hinzufügen"}
                    </LoadingButton>
                </Box>
            </DialogActions>
        </Dialog>
    );
}
