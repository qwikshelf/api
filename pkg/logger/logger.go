package logger

import (
	"io"
	"os"
	"path/filepath"
	"time"

	"github.com/rs/zerolog"
)

// Log is the global logger instance used across the application.
var Log zerolog.Logger

// Init initializes the global logger.
//   - level: one of "debug", "info", "warn", "error" (default "info")
//   - filePath: path to the log file (e.g. "logs/app.log"). If empty, logs only to console.
//   - pretty: if true, uses a colored console writer (useful for local dev)
func Init(level, filePath string, pretty bool) {
	// Parse level
	lvl, err := zerolog.ParseLevel(level)
	if err != nil {
		lvl = zerolog.InfoLevel
	}

	// Build writers
	var writers []io.Writer

	// Console writer
	if pretty {
		writers = append(writers, zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
	} else {
		writers = append(writers, os.Stdout)
	}

	// File writer
	if filePath != "" {
		if err := os.MkdirAll(filepath.Dir(filePath), 0755); err == nil {
			file, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
			if err == nil {
				writers = append(writers, file)
			}
		}
	}

	multi := io.MultiWriter(writers...)
	Log = zerolog.New(multi).
		Level(lvl).
		With().
		Timestamp().
		Caller().
		Logger()
}

// Info returns an info-level event.
func Info() *zerolog.Event { return Log.Info() }

// Error returns an error-level event.
func Error() *zerolog.Event { return Log.Error() }

// Debug returns a debug-level event.
func Debug() *zerolog.Event { return Log.Debug() }

// Warn returns a warn-level event.
func Warn() *zerolog.Event { return Log.Warn() }

// Fatal returns a fatal-level event (calls os.Exit after logging).
func Fatal() *zerolog.Event { return Log.Fatal() }
