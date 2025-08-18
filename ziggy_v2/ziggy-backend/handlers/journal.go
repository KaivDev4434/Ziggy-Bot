package handlers

import (
	"net/http"
	"strconv"
	"time"

	"ziggy/database"
	"ziggy/models"

	"github.com/gin-gonic/gin"
)

// CreateJournalEntryRequest represents the request body for creating a journal entry
type CreateJournalEntryRequest struct {
	Content string `json:"content" binding:"required"`
}

// UpdateJournalEntryRequest represents the request body for updating a journal entry
type UpdateJournalEntryRequest struct {
	Content   string `json:"content"`
	Processed bool   `json:"processed"`
}

// JournalResponse represents the response format for journal operations
type JournalResponse struct {
	ID        uint      `json:"id"`
	Content   string    `json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Processed bool      `json:"processed"`
}

// ErrorResponse represents the error response format
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// PaginatedJournalResponse represents paginated journal entries response
type PaginatedJournalResponse struct {
	Entries []JournalResponse `json:"entries"`
	Total   int64             `json:"total"`
	Page    int               `json:"page"`
	Limit   int               `json:"limit"`
}

// CreateJournalEntry creates a new journal entry
func CreateJournalEntry(c *gin.Context) {
	var req CreateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "INVALID_INPUT",
			Message: "The provided journal data is invalid: " + err.Error(),
		})
		return
	}

	entry := models.JournalEntry{
		Content:   req.Content,
		Processed: false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := database.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "DATABASE_ERROR",
			Message: "Failed to create journal entry",
		})
		return
	}

	response := JournalResponse{
		ID:        entry.ID,
		Content:   entry.Content,
		CreatedAt: entry.CreatedAt,
		UpdatedAt: entry.UpdatedAt,
		Processed: entry.Processed,
	}

	c.JSON(http.StatusCreated, response)
}

// GetJournalEntries retrieves all journal entries with pagination
func GetJournalEntries(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	var entries []models.JournalEntry
	var total int64

	// Get total count
	if err := database.DB.Model(&models.JournalEntry{}).Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "DATABASE_ERROR",
			Message: "Failed to count journal entries",
		})
		return
	}

	// Get paginated entries, ordered by most recent first
	if err := database.DB.Order("created_at DESC").Limit(limit).Offset(offset).Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "DATABASE_ERROR",
			Message: "Failed to retrieve journal entries",
		})
		return
	}

	// Convert to response format
	var responseEntries []JournalResponse
	for _, entry := range entries {
		responseEntries = append(responseEntries, JournalResponse{
			ID:        entry.ID,
			Content:   entry.Content,
			CreatedAt: entry.CreatedAt,
			UpdatedAt: entry.UpdatedAt,
			Processed: entry.Processed,
		})
	}

	response := PaginatedJournalResponse{
		Entries: responseEntries,
		Total:   total,
		Page:    page,
		Limit:   limit,
	}

	c.JSON(http.StatusOK, response)
}

// GetJournalEntry retrieves a specific journal entry by ID
func GetJournalEntry(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "INVALID_ID",
			Message: "Invalid journal entry ID",
		})
		return
	}

	var entry models.JournalEntry
	if err := database.DB.First(&entry, uint(id)).Error; err != nil {
		if err.Error() == "record not found" {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "NOT_FOUND",
				Message: "Journal entry not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "DATABASE_ERROR",
			Message: "Failed to retrieve journal entry",
		})
		return
	}

	response := JournalResponse{
		ID:        entry.ID,
		Content:   entry.Content,
		CreatedAt: entry.CreatedAt,
		UpdatedAt: entry.UpdatedAt,
		Processed: entry.Processed,
	}

	c.JSON(http.StatusOK, response)
}

// UpdateJournalEntry updates a journal entry
func UpdateJournalEntry(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "INVALID_ID",
			Message: "Invalid journal entry ID",
		})
		return
	}

	var req UpdateJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "INVALID_INPUT",
			Message: "The provided update data is invalid: " + err.Error(),
		})
		return
	}

	var entry models.JournalEntry
	if err := database.DB.First(&entry, uint(id)).Error; err != nil {
		if err.Error() == "record not found" {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "NOT_FOUND",
				Message: "Journal entry not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "DATABASE_ERROR",
			Message: "Failed to find journal entry",
		})
		return
	}

	// Update only provided fields
	updates := make(map[string]interface{})
	if req.Content != "" {
		updates["content"] = req.Content
	}
	updates["processed"] = req.Processed
	updates["updated_at"] = time.Now()

	if err := database.DB.Model(&entry).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "DATABASE_ERROR",
			Message: "Failed to update journal entry",
		})
		return
	}

	// Fetch updated entry
	if err := database.DB.First(&entry, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "DATABASE_ERROR",
			Message: "Failed to retrieve updated journal entry",
		})
		return
	}

	response := JournalResponse{
		ID:        entry.ID,
		Content:   entry.Content,
		CreatedAt: entry.CreatedAt,
		UpdatedAt: entry.UpdatedAt,
		Processed: entry.Processed,
	}

	c.JSON(http.StatusOK, response)
}

// DeleteJournalEntry deletes a journal entry
func DeleteJournalEntry(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "INVALID_ID",
			Message: "Invalid journal entry ID",
		})
		return
	}

	var entry models.JournalEntry
	if err := database.DB.First(&entry, uint(id)).Error; err != nil {
		if err.Error() == "record not found" {
			c.JSON(http.StatusNotFound, ErrorResponse{
				Error:   "NOT_FOUND",
				Message: "Journal entry not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "DATABASE_ERROR",
			Message: "Failed to find journal entry",
		})
		return
	}

	if err := database.DB.Delete(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error:   "DATABASE_ERROR",
			Message: "Failed to delete journal entry",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Journal entry deleted successfully"})
}
