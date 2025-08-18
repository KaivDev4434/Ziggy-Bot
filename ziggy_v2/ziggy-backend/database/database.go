package database

import (
	"log"

	"ziggy/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// InitDatabase initializes the SQLite database connection and performs auto-migration
func InitDatabase() error {
	var err error

	// Connect to SQLite database
	DB, err = gorm.Open(sqlite.Open("ziggy.db"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		return err
	}

	log.Println("Database connection established successfully")

	// Auto-migrate all models
	err = DB.AutoMigrate(
		&models.JournalEntry{},
		&models.Task{},
		&models.List{},
		&models.ListItem{},
		&models.Category{},
		&models.Habit{},
		&models.HabitRecord{},
	)
	if err != nil {
		log.Printf("Failed to migrate database: %v", err)
		return err
	}

	log.Println("Database migration completed successfully")

	// Create some default categories if they don't exist
	err = createDefaultCategories()
	if err != nil {
		log.Printf("Failed to create default categories: %v", err)
		return err
	}

	return nil
}

// createDefaultCategories creates some default categories for task organization
func createDefaultCategories() error {
	defaultCategories := []models.Category{
		{Name: "Personal", Description: "Personal tasks and activities", Color: "#3B82F6"},
		{Name: "Work", Description: "Work-related tasks and projects", Color: "#10B981"},
		{Name: "Health", Description: "Health and fitness related tasks", Color: "#F59E0B"},
		{Name: "Finance", Description: "Financial and money-related tasks", Color: "#EF4444"},
		{Name: "Learning", Description: "Education and skill development", Color: "#8B5CF6"},
		{Name: "Home", Description: "Home maintenance and chores", Color: "#06B6D4"},
	}

	for _, category := range defaultCategories {
		var existingCategory models.Category
		result := DB.Where("name = ?", category.Name).First(&existingCategory)
		if result.Error == gorm.ErrRecordNotFound {
			// Category doesn't exist, create it
			if err := DB.Create(&category).Error; err != nil {
				return err
			}
			log.Printf("Created default category: %s", category.Name)
		}
	}

	return nil
}

// GetDB returns the database instance
func GetDB() *gorm.DB {
	return DB
}

// CloseDB closes the database connection
func CloseDB() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
