import { Movie } from "../types";
import { Card, CardContent, CardMedia, Typography, Box } from "@mui/material";

interface MovieCardProps {
    movie: Movie;
    onClick?: (movie: Movie) => void;
}

export const MovieCard = ({ movie, onClick }: MovieCardProps) => {
    return (
        <Card
            role='article'
            aria-label={movie.title}
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                "&:hover": {
                    transform: "scale(1.02)",
                    transition: "transform 0.2s ease-in-out",
                },
            }}
            onClick={() => onClick?.(movie)}
        >
            <Box sx={{ position: "relative" }}>
                <CardMedia
                    component='img'
                    image={
                        movie.poster_path || movie.image_path
                            ? `https://image.tmdb.org/t/p/w500${movie.poster_path || movie.image_path}`
                            : "/placeholder.png"
                    }
                    alt={movie.title}
                    sx={{ height: "auto", objectFit: "cover" }}
                />
            </Box>
            <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant='h6' gutterBottom>
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
                    }}
                >
                    {movie.description}
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                    {movie.year}
                </Typography>
            </CardContent>
        </Card>
    );
};
