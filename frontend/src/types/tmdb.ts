export interface TMDBMovie {
    id: number;
    title: string;
    poster_path: string;
    release_date: string;
    vote_average?: number;
    media_type?: string;
    overview?: string;
    credits?: {
        cast: Array<{ name: string }>;
        crew: Array<{ name: string; job: string }>;
    };
}
