package pagination

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// Params holds pagination parameters
type Params struct {
	Page    int
	PerPage int
	Offset  int
}

const (
	DefaultPage    = 1
	DefaultPerPage = 20
	MaxPerPage     = 100
)

// FromContext extracts pagination parameters from the request
func FromContext(c *gin.Context) Params {
	page := parseIntWithDefault(c.Query("page"), DefaultPage)
	perPage := parseIntWithDefault(c.Query("per_page"), DefaultPerPage)

	// Ensure valid values
	if page < 1 {
		page = DefaultPage
	}
	if perPage < 1 {
		perPage = DefaultPerPage
	}
	if perPage > MaxPerPage {
		perPage = MaxPerPage
	}

	return Params{
		Page:    page,
		PerPage: perPage,
		Offset:  (page - 1) * perPage,
	}
}

// TotalPages calculates the total number of pages
func TotalPages(total int64, perPage int) int {
	if perPage <= 0 {
		return 0
	}
	pages := int(total) / perPage
	if int(total)%perPage > 0 {
		pages++
	}
	return pages
}

func parseIntWithDefault(value string, defaultValue int) int {
	if value == "" {
		return defaultValue
	}
	result, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return result
}
