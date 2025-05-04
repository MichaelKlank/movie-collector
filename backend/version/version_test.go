package version

import (
	"fmt"
	"regexp"
	"strconv"
	"testing"
	"time"
)

func TestVersionFormat(t *testing.T) {
	// Prüfe, ob die Version dem erwarteten Format entspricht
	version := Version()

	// Erwartetes Format: Major.Minor.Patch-Hash (z.B. 1.18.3-83eb093)
	pattern := `^(\d+)\.(\d+)\.(\d+)-([a-f0-9]+)$`
	regex := regexp.MustCompile(pattern)

	if !regex.MatchString(version) {
		t.Errorf("Version hat nicht das erwartete Format (Major.Minor.Patch-Hash): %s", version)
		return
	}

	// Extrahiere die Komponenten
	matches := regex.FindStringSubmatch(version)
	majorStr := matches[1]
	minorStr := matches[2]
	patchStr := matches[3]
	hash := matches[4]

	// Konvertiere Strings zu Integers
	major, err := strconv.Atoi(majorStr)
	if err != nil {
		t.Errorf("Major-Version ist keine gültige Zahl: %s", majorStr)
	}

	minor, err := strconv.Atoi(minorStr)
	if err != nil {
		t.Errorf("Minor-Version ist keine gültige Zahl: %s", minorStr)
	}

	patch, err := strconv.Atoi(patchStr)
	if err != nil {
		t.Errorf("Patch-Version ist keine gültige Zahl: %s", patchStr)
	}

	// Prüfe, ob die Hash-Länge plausibel ist (Git-Hashes sind normalerweise 7+ Zeichen)
	if len(hash) < 6 {
		t.Errorf("Hash scheint zu kurz zu sein: %s", hash)
	}

	// Prüfe, ob die extrahierten Werte mit den Modulvariablen übereinstimmen
	if major != Major {
		t.Errorf("Major-Version in String (%d) stimmt nicht mit der Variable (%d) überein", major, Major)
	}

	if minor != Minor {
		t.Errorf("Minor-Version in String (%d) stimmt nicht mit der Variable (%d) überein", minor, Minor)
	}

	if patch != Patch {
		t.Errorf("Patch-Version in String (%d) stimmt nicht mit der Variable (%d) überein", patch, Patch)
	}

	if hash != BuildHash {
		t.Errorf("Hash in String (%s) stimmt nicht mit der Variable (%s) überein", hash, BuildHash)
	}
}

func TestGetCalendarWeek(t *testing.T) {
	// Teste die Kalenderwochenfunktion
	week := getCalendarWeek()

	// Hole die aktuelle Kalenderwoche zum Vergleich
	_, currentWeek := time.Now().ISOWeek()

	if week != currentWeek {
		t.Errorf("Berechnete Kalenderwoche (%d) stimmt nicht mit der aktuellen Kalenderwoche (%d) überein",
			week, currentWeek)
	}
}

func TestVersionVariables(t *testing.T) {
	// Teste, ob die Versionsvariablen sinnvolle Werte haben

	// Major sollte 1 oder größer sein
	if Major < 1 {
		t.Errorf("Major-Version sollte mindestens 1 sein, ist aber %d", Major)
	}

	// Minor sollte zwischen 1 und 53 liegen (Kalenderwochen)
	if Minor < 1 || Minor > 53 {
		t.Errorf("Minor-Version sollte zwischen 1 und 53 liegen, ist aber %d", Minor)
	}

	// Patch kann 0 oder größer sein
	if Patch < 0 {
		t.Errorf("Patch-Version sollte nicht negativ sein, ist aber %d", Patch)
	}

	// BuildHash sollte nicht leer sein
	if BuildHash == "" {
		t.Error("BuildHash sollte nicht leer sein")
	}
}

func ExampleVersion() {
	fmt.Println("Version Format Beispiel: " + Version())
	// Output variiert je nach Build
}
