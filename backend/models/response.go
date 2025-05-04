package models

// PaginationMeta enthält Metadaten für paginierte Antworten
type PaginationMeta struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// PaginatedResponse ist die Standardstruktur für paginierte Antworten
type PaginatedResponse struct {
	Data []Movie        `json:"data"`
	Meta PaginationMeta `json:"meta"`
}
