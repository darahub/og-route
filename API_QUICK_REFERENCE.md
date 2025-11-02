# 0G Route API - Quick Reference

**Base URL:** `http://localhost:4000/api/v1`

---

## 📍 7 Core Endpoints

### 1️⃣ Traffic Conditions
```
GET /traffic/conditions?lat=6.5&lng=3.4&radius=5
→ Returns current traffic at location
```

### 2️⃣ Traffic Predictions
```
GET /traffic/predictions?lat=6.5&lng=3.4&horizon=3h
→ Returns traffic forecast (1h, 3h, 6h, 12h)
```

### 3️⃣ Traffic Hotspots
```
GET /traffic/hotspots?lat=6.5&lng=3.4&radius=10
→ Returns chronic problem areas
```

### 4️⃣ Analyze Route
```
POST /routes/analyze
{
  "origin": {"lat": 6.5, "lng": 3.4},
  "destination": "Lekki",
  "options": {"provideAlternatives": true}
}
→ Compare routes with traffic impact
```

### 5️⃣ Route Alternatives
```
GET /routes/alternatives?origin=6.5,3.4&destination=Lekki
→ Get faster route options
```

### 6️⃣ Location Search
```
GET /locations/search?q=Lekki
→ Find destinations by name/address
```

### 7️⃣ Directions
```
POST /directions
{
  "origin": {"lat": 6.5, "lng": 3.4},
  "destination": "Lekki"
}
→ Get turn-by-turn directions with traffic
```

---

## 📊 Standard Response Format

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:24.373Z",
  "data": { /* endpoint data */ },
  "meta": {
    "version": "1.0",
    "source": "google_maps"
  }
}
```

---

## 🚦 Severity Levels

| Level | Range | Color |
|-------|-------|-------|
| `low` | 0-30% | 🟢 Green |
| `moderate` | 31-60% | 🟡 Yellow |
| `high` | 61-80% | 🟠 Orange |
| `severe` | 81-100% | 🔴 Red |

---

## 💡 Usage Examples

### JavaScript
```javascript
// Get conditions
const res = await fetch(
  'http://localhost:4000/api/v1/traffic/conditions?lat=6.5&lng=3.4'
);
const data = await res.json();
console.log(data.data); // Array of conditions
```

### Python
```python
import requests
res = requests.get(
  'http://localhost:4000/api/v1/traffic/conditions',
  params={'lat': 6.5, 'lng': 3.4}
)
print(res.json())
```

### cURL
```bash
curl "http://localhost:4000/api/v1/traffic/conditions?lat=6.5&lng=3.4" | jq
```

---

## 🎯 Key Parameters

| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| `lat` | number | Yes | 6.5244 |
| `lng` | number | Yes | 3.3792 |
| `radius` | number | No | 5 (km) |
| `horizon` | string | No | "3h" |
| `q` | string | No | "Lekki" |
| `avoidTolls` | boolean | No | true |
| `avoidHighways` | boolean | No | false |

---

## ✅ Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success ✓ |
| 400 | Bad request (missing params) |
| 500 | Server error |

---

## 🔗 Sample Responses

### Traffic Conditions Response
```json
{
  "data": [{
    "id": "real-traffic-xxx",
    "location": {"lat": 6.5244, "lng": 3.3792, "address": "Victoria Island"},
    "severity": "high",
    "speed": 25,
    "confidence": 95,
    "duration": 45
  }]
}
```

### Predictions Response
```json
{
  "data": {
    "predictions": [
      {"time": "2:00 PM", "congestionLevel": 65, "severity": "high"},
      {"time": "3:00 PM", "congestionLevel": 55, "severity": "moderate"}
    ]
  }
}
```

### Route Analysis Response
```json
{
  "data": {
    "mainRoute": {
      "name": "Lagos-Abeokuta Expressway",
      "distance": 18.5,
      "durationWithTraffic": 62,
      "trafficLevel": "high"
    },
    "alternatives": [
      {
        "name": "Ikoyi Link Bridge",
        "durationWithTraffic": 48,
        "timeSavings": 14
      }
    ]
  }
}
```

---

## 🎬 Quick Demos

### Get current traffic where you are
```bash
curl "http://localhost:4000/api/v1/traffic/conditions?lat=6.5&lng=3.4"
```

### Find the best route to Lekki
```bash
curl -X POST http://localhost:4000/api/v1/routes/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "origin":{"lat":6.5,"lng":3.4},
    "destination":"Lekki Phase 1"
  }'
```

### See traffic forecast for next 3 hours
```bash
curl "http://localhost:4000/api/v1/traffic/predictions?lat=6.5&lng=3.4&horizon=3h"
```

### Search for a place
```bash
curl "http://localhost:4000/api/v1/locations/search?q=Victoria%20Island"
```

---

## 🚀 Frontend Integration

All endpoints are **CORS-enabled** and ready for browser integration.

```javascript
// Make requests from React, Vue, Angular, etc.
const response = await fetch(
  'http://localhost:4000/api/v1/traffic/conditions?lat=6.5&lng=3.4'
);
const { data, meta } = await response.json();
```

---

## 📈 Data Freshness

- **Traffic Conditions:** Real-time (5 min refresh)
- **Predictions:** 15 minute updates
- **Hotspots:** Daily refresh
- **Routes:** Real-time via Google Maps

**Confidence:** 95% (all data from Google Maps)

---

## 🔒 No Authentication Required (Dev)

API is open in development. For production, add:
- API keys
- Rate limiting (100 req/hour)
- HTTPS enforcement

---

## 📱 Mobile Ready

All responses are JSON and work perfectly with:
- React Native
- Flutter
- Native iOS/Android
- Web apps

---

## 💬 Support

- Full docs: `API_DOCUMENTATION.md`
- Issues: GitHub
- Contact: support@0g.ai

---

**Version:** 1.0
**Data Source:** Google Maps (Real-time)
**Last Updated:** 2025-11-02
