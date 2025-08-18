import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { journalService, CreateJournalEntryRequest, UpdateJournalEntryRequest } from '../services/journalService';
import { JournalEntry } from '../types';

// Query keys for React Query
export const journalKeys = {
  all: ['journal'] as const,
  entries: () => [...journalKeys.all, 'entries'] as const,
  entry: (id: number) => [...journalKeys.all, 'entry', id] as const,
  unprocessed: () => [...journalKeys.all, 'unprocessed'] as const,
};

/**
 * Hook for fetching journal entries with pagination
 */
export const useJournalEntries = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: [...journalKeys.entries(), page, limit],
    queryFn: () => journalService.getEntries(page, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook for fetching a specific journal entry
 */
export const useJournalEntry = (id: number) => {
  return useQuery({
    queryKey: journalKeys.entry(id),
    queryFn: () => journalService.getEntry(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for fetching unprocessed journal entries
 */
export const useUnprocessedEntries = () => {
  return useQuery({
    queryKey: journalKeys.unprocessed(),
    queryFn: () => journalService.getUnprocessedEntries(),
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook for creating journal entries
 */
export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => journalService.createEntry(content),
    onSuccess: (newEntry) => {
      // Invalidate and refetch journal entries
      queryClient.invalidateQueries({ queryKey: journalKeys.entries() });
      queryClient.invalidateQueries({ queryKey: journalKeys.unprocessed() });
      
      // Add the new entry to the cache
      queryClient.setQueryData(journalKeys.entry(newEntry.id), newEntry);
    },
    onError: (error) => {
      console.error('Failed to create journal entry:', error);
    },
  });
};

/**
 * Hook for updating journal entries
 */
export const useUpdateJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdateJournalEntryRequest }) =>
      journalService.updateEntry(id, updates),
    onSuccess: (updatedEntry) => {
      // Update the specific entry in cache
      queryClient.setQueryData(journalKeys.entry(updatedEntry.id), updatedEntry);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: journalKeys.entries() });
      queryClient.invalidateQueries({ queryKey: journalKeys.unprocessed() });
    },
    onError: (error) => {
      console.error('Failed to update journal entry:', error);
    },
  });
};

/**
 * Hook for deleting journal entries
 */
export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => journalService.deleteEntry(id),
    onSuccess: (_, deletedId) => {
      // Remove the entry from cache
      queryClient.removeQueries({ queryKey: journalKeys.entry(deletedId) });
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: journalKeys.entries() });
      queryClient.invalidateQueries({ queryKey: journalKeys.unprocessed() });
    },
    onError: (error) => {
      console.error('Failed to delete journal entry:', error);
    },
  });
};

/**
 * Combined hook for journal operations
 */
export const useJournal = () => {
  const createEntry = useCreateJournalEntry();
  const updateEntry = useUpdateJournalEntry();
  const deleteEntry = useDeleteJournalEntry();

  return {
    // Mutations
    createEntry: createEntry.mutate,
    updateEntry: updateEntry.mutate,
    deleteEntry: deleteEntry.mutate,
    
    // States
    isCreating: createEntry.isPending,
    isUpdating: updateEntry.isPending,
    isDeleting: deleteEntry.isPending,
    
    // Errors
    createError: createEntry.error,
    updateError: updateEntry.error,
    deleteError: deleteEntry.error,
  };
};
