export interface Genre {
    id: number;
    name: string;
}

export interface ProductionCompany {
    id: number;
    name: string;
}

export interface Movie {
    id: number;
    title: string;
    description: string;
    year: number;
    image_path?: string;
    poster_path?: string;
    tmdb_id?: string;
    overview?: string;
    release_date?: string;
    rating: number;
    created_at?: string;
    updated_at?: string;
    genres?: Genre[];
    production_companies?: ProductionCompany[];
}
