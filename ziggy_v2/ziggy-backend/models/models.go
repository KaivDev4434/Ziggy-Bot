package models

import (
	"time"
)

// JournalEntry stores daily journal inputs
type JournalEntry struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Processed bool      `gorm:"default:false" json:"processed"` // whether AI has processed this entry
}

// Task represents a GTD-compliant task model
type Task struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	Title       string     `gorm:"not null" json:"title"`
	Description string     `gorm:"type:text" json:"description"`
	Status      string     `gorm:"default:'inbox'" json:"status"` // inbox, next_action, waiting, someday_maybe, done
	Priority    int        `gorm:"default:2" json:"priority"`     // 1=high, 2=medium, 3=low
	Context     string     `json:"context"`                       // @home, @office, @errands
	ProjectName string     `json:"project_name"`                  // project this task belongs to
	DoDate      *time.Time `json:"do_date"`                       // when to start
	DueDate     *time.Time `json:"due_date"`                      // when it's due
	Energy      string     `json:"energy"`                        // high, medium, low
	Tags        string     `json:"tags"`                          // comma-separated tags
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	CompletedAt *time.Time `json:"completed_at"`
}

// List represents a flexible list system (movies, books, grocery)
type List struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	Name      string     `gorm:"not null" json:"name"`
	Type      string     `gorm:"not null" json:"type"` // movies, books, grocery, custom
	CreatedAt time.Time  `json:"created_at"`
	Items     []ListItem `gorm:"foreignKey:ListID" json:"items"`
}

// ListItem represents items within lists
type ListItem struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ListID    uint      `gorm:"not null" json:"list_id"`
	Content   string    `gorm:"not null" json:"content"`
	Metadata  string    `gorm:"type:json" json:"metadata"` // flexible JSON storage
	Completed bool      `gorm:"default:false" json:"completed"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Category represents task categorization
type Category struct {
	ID          uint   `gorm:"primaryKey" json:"id"`
	Name        string `gorm:"unique;not null" json:"name"`
	Description string `json:"description"`
	Color       string `gorm:"default:'#3B82F6'" json:"color"` // hex color for UI
}

// Habit represents habits for tracking
type Habit struct {
	ID          uint          `gorm:"primaryKey" json:"id"`
	Name        string        `gorm:"not null" json:"name"`
	Description string        `json:"description"`
	Frequency   string        `gorm:"default:'daily'" json:"frequency"` // daily, weekly, monthly
	Target      int           `gorm:"default:1" json:"target"`          // target completions
	Active      bool          `gorm:"default:true" json:"active"`
	CreatedAt   time.Time     `json:"created_at"`
	Records     []HabitRecord `gorm:"foreignKey:HabitID" json:"records"`
}

// HabitRecord represents daily habit completions
type HabitRecord struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	HabitID   uint      `gorm:"not null" json:"habit_id"`
	Date      time.Time `gorm:"not null" json:"date"`
	Completed bool      `gorm:"default:false" json:"completed"`
	Notes     string    `json:"notes"`
}
