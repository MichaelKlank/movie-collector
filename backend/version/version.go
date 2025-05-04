package version

import (
    "fmt"
    "time"
)

var (
    // Major Version, startet bei 1
    Major = 1
    // Minor Version, basiert auf der aktuellen Kalenderwoche
    Minor = 18
    // Patch Version, gesetzt durch CI/CD
    Patch = 3
    // BuildHash, gesetzt durch CI/CD
    BuildHash = "83eb093"
)

// Version gibt die aktuelle Version als String zurück
func Version() string {
    return fmt.Sprintf("%d.%d.%d-%s", Major, Minor, Patch, BuildHash)
}

// getCalendarWeek berechnet die aktuelle Kalenderwoche
func getCalendarWeek() int {
    _, week := time.Now().ISOWeek()
    return week
}
