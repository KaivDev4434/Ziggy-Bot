import { apiClient } from './api';
import { JournalEntry } from '../types';

export interface CreateJournalEntryRequest {
  content: string;
}

export interface UpdateJournalEntryRequest {
  content?: string;
  processed?: boolean;
}

export interface PaginatedJournalResponse {
  entries: JournalEntry[];
  total: number;
  page: number;
  limit: number;
}

class JournalService {
  /**
   * Create a new journal entry
   */
  async createEntry(content: string): Promise<JournalEntry> {
    const response = await apiClient.post<JournalEntry>('/journal', {
      content,
    });
    return response.data;
  }

  /**
   * Get all journal entries with pagination
   */
  async getEntries(page: number = 1, limit: number = 20): Promise<PaginatedJournalResponse> {
    const response = await apiClient.get<PaginatedJournalResponse>('/journal', {
      params: { page, limit },
    });
    return response.data;
  }

  /**
   * Get a specific journal entry by ID
   */
  async getEntry(id: number): Promise<JournalEntry> {
    const response = await apiClient.get<JournalEntry>(`/journal/${id}`);
    return response.data;
  }

  /**
   * Update a journal entry
   */
  async updateEntry(id: number, updates: UpdateJournalEntryRequest): Promise<JournalEntry> {
    const response = await apiClient.put<JournalEntry>(`/journal/${id}`, updates);
    return response.data;
  }

  /**
   * Delete a journal entry
   */
  async deleteEntry(id: number): Promise<void> {
    await apiClient.delete(`/journal/${id}`);
  }

  /**
   * Get recent unprocessed entries
   */
  async getUnprocessedEntries(): Promise<JournalEntry[]> {
    const response = await this.getEntries(1, 50);
    return response.entries.filter(entry => !entry.processed);
  }
}

// Export a singleton instance
export const journalService = new JournalService();
export default journalService;
