# Groups System - Testing & Development Guide

## Quick Start

### Prerequisites
- Node.js installed
- MongoDB running
- Both servers started:
  - Backend: `cd server && npm start` (port 5000)
  - Frontend: `cd client && npm run dev` (port 5174)

### System Status
✅ Backend: http://localhost:5000  
✅ Frontend: http://localhost:5174  
✅ Both servers are running and communicating

---

## Frontend Testing

### Access Groups Page
1. Go to http://localhost:5174/groups (must be logged in)
2. Should see:
   - "Trek Groups" heading
   - 3 tabs: Browse Groups, My Groups, Suggested Friends
   - "Create Group" button

### Test: Browse Groups
1. **Load groups:** Page should load and display available groups
2. **Search:** Type in search box, groups should filter in real-time
3. **Join group:** Click "Join" button on any group
   - Should redirect to /messages/{conversationId}
   - Group should appear in "My Groups" tab

### Test: Create Group
1. Click "Create Group" button
2. Modal should open with form
3. Fill in fields:
   - **Group Name:** "Test Trek 2026"
   - **Select Trail:** Choose from dropdown (loaded from /api/trails)
   - **Description:** "Testing the new system"
   - **Trek Date:** Select future date
   - **Max Members:** 8
   - **Difficulty:** Moderate
4. Click "Create Group"
5. Should redirect to group chat
6. Group should appear in "My Groups"

### Test: Suggested Friends
1. Click "Suggested Friends" tab
2. Should load list of users (real users from database)
3. Click "Connect" on any user
4. Should redirect to direct conversation with that user

### Test: My Groups
1. Groups you created or joined should be listed
2. Click group to view details
3. Should show members, creator info, trek date, difficulty

---

## Backend Testing

### Test Endpoint: Create Group
```bash
curl -X POST http://localhost:5000/api/groups/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Annapurna Circuit 2026",
    "description": "21-day trek around Annapurna Massif",
    "trailName": "Annapurna Circuit",
    "trailId": "TRAIL_ID_FROM_TRAILS",
    "trekDate": "2026-10-01",
    "difficulty": "Moderate",
    "maxMembers": 12,
    "tags": ["Nepal", "Mountains"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Group created successfully",
  "group": {
    "_id": "NEW_GROUP_ID",
    "name": "Annapurna Circuit 2026",
    "memberCount": 1,
    "creator": {
      "name": "Your Name",
      "_id": "YOUR_USER_ID"
    },
    "conversationId": "CREATED_CONVERSATION_ID",
    "status": "active"
  }
}
```

### Test Endpoint: List Groups
```bash
curl -X GET "http://localhost:5000/api/groups/?limit=10&page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns array of groups with pagination info

### Test Endpoint: Search Groups
```bash
curl -X GET "http://localhost:5000/api/groups/search?search=Annapurna" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns groups matching search term

### Test Endpoint: Join Group
```bash
curl -X POST http://localhost:5000/api/groups/GROUP_ID/join \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Joined group successfully",
  "group": {
    "_id": "GROUP_ID",
    "memberCount": 2,  // Increased from 1
    "members": [
      {
        "userId": "ORIGINAL_MEMBER",
        "joinedAt": "..."
      },
      {
        "userId": "YOUR_USER_ID",
        "joinedAt": "..."  // New entry
      }
    ]
  }
}
```

### Test Endpoint: Get User's Groups
```bash
curl -X GET http://localhost:5000/api/groups/user/my-groups \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns only groups user is member of

### Test Endpoint: Suggested Friends
```bash
curl -X GET "http://localhost:5000/api/users/suggested/friends?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Returns 5 random users (placeholder for recommendation engine)

---

## Data Flow Tests

### Scenario 1: Create Group → Auto-Chat Integration
**What should happen:**
1. User creates group via modal
2. Backend creates Group document
3. Backend creates Conversation document with isGroup=true
4. Backend adds creator to both group members and conversation participants
5. Returns group with conversationId
6. Frontend redirects to /messages/{conversationId}
7. User sees group chat message input

**How to verify:**
- Create group through UI
- Check you're redirected to messages page
- Verify conversation is in your conversation list
- Check conversation has multiple participants

### Scenario 2: Join Group → Auto-Chat Addition
**What should happen:**
1. User finds group and clicks Join
2. Backend adds user to group members
3. Backend adds user to group conversation participants
4. Returns updated group
5. Frontend redirects to group chat

**How to verify:**
- Create group with User A
- Login as User B
- Browse groups and join User A's group
- Redirect to group chat
- User B can see existing messages
- User B appears in member list

### Scenario 3: Direct Message Integration
**What should happen:**
1. User clicks "Connect" on friend card
2. Frontend calls POST /api/chat/conversations with recipientId
3. Backend creates or fetches direct conversation
4. Frontend redirects to /messages/{conversationId}
5. Direct 1-on-1 chat opens

**How to verify:**
- Navigate to Suggested Friends tab
- Click Connect on any user
- Redirect to messages page
- Conversation should be direct (2 participants)
- Can send messages to that user

---

## Debugging

### Check Server Logs
```bash
# Terminal 1: Server
cd server
npm start
# Watch for "✓ Group routes mounted at /api/groups"
```

### Check Frontend Errors
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors when:
   - Loading groups page
   - Creating group
   - Joining group
   - Connecting with friend

### Check Network Requests
1. Open DevTools → Network tab
2. Clear filter
3. Perform action (create group, join group, etc.)
4. Look for requests:
   - `POST /api/groups/` - Create
   - `GET /api/groups/` - List
   - `POST /api/groups/{id}/join` - Join
   - `GET /api/users/suggested/friends` - Friends

### Common Issues

**Issue: "Group routes not mounted"**
- Check server started successfully
- Check group routes imported in server/index.js
- Restart server

**Issue: "Cannot read property 'conversationId' of undefined"**
- Check group creation returned group object with conversationId
- Verify Conversation model is being created
- Check MongoDB connection

**Issue: "Trails dropdown empty"**
- Verify /api/trails endpoint is returning data
- Check trails data exists in database
- Check fetch call in GroupsPage

**Issue: "Groups not loading in browse tab"**
- Check /api/groups/ endpoint returns data
- Check authentication token is valid
- Check browser console for network errors

---

## Testing Checklist

### ✅ Basic CRUD
- [ ] Create group with valid data
- [ ] Create group with invalid data (shows error)
- [ ] List all groups
- [ ] Search groups by name
- [ ] Search groups by trail
- [ ] Search groups by description
- [ ] Get single group details
- [ ] Join group
- [ ] Join group that's full (error)
- [ ] Join group twice (error)
- [ ] Leave group
- [ ] Delete group (creator only)

### ✅ User Groups
- [ ] User can see groups they created
- [ ] User can see groups they joined
- [ ] User cannot see groups they're not in (browse tab)
- [ ] User count updates correctly
- [ ] isMember flag is correct

### ✅ Messaging Integration
- [ ] Creating group opens group chat
- [ ] Joining group opens group chat
- [ ] Group conversation has correct participants
- [ ] Can send messages in group chat
- [ ] Connecting with friend opens direct chat
- [ ] Direct conversation has 2 participants

### ✅ UI/UX
- [ ] Groups page loads correctly
- [ ] Modal opens/closes properly
- [ ] Form validation works
- [ ] Search is responsive
- [ ] Loading states show correctly
- [ ] Error messages are clear
- [ ] Buttons are accessible

### ✅ Data Integrity
- [ ] Creator is first group member
- [ ] Members list updates when joining
- [ ] Member count is accurate
- [ ] isFull flag correct (memberCount === maxMembers)
- [ ] Group status is 'active'
- [ ] conversationId links properly

---

## Performance Testing

### Load Testing
1. Create multiple groups (10+)
2. Join several groups
3. Search should complete in <500ms
4. Loading state should appear/disappear smoothly

### Pagination Test (if implemented)
```bash
curl "http://localhost:5000/api/groups/?limit=5&page=2" \
  -H "Authorization: Bearer TOKEN"
```

---

## After Recommendation Engine Integration

When you add the recommendation engine:

1. **Update getSuggestedFriends controller:**
   ```javascript
   // Current: Returns random users
   // Future: Call recommendation engine
   const friends = await recommendationEngine.getSuggestedUsers(userId);
   ```

2. **Add new suggested groups endpoint:**
   ```javascript
   GET /api/groups/recommended
   // Returns groups ranked by compatibility
   ```

3. **UI Updates:**
   - Add "Recommended Groups" tab
   - Show "Why we suggest this" badges
   - Add "Skip" button to refine recommendations
   - Store recommendation feedback

---

## Monitoring

### Database State
```javascript
// Check groups created
db.groups.find().pretty()

// Check group members
db.groups.findOne({_id: ObjectId("...")})

// Check conversations linked
db.conversations.findOne({isGroup: true})
```

### API Metrics
- Response time for group creation
- Response time for searches
- Average members per group
- Group creation rate
- Join rate

---

## Next Steps

1. **Test the full flow** - Create account → Create group → Invite friends → Chat
2. **Multi-user testing** - Use 2+ browsers/accounts
3. **Edge cases** - Very long names, special characters, etc.
4. **Performance** - Test with 100+ groups
5. **Recommendation engine** - Integrate and test ranking

---

## Support

For issues or questions:
1. Check logs in both server and browser console
2. Verify API endpoints in API_DOCUMENTATION.md
3. Check curl examples above
4. Verify database connection
5. Restart both servers

