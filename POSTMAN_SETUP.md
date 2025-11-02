# Postman Collection Setup Guide

This guide helps you test the 0G Route API endpoints using Postman.

## 📥 Import Collection

### Option 1: Direct Import (Recommended)

1. **Open Postman** (download from [postman.com](https://www.postman.com/downloads/) if needed)

2. **Click Import** (top-left corner)

3. **Select "File"** tab

4. **Choose** `postman_collection.json` from the project root

5. **Click Import** - Collection will be added to your workspace

### Option 2: Via URL

1. In Postman, click **Import**
2. Paste this URL:
   ```
   https://raw.githubusercontent.com/yourrepo/0g-route/main/postman_collection.json
   ```
3. Click **Import**

---

## 🚀 Getting Started

### 1. Verify API is Running

```bash
# Start the app
npm run dev:full

# API should be running at http://localhost:4000
```

### 2. Test Health Endpoint

In Postman:
1. Go to **Health Check** folder
2. Click **Send**
3. You should see `{"ok": true}`

### 3. Run First Query

In Postman:
1. Go to **Traffic** → **Get Traffic Conditions**
2. Click **Send**
3. You should get a response with traffic data

---

## 📂 Collection Structure

```
0G Route - Traffic API v1
├── Traffic
│   ├── Get Traffic Conditions
│   ├── Get Traffic Predictions
│   ├── Get Traffic Hotspots
│   └── Update Traffic Cache
├── Routes
│   ├── Analyze Route
│   └── Get Route Alternatives
├── Locations
│   └── Search Locations
├── Directions
│   └── Get Directions
└── Health Check
```

---

## 🎯 Testing Each Endpoint

### Traffic Endpoints

#### Get Traffic Conditions
- **Method:** GET
- **Params:** `lat`, `lng`, `radius` (optional)
- **Example:** `lat=6.5244&lng=3.3792&radius=5`
- **Response:** Array of traffic conditions

#### Get Traffic Predictions
- **Method:** GET
- **Params:** `lat`, `lng`, `horizon` (optional)
- **Example:** `lat=6.5244&lng=3.3792&horizon=3h`
- **Response:** Traffic forecast for next N hours

#### Get Traffic Hotspots
- **Method:** GET
- **Params:** `lat` (optional), `lng` (optional), `radius` (optional)
- **Response:** Chronic problem areas

#### Update Traffic Cache
- **Method:** POST
- **Body:** JSON with conditions array
- **Response:** `{ok: true, cached: N}`

### Route Endpoints

#### Analyze Route
- **Method:** POST
- **Body:**
  ```json
  {
    "origin": {"lat": 6.5245, "lng": 3.3792},
    "destination": "Lekki Phase 1, Lagos",
    "options": {"provideAlternatives": true}
  }
  ```
- **Response:** Main route + alternatives with traffic impact

#### Get Route Alternatives
- **Method:** GET
- **Params:** `origin`, `destination`, `avoidTolls`, `avoidHighways`
- **Response:** Faster route options

### Location Endpoint

#### Search Locations
- **Method:** GET
- **Params:** `q` (required), `lat`, `lng`, `radius`
- **Example:** `q=Lekki Phase 1&lat=6.5&lng=3.4`
- **Response:** Array of locations matching query

### Direction Endpoint

#### Get Directions
- **Method:** POST
- **Body:**
  ```json
  {
    "origin": {"lat": 6.5245, "lng": 3.3792},
    "destination": "Lekki Phase 1, Lagos"
  }
  ```
- **Response:** Turn-by-turn directions with traffic

---

## 💡 Tips & Tricks

### Using Variables

In Postman, the collection includes variables:
- `{{base_url}}` - http://localhost:4000/api/v1
- `{{latitude}}` - 6.5244
- `{{longitude}}` - 3.3792

**To use variables**, edit them in:
Collection → Variables tab

### Customize Locations

Edit the request parameters to test with your own coordinates:

1. Click on any request
2. Go to the **Params** tab
3. Change `lat` and `lng` values
4. Click **Send**

### Save Responses

Postman automatically saves responses. To export:
1. Right-click on request
2. Select **Save Response**
3. Choose format (JSON, HTML, etc.)

### Create Test Cases

Add tests to validate responses:

1. Click on request
2. Go to **Tests** tab
3. Add JavaScript:
   ```javascript
   pm.test("Status is 200", function() {
     pm.response.to.have.status(200);
   });

   pm.test("Response has success=true", function() {
     var jsonData = pm.response.json();
     pm.expect(jsonData.success).to.equal(true);
   });
   ```

### Create Requests from Scratch

If you want to add more requests:

1. Click **+** to create new request
2. Enter URL: `http://localhost:4000/api/v1/traffic/conditions`
3. Select **GET** method
4. Add query params:
   - Key: `lat`, Value: `6.5`
   - Key: `lng`, Value: `3.4`
5. Click **Send**

---

## 🔍 Understanding Responses

### Success Response (200 OK)

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:24.373Z",
  "data": { /* actual data */ },
  "meta": {
    "version": "1.0",
    "source": "google_maps"
  }
}
```

### Error Response (400/500)

```json
{
  "error": "Error description",
  "timestamp": "2025-11-02T01:04:24.373Z"
}
```

### Response Fields

| Field | Meaning |
|-------|---------|
| `success` | Whether request succeeded |
| `timestamp` | When response was generated |
| `data` | Actual response data |
| `meta` | Metadata (version, source, etc.) |
| `error` | Error message (if failed) |

---

## 🐛 Troubleshooting

### "Cannot GET /api/v1/..."

**Problem:** API endpoint not found
**Solution:** Make sure API is running with `npm run dev:full`

### "Connection refused"

**Problem:** API server not running
**Solution:**
```bash
npm run dev:full
# Check that server starts on port 4000
```

### Empty data arrays

**Problem:** No traffic data in cache
**Solution:** Use the **Update Traffic Cache** endpoint first with sample data

### CORS errors

**Problem:** "Access to XMLHttpRequest blocked by CORS"
**Solution:** API has CORS enabled by default. Check browser console for details.

### "Missing required parameters"

**Problem:** 400 Bad Request
**Solution:**
- Check that all required params are included
- For GET: Use query params (?lat=6.5&lng=3.4)
- For POST: Use JSON body with proper format

---

## 📊 Example Workflow

### Complete Test Scenario

1. **Health Check** - Verify API is running
   - GET `/health`
   - Expected: `{"ok": true}`

2. **Search Location** - Find a destination
   - GET `/locations/search?q=Lekki`
   - Note the coordinates

3. **Get Traffic Conditions** - Check current traffic
   - GET `/traffic/conditions?lat=6.5&lng=3.4`
   - View any active traffic

4. **Analyze Route** - Plan best route
   - POST `/routes/analyze`
   - Compare main route vs alternatives

5. **Get Predictions** - Check future traffic
   - GET `/traffic/predictions?lat=6.5&lng=3.4&horizon=3h`
   - See predicted congestion

6. **Get Directions** - Get turn-by-turn
   - POST `/directions`
   - View detailed steps

---

## 📚 Additional Resources

- **Full API Docs:** `API_DOCUMENTATION.md`
- **Quick Reference:** `API_QUICK_REFERENCE.md`
- **Source Code:** `server/index.js`

---

## 🎓 Learning Resources

### Postman Basics
- [Official Postman Docs](https://learning.postman.com/)
- [Getting Started Guide](https://www.postman.com/postman/postman-getting-started/)

### API Testing
- [REST API Best Practices](https://restfulapi.net/)
- [HTTP Status Codes](https://httpwg.org/specs/rfc7231.html#status.codes)

### Our Stack
- **Server:** Node.js + Express
- **API Style:** RESTful JSON
- **Data Source:** Google Maps API
- **Format:** JSON

---

## 💬 Support

**Having issues?**
1. Check the error message in Postman response
2. Review the full docs: `API_DOCUMENTATION.md`
3. Verify API is running: `npm run dev:full`
4. Check server logs for detailed errors

---

## 🎯 Quick Commands

```bash
# Start the full app
npm run dev:full

# Start only the API server
npm run server

# Start only the frontend
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

---

**Version:** 1.0
**Last Updated:** 2025-11-02
**Author:** 0G Route Team
