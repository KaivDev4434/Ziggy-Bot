package main

import (
	"log"
	"net/http"

	"ziggy/database"
	"ziggy/handlers"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize database
	err := database.InitDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDB()

	r := gin.Default()
	r.Use(cors.Default())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api")
	{
		// Journal endpoints
		api.POST("/journal", handlers.CreateJournalEntry)
		api.GET("/journal", handlers.GetJournalEntries)
		api.GET("/journal/:id", handlers.GetJournalEntry)
		api.PUT("/journal/:id", handlers.UpdateJournalEntry)
		api.DELETE("/journal/:id", handlers.DeleteJournalEntry)
	}

	log.Println("Server starting on port 8080...")
	r.Run(":8080")
}
