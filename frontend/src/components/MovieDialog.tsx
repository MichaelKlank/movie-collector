import {
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Box,
    Typography,
    Rating,
    Chip,
    Stack,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Button,
    DialogActions,
    CircularProgress,
    Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import NumbersIcon from "@mui/icons-material/Numbers";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveIcon from "@mui/icons-material/Save";
import { styled } from "@mui/material/styles";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, useEffect } from "react";
import { Movie } from "../types";
import { BACKEND_URL } from "../config";

interface MovieDialogProps {
    open: boolean;
    onClose: () => void;
    movie: Movie | null;
}

const MoviePoster = styled("img")(({ theme }) => ({
    width: "100%",
    maxWidth: 300,
    height: "auto",
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[8],
}));

const StyledDialog = styled(Dialog)(({ theme }) => ({
    "& .MuiDialog-paper": {
        maxWidth: 800,
        width: "100%",
        margin: theme.spacing(2),
        backgroundColor: theme.palette.background.paper,
    },
}));

export const MovieDialog = ({ movie, open, onClose }: MovieDialogProps) => {
    const queryClient = useQueryClient();
    const [isUpdating, setIsUpdating] = useState(false);
    const [updatedMovie, setUpdatedMovie] = useState<Movie | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Reset updatedMovie when movie prop changes
    useEffect(() => {
        setUpdatedMovie(null);
        setError(null);
    }, [movie]);

    const deleteMovieMutation = useMutation({
        mutationFn: async (id: number) => {
            const response = await axios.delete(`${BACKEND_URL}/movies/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["movies"] });
            onClose();
        },
        onError: (error) => {
            console.error("Error deleting movie:", error);
            setError("Löschen fehlgeschlagen");
        },
    });

    const updateFromTMDBMutation = useMutation({
        mutationFn: async () => {
            if (!movie) {
                throw new Error("Kein Film ausgewählt");
            }
            if (!movie.tmdb_id) {
                throw new Error("Keine TMDB-ID vorhanden");
            }
            console.log("Updating movie from TMDB:", movie.tmdb_id);
            const response = await axios.get(`${BACKEND_URL}/tmdb/movie/${movie.tmdb_id}`);
            console.log("TMDB Update Response:", response.data);
            return {
                ...movie,
                ...response.data,
                id: movie.id,
                description: response.data.overview || movie.description,
                overview: response.data.overview || movie.overview,
            };
        },
        onSuccess: (data) => {
            console.log("TMDB Update successful:", data);
            setUpdatedMovie(data);
            setIsUpdating(false);
            setError(null);
        },
        onError: (error) => {
            console.error("TMDB Update error:", error);
            setIsUpdating(false);
            setError("TMDB Update fehlgeschlagen");
        },
    });

    const saveMovieMutation = useMutation({
        mutationFn: async (movieData: Movie) => {
            console.log("Saving updated movie:", movieData);
            const response = await axios.put(`${BACKEND_URL}/movies/${movieData.id}`, movieData);
            return response.data;
        },
        onSuccess: (data) => {
            console.log("Movie saved successfully:", data);
            queryClient.invalidateQueries({ queryKey: ["movies"] });
            setError(null);
            onClose();
        },
        onError: (error) => {
            console.error("Error saving movie:", error);
            setError("Speichern fehlgeschlagen");
        },
    });

    const handleUpdateFromTMDB = () => {
        setIsUpdating(true);
        updateFromTMDBMutation.mutate();
    };

    const handleSave = () => {
        if (updatedMovie) {
            saveMovieMutation.mutate(updatedMovie);
        }
    };

    const displayMovie = updatedMovie || movie;

    if (!displayMovie) return null;

    const year = displayMovie.release_date ? new Date(displayMovie.release_date).getFullYear() : "Unbekanntes Jahr";

    const hasChanges =
        updatedMovie &&
        Object.keys(updatedMovie).some((key) => {
            if (key === "id") return false;
            return JSON.stringify(updatedMovie[key as keyof Movie]) !== JSON.stringify(movie?.[key as keyof Movie]);
        });

    const handleDelete = () => {
        if (window.confirm(`Möchten Sie "${displayMovie.title}" wirklich löschen?`)) {
            deleteMovieMutation.mutate(displayMovie.id);
        }
    };

    return (
        <StyledDialog open={open} onClose={onClose} maxWidth='md' fullWidth>
            <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant='h6' component='div'>
                    {displayMovie.title}
                </Typography>
                <IconButton aria-label='close' onClick={onClose} sx={{ color: "text.secondary" }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity='error'>{error}</Alert>
                    </Box>
                )}
                <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
                    {/* Linke Spalte mit Poster */}
                    <Box sx={{ flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 2 }}>
                        <MoviePoster
                            src={
                                displayMovie.poster_path || displayMovie.image_path
                                    ? `https://image.tmdb.org/t/p/w500${
                                          displayMovie.poster_path || displayMovie.image_path
                                      }`
                                    : "/placeholder.png"
                            }
                            alt={displayMovie.title}
                        />
                        <Stack spacing={1} alignItems='center'>
                            <Rating value={4} readOnly size='large' />
                            <Box sx={{ display: "flex", gap: 1 }}>
                                <IconButton color='primary'>
                                    <VisibilityIcon />
                                </IconButton>
                                <IconButton color='primary'>
                                    <BookmarkIcon />
                                </IconButton>
                            </Box>
                        </Stack>
                    </Box>

                    {/* Rechte Spalte mit Details */}
                    <Box sx={{ flex: 1 }}>
                        <Stack spacing={3}>
                            {/* Titel und Grundinfo */}
                            <Box>
                                <Typography variant='h4' gutterBottom>
                                    {displayMovie.title}
                                </Typography>
                                <Typography variant='h6' color='text.secondary' gutterBottom>
                                    {year}
                                </Typography>
                                <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                                    <Chip label='Blu-ray' color='primary' />
                                </Box>
                            </Box>

                            {/* Technische Details */}
                            <Box>
                                <Typography variant='h6' gutterBottom>
                                    DETAILS
                                </Typography>
                                <List disablePadding>
                                    <ListItem disablePadding sx={{ py: 1 }}>
                                        <ListItemIcon sx={{ minWidth: 40 }}>
                                            <NumbersIcon />
                                        </ListItemIcon>
                                        <ListItemText primary='Sammlungsnummer' secondary={`#${displayMovie.id}`} />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText primary='TMDB ID' secondary={displayMovie.tmdb_id} />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemText
                                            primary='Beschreibung'
                                            secondary={
                                                <Typography
                                                    component='div'
                                                    variant='body2'
                                                    sx={{
                                                        whiteSpace: "pre-wrap",
                                                        lineHeight: 1.6,
                                                        color: "text.secondary",
                                                    }}
                                                >
                                                    {displayMovie.description ||
                                                        displayMovie.overview ||
                                                        "Keine Beschreibung verfügbar"}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                </List>
                            </Box>

                            {/* Metadaten */}
                            {displayMovie.genres && displayMovie.genres.length > 0 && (
                                <Box>
                                    <Typography variant='h6' gutterBottom>
                                        GENRES
                                    </Typography>
                                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                                        {displayMovie.genres.map((genre) => (
                                            <Chip key={genre.id} label={genre.name} size='small' />
                                        ))}
                                    </Stack>
                                </Box>
                            )}

                            {/* Produktionsfirmen */}
                            {displayMovie.production_companies && displayMovie.production_companies.length > 0 && (
                                <Box>
                                    <Typography variant='h6' gutterBottom>
                                        PRODUKTIONSFIRMEN
                                    </Typography>
                                    <List dense>
                                        {displayMovie.production_companies.map((company) => (
                                            <ListItem key={company.id}>
                                                <ListItemIcon>
                                                    <NumbersIcon />
                                                </ListItemIcon>
                                                <ListItemText primary={company.name} />
                                            </ListItem>
                                        ))}
                                    </List>
                                </Box>
                            )}
                        </Stack>
                    </Box>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button startIcon={<DeleteIcon />} color='error' onClick={handleDelete}>
                    Löschen
                </Button>
                <Button
                    startIcon={isUpdating ? <CircularProgress size={20} /> : <RefreshIcon />}
                    onClick={handleUpdateFromTMDB}
                    disabled={isUpdating}
                >
                    Aktualisieren
                </Button>
                <Button startIcon={<SaveIcon />} variant='contained' onClick={handleSave} disabled={!hasChanges}>
                    Speichern
                </Button>
            </DialogActions>
        </StyledDialog>
    );
};
