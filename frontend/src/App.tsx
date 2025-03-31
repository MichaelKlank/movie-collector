import { Box, CssBaseline } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MovieList } from "./components/MovieList";
import { ThemeProvider } from "./ThemeContext";
import { Header } from "./components/Header";

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <CssBaseline />
                <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
                    <Header />
                    <Box sx={{ p: 2, pt: 10 }}>
                        <MovieList />
                    </Box>
                </Box>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

export default App;
