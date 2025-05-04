export interface Version {
    version: string;
}

export interface Movie {
    id: number;
    title: string;
    description?: string;
    year: number;
    poster_path?: string;
    rating: number;
    tmdb_id?: string;
    image_path?: string;
    overview?: string;
    release_date?: string;
    created_at?: string;
    updated_at?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}
