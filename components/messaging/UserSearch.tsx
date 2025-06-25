// components/search/UserSearch.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Search, X } from 'lucide-react';
import { User } from '@/types/messaging';

interface UserSearchProps {
  onSelectUser: (user: User) => void;
  excludeUserIds?: string[];
  excludeCurrentUser?: boolean;
  placeholder?: string;
  className?: string;
  multiple?: boolean;
  selectedUsers?: User[];
  onSelectedUsersChange?: (users: User[]) => void;
  currentUserId?: string;
  keepResultsOpen?: boolean;
  clearOnSelect?: boolean;
}

export interface UserSearchHandle {
  closeResults: () => void;
  focus: () => void;
}

export const UserSearch = forwardRef<UserSearchHandle, UserSearchProps>(({
  onSelectUser,
  excludeUserIds = [],
  placeholder = "Search users...",
  className = "",
  multiple = false,
  selectedUsers = [],
  onSelectedUsersChange,
  currentUserId,
  keepResultsOpen = false,
  clearOnSelect = true,
}, ref) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Add a ref to track the current search request
  const searchAbortController = useRef<AbortController | null>(null);

  // Memoize selected user IDs to prevent unnecessary re-renders
  const selectedUserIds = useMemo(() => 
    selectedUsers.map(user => user.id), 
    [selectedUsers]
  );

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper function to get database ID (same as SearchComponent)
  const getDatabaseId = (result: any): string => {
    console.log('🔍 Getting database ID for result:', {
      id: result.id,
      type: result.type,
      databaseId: result.databaseId,
      originalId: result.originalId
    });

    // Priority order: databaseId > originalId > cleaned id
    if (result.databaseId) {
      console.log('✅ Using databaseId:', result.databaseId);
      return result.databaseId;
    }

    if (result.originalId) {
      console.log('✅ Using originalId:', result.originalId);
      return result.originalId;
    }

    // Clean the ID by removing common prefixes if they exist
    const cleanUserId = (userId: string): string => {
      // Remove common prefixes that might be added by your search API
      const prefixes = ['supabase_user_', 'user_', 'sanity_user_'];
      
      for (const prefix of prefixes) {
        if (userId.startsWith(prefix)) {
          return userId.replace(prefix, '');
        }
      }
      
      return userId;
    };

    const cleanId = cleanUserId(result.id);
    console.log('✅ Final database ID:', cleanId);
    return cleanId;
  };

  // Search users function - updated to fetch all users like SearchComponent
  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setUsers([]);
      return;
    }

    // Cancel previous search if still running
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }

    // Create new abort controller for this search
    searchAbortController.current = new AbortController();
    const signal = searchAbortController.current.signal;

    setLoading(true);
    try {
      console.log('🔍 Searching users:', { query: searchQuery });

      // Build API URL - same as SearchComponent but without type filter to get all results
      const apiUrl = new URL('/api/search', window.location.origin);
      apiUrl.searchParams.set('q', searchQuery);
      apiUrl.searchParams.set('limit', '20'); // Limit for user search

      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal, // Add abort signal
      });

      // Check if request was aborted
      if (signal.aborted) {
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ User search API response:', data);

      // Extract ALL users from the response (both users and authors)
      let foundUsers: User[] = [];
      
      // Combine users and authors from categories
      if (data.categories) {
        // Add regular users
        if (data.categories.users) {
          foundUsers = [...foundUsers, ...data.categories.users];
        }
        
        // Add authors (Sanity authors)
        if (data.categories.authors) {
          foundUsers = [...foundUsers, ...data.categories.authors];
        }
      } 
      
      // Fallback: filter from general results
      if (foundUsers.length === 0 && data.results) {
        foundUsers = data.results.filter((result: any) => 
          result.type === 'user' || result.type === 'author'
        );
      }

      console.log('📋 Raw found users:', foundUsers);

      // Build excluded IDs at search time to avoid dependency issues
      const excludedIds = [...excludeUserIds];
      if (currentUserId) {
        excludedIds.push(currentUserId);
      }
      if (multiple) {
        excludedIds.push(...selectedUserIds);
      }

      // Transform search results to User format
      const transformedUsers: User[] = foundUsers
        .map((result: any) => {
          // Use the same ID resolution logic as SearchComponent
          const userId = getDatabaseId(result);
          
          return {
            id: userId,
            username: result.title || result.username || `user_${userId}`,
            firstName: result.firstName || result.title?.split(' ')[0] || '',
            lastName: result.lastName || result.title?.split(' ')[1] || '',
            email: result.email || result.subtitle || '',
            imageUrl: result.image || result.imageUrl,
            // Add additional fields that might be useful
            type: result.type, // 'user' or 'author'
            isAuthor: result.type === 'author',
          };
        })
        .filter((user: User) => {
          const isExcluded = excludedIds.includes(user.id);
          console.log('User filter check:', { 
            userId: user.id, 
            username: user.username,
            type: (user as any).type,
            isExcluded,
            excludedIds 
          });
          return !isExcluded;
        })
        // Remove duplicates based on ID (in case same user appears as both user and author)
        .filter((user, index, self) => 
          self.findIndex(u => u.id === user.id) === index
        );

      console.log('📋 Transformed users:', transformedUsers);
      
      // Only update state if request wasn't aborted
      if (!signal.aborted) {
        setUsers(transformedUsers);
      }

    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🚫 Search request aborted');
        return;
      }
      
      console.error('❌ Error searching users:', error);
      if (!signal.aborted) {
        setUsers([]);
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []); // Remove all dependencies to prevent loops

  // Separate debounced search effect - only depends on query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        searchUsers(query);
      } else {
        setUsers([]);
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      // Cancel any ongoing search when query changes
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
    };
  }, [query]); // Only depend on query

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
    };
  }, []);

  const handleUserSelect = (user: User) => {
    console.log('👤 User selected:', user);
    
    // Always call the onSelectUser callback
    onSelectUser(user);
    
    if (multiple && onSelectedUsersChange) {
      const newSelectedUsers = [...selectedUsers, user];
      onSelectedUsersChange(newSelectedUsers);
      
      // For multiple mode, always clear query and results
      if (clearOnSelect) {
        setQuery('');
        setUsers([]);
      }
    } else {
      // For single select mode, respect the keepResultsOpen prop
      if (clearOnSelect) {
        setQuery('');
      }
      
      if (!keepResultsOpen) {
        setUsers([]);
        setIsOpen(false);
      }
    }
  };

  const handleRemoveSelectedUser = (userId: string) => {
    if (multiple && onSelectedUsersChange) {
      const newSelectedUsers = selectedUsers.filter(user => user.id !== userId);
      onSelectedUsersChange(newSelectedUsers);
    }
  };

  // Function to manually close results (can be called from parent)
  const closeResults = useCallback(() => {
    setIsOpen(false);
    setUsers([]);
    setQuery('');
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
  }, []);

  // Focus function
  const focus = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    closeResults,
    focus,
  }), [closeResults, focus]);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Selected Users Pills (for multiple mode) */}
      {multiple && selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              {user.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={user.username}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-300 flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-800">
                    {(user.firstName?.[0] || user.username[0]).toUpperCase()}
                  </span>
                </div>
              )}
              <span>
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.username
                }
              </span>
              {/* Show author badge if this is a Sanity author */}
              {(user as any).isAuthor && (
                <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                  Author
                </span>
              )}
              <button
                onClick={() => handleRemoveSelectedUser(user.id)}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                type="button"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (query.length >= 2 || users.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Searching users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {query.length < 2 ? 'Type at least 2 characters to search' : 'No users found'}
            </div>
          ) : (
            <>
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  {user.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                      <span className="text-white font-medium">
                        {(user.firstName?.[0] || user.username[0]).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}`
                          : user.username
                        }
                      </p>
                      {/* Show badge for authors */}
                      {(user as any).isAuthor && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                          Author
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      @{user.username}
                    </p>
                    {user.email && (
                      <p className="text-xs text-gray-400 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Optional: Add a close button */}
              {keepResultsOpen && (
                <div className="border-t border-gray-200 p-2">
                  <button
                    onClick={closeResults}
                    className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-1"
                  >
                    Close results
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});