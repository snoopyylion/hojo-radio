# Enhanced Notification System

## Overview

This enhanced notification system provides a comprehensive solution for managing user notifications and activity tracking across the NewsHojo platform. It supports real-time notifications, user activity feeds, and intelligent notification grouping.

## Features

### 🎯 Core Features
- **Real-time notifications** via WebSocket
- **User activity tracking** for dashboard display
- **Smart notification grouping** to reduce clutter
- **Comprehensive notification types** (follow, like, comment, message, login, etc.)
- **Notification preferences** and filtering
- **Priority-based notifications** (low, medium, high, urgent)
- **Action buttons** for direct navigation
- **Browser notifications** support
- **Sound notifications** with customizable sounds

### 📱 Notification Types

#### Social Notifications
- `follow` - New follower
- `unfollow` - User unfollowed
- `like` - Post liked
- `unlike` - Post unliked
- `comment` - New comment on post
- `comment_reply` - Reply to comment
- `mention` - User mentioned in post/comment

#### Messaging Notifications
- `message` - New direct message
- `typing` - User typing indicator

#### Content Notifications
- `post_published` - Post published
- `post_approved` - Post approved by admin
- `post_rejected` - Post rejected with reason
- `bookmark` - Post bookmarked
- `share` - Post shared

#### System Notifications
- `login` - New login detected
- `login_alert` - Suspicious login activity
- `profile_update` - Profile updated
- `system_alert` - System-wide alerts
- `welcome` - Welcome message

#### Achievement Notifications
- `achievement` - Achievement unlocked
- `milestone` - Milestone reached

### 🎨 User Activity Types

#### Content Activities
- `post_created` - User created a post
- `post_liked` - User liked a post
- `post_commented` - User commented on a post
- `post_shared` - User shared a post
- `post_bookmarked` - User bookmarked a post

#### Social Activities
- `user_followed` - User followed someone
- `user_unfollowed` - User unfollowed someone
- `comment_liked` - User liked a comment
- `comment_replied` - User replied to a comment

#### System Activities
- `profile_updated` - User updated profile
- `login` - User logged in
- `achievement_earned` - User earned achievement
- `milestone_reached` - User reached milestone
- `verification_submitted` - User submitted verification
- `verification_approved` - User's verification approved

## Architecture

### Components

#### 1. Notification Service (`lib/notificationService.ts`)
- Singleton service for managing notifications
- WebSocket connection management
- Notification creation and management
- User activity tracking

#### 2. Enhanced Notification Context (`context/EnhancedGlobalNotificationsContext.tsx`)
- Global state management for notifications
- Real-time WebSocket integration
- Notification preferences
- Browser notification handling

#### 3. Enhanced Notification List (`components/EnhancedNotificationList.tsx`)
- Grouped notification display
- Advanced filtering and sorting
- Action buttons and navigation
- Responsive design

#### 4. User Activity Feed (`components/Dashboard/UserActivityFeed.tsx`)
- Comprehensive activity display
- Category and type filtering
- Infinite scrolling
- Activity tracking integration

#### 5. Notification Hooks (`hooks/useUserActivity.ts`)
- Custom hooks for activity management
- Specialized hooks for different activity types
- Activity tracking utilities

### API Endpoints

#### Notifications
- `GET /api/notifications` - Fetch user notifications
- `POST /api/notifications` - Create new notification
- `PATCH /api/notifications/[id]/read` - Mark notification as read
- `DELETE /api/notifications/[id]` - Delete notification
- `GET /api/notifications/grouped` - Fetch grouped notifications

#### User Activity
- `GET /api/user-activity` - Fetch user activity feed
- `POST /api/user-activity` - Create user activity
- `DELETE /api/user-activity` - Delete user activities

## Usage

### Basic Notification Creation

```typescript
import { notificationService } from '@/lib/notificationService';

// Create a follow notification
await notificationService.createFollowNotification(
  followerId,
  followedId,
  followerName
);

// Create a like notification
await notificationService.createLikeNotification(
  likerId,
  postOwnerId,
  likerName,
  postId,
  postTitle
);

// Create a message notification
await notificationService.createMessageNotification(
  senderId,
  receiverId,
  senderName,
  conversationId,
  messageContent,
  messageId
);
```

### User Activity Tracking

```typescript
import { useActivityTracker } from '@/hooks/useUserActivity';

const { trackPostCreated, trackUserFollowed, trackLogin } = useActivityTracker();

// Track post creation
await trackPostCreated(userId, postId, postTitle);

// Track user follow
await trackUserFollowed(userId, followedUserId, followedUserName);

// Track login
await trackLogin(userId, deviceInfo, location);
```

### Using the Activity Feed Component

```typescript
import { UserActivityFeed } from '@/components/Dashboard/UserActivityFeed';

<UserActivityFeed 
  userId={userProfile.id}
  limit={20}
  showFilters={true}
  className="custom-styles"
/>
```

### Using the Enhanced Notification List

```typescript
import { EnhancedNotificationList } from '@/components/EnhancedNotificationList';

<EnhancedNotificationList 
  showFilters={true}
  showActions={true}
  maxHeight="max-h-96"
/>
```

## Database Schema

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  category TEXT,
  group_id TEXT,
  action_url TEXT,
  action_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);
```

### User Activities Table
```sql
CREATE TABLE user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB,
  visibility TEXT DEFAULT 'public',
  category TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Notification Preferences Table
```sql
CREATE TABLE notification_preferences (
  user_id TEXT PRIMARY KEY,
  email_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  categories JSONB DEFAULT '{}',
  types JSONB DEFAULT '{}',
  quiet_hours JSONB DEFAULT '{}',
  frequency TEXT DEFAULT 'immediate',
  batch_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Configuration

### Environment Variables
```env
# WebSocket Server
NEXT_PUBLIC_WS_URL=ws://localhost:4001

# Frontend API URL (for WebSocket server)
FRONTEND_API_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Notification Settings
```typescript
const defaultNotificationSettings = {
  soundEnabled: true,
  browserNotificationsEnabled: true,
  inAppNotificationsEnabled: true,
  showTypingNotifications: true,
  emailNotifications: true,
  notificationTypes: {
    message: true,
    typing: true,
    follow: true,
    like: true,
    comment: true,
    post_published: true,
    mention: true,
    application_approved: true,
    application_rejected: true,
  },
  followedEntities: {
    users: [],
    tags: [],
    conversations: [],
  },
};
```

## Best Practices

### 1. Notification Creation
- Always include relevant data for navigation
- Use appropriate priority levels
- Provide action URLs when possible
- Keep messages concise but informative

### 2. Activity Tracking
- Track meaningful user actions
- Use appropriate visibility levels
- Include relevant metadata
- Don't over-track trivial actions

### 3. Performance
- Use pagination for large lists
- Implement proper caching
- Optimize WebSocket connections
- Clean up old notifications periodically

### 4. User Experience
- Group related notifications
- Provide clear action buttons
- Allow users to customize preferences
- Respect quiet hours settings

## Integration Examples

### Follow System Integration
```typescript
// In follow API endpoint
await notificationService.createFollowNotification(
  followerId,
  followedId,
  followerName
);

// Track activity
await trackUserFollowed(followerId, followedId, followedUserName);
```

### Post Like Integration
```typescript
// In like API endpoint
await notificationService.createLikeNotification(
  likerId,
  postOwnerId,
  likerName,
  postId,
  postTitle
);

// Track activity
await trackPostLiked(likerId, postId, postTitle);
```

### Message System Integration
```typescript
// In message API endpoint
await notificationService.createMessageNotification(
  senderId,
  receiverId,
  senderName,
  conversationId,
  messageContent,
  messageId
);
```

### Login Tracking
```typescript
// In authentication middleware
await notificationService.createLoginNotification(
  userId,
  deviceInfo,
  location,
  ipAddress
);

// Track activity
await trackLogin(userId, deviceInfo, location);
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check WebSocket server is running
   - Verify environment variables
   - Check network connectivity

2. **Notifications Not Appearing**
   - Verify notification preferences
   - Check user permissions
   - Validate notification data

3. **Activity Feed Empty**
   - Ensure activity tracking is enabled
   - Check database permissions
   - Verify activity creation

4. **Performance Issues**
   - Implement pagination
   - Add database indexes
   - Optimize queries

### Debug Mode
Enable debug logging by setting:
```typescript
localStorage.setItem('notificationDebug', 'true');
```

## Future Enhancements

1. **Push Notifications** - Mobile push notification support
2. **Email Notifications** - Email digest functionality
3. **Advanced Filtering** - More sophisticated filtering options
4. **Notification Analytics** - Usage analytics and insights
5. **Custom Notification Templates** - User-defined notification styles
6. **Notification Scheduling** - Scheduled notification delivery
7. **Multi-language Support** - Internationalization support
8. **Notification Channels** - Multiple notification delivery channels

## Contributing

When contributing to the notification system:

1. Follow the existing code structure
2. Add proper TypeScript types
3. Include error handling
4. Write tests for new features
5. Update documentation
6. Follow the established naming conventions

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check existing GitHub issues
4. Create a new issue with detailed information 