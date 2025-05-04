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
    poster_path?: string;
    image_path?: string;
    created_at?: string;
    updated_at?: string;
    tmdb_id?: string;
    overview?: string;
    release_date?: string;
    [key: string]: string | number | boolean | undefined | null | Genre[] | ProductionCompany[];
    genres?: Genre[];
    production_companies?: ProductionCompany[];
}

// API Response Types
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

// User Types
export interface UserPreferences {
    theme: "light" | "dark";
    language: string;
}
