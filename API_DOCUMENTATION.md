# 0G Route - Traffic API Documentation

## Overview

0G Route provides a standardized set of REST APIs for querying real-time traffic conditions, route analysis, predictions, and location data. All data is sourced from Google Maps and normalized into a consistent JSON format for third-party integration.

**Base URL:** `http://localhost:4000/api/v1`

**API Version:** 1.0

**Data Source:** Google Maps (Real-time traffic, directions, places)

---

## Standard Response Format

All endpoints return responses in the following standardized format:

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:24.373Z",
  "data": { /* endpoint-specific data */ },
  "meta": {
    "version": "1.0",
    "source": "google_maps",
    /* additional metadata */
  }
}
```

### Error Response

```json
{
  "error": "Error description",
  "timestamp": "2025-11-02T01:04:24.373Z"
}
```

---

## Endpoints

### 1. Get Traffic Conditions

Get current traffic conditions at a specific location.

**Endpoint:** `GET /traffic/conditions`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lat` | number | Yes | - | Latitude of location |
| `lng` | number | Yes | - | Longitude of location |
| `radius` | number | No | 5 | Search radius in kilometers |

**Example Request:**

```bash
curl "http://localhost:4000/api/v1/traffic/conditions?lat=6.5244&lng=3.3792&radius=5"
```

**Example Response:**

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:24.373Z",
  "data": [
    {
      "id": "real-traffic-xxx",
      "location": {
        "lat": 6.5244,
        "lng": 3.3792,
        "address": "Victoria Island, Lagos"
      },
      "severity": "high",
      "speed": 25,
      "duration": 45,
      "confidence": 95,
      "timestamp": "2025-11-02T01:04:24Z",
      "cause": "Rush hour congestion",
      "description": "Heavy traffic to Victoria Island: High conditions via Lagos-Abeokuta Expressway"
    }
  ],
  "meta": {
    "version": "1.0",
    "source": "google_maps",
    "location": {
      "lat": 6.5244,
      "lng": 3.3792,
      "radius": 5
    },
    "resultCount": 1
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing required parameters (lat, lng)
- `500 Internal Server Error` - Server error

---

### 2. Get Traffic Predictions

Get traffic predictions for a location over the next 3, 6, or 12 hours.

**Endpoint:** `GET /traffic/predictions`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lat` | number | Yes | - | Latitude of location |
| `lng` | number | Yes | - | Longitude of location |
| `horizon` | string | No | "6h" | Time horizon: "1h", "3h", "6h", or "12h" |

**Example Request:**

```bash
curl "http://localhost:4000/api/v1/traffic/predictions?lat=6.5244&lng=3.3792&horizon=3h"
```

**Example Response:**

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:24.517Z",
  "data": {
    "location": {
      "lat": 6.5244,
      "lng": 3.3792
    },
    "predictions": [
      {
        "time": "2:00 PM",
        "congestionLevel": 65,
        "confidence": 92,
        "severity": "high"
      },
      {
        "time": "3:00 PM",
        "congestionLevel": 55,
        "confidence": 88,
        "severity": "moderate"
      },
      {
        "time": "4:00 PM",
        "congestionLevel": 45,
        "confidence": 85,
        "severity": "moderate"
      }
    ]
  },
  "meta": {
    "version": "1.0",
    "source": "google_maps",
    "horizon": "3h",
    "accuracy": 85,
    "factors": {
      "realTime": 50,
      "historical": 25,
      "events": 10,
      "weather": 15
    }
  }
}
```

**Severity Levels:**
- `low` - Congestion 0-30%
- `moderate` - Congestion 31-60%
- `high` - Congestion 61-80%
- `severe` - Congestion 81-100%

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing required parameters
- `500 Internal Server Error` - Server error

---

### 3. Get Traffic Hotspots

Get chronic traffic problem areas within a specified radius.

**Endpoint:** `GET /traffic/hotspots`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lat` | number | No | - | Center latitude (optional for filtering) |
| `lng` | number | No | - | Center longitude (optional for filtering) |
| `radius` | number | No | 10 | Search radius in kilometers |

**Example Request:**

```bash
curl "http://localhost:4000/api/v1/traffic/hotspots?lat=6.5244&lng=3.3792&radius=15"
```

**Example Response:**

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:24.652Z",
  "data": [
    {
      "id": "hotspot-lekki-toll",
      "location": {
        "lat": 6.4265,
        "lng": 3.4221,
        "address": "Lekki Toll Gate, Lagos"
      },
      "name": "Lekki Toll Gate",
      "severity": "high",
      "frequency": 0.95,
      "averageCongestion": 75,
      "peakHours": ["6-8", "16-19"],
      "peakDays": ["Mon", "Tue", "Wed", "Thu", "Fri"],
      "seasonalPatterns": {
        "peak": "December, July-August"
      },
      "dataPoints": 1247
    }
  ],
  "meta": {
    "version": "1.0",
    "center": {
      "lat": 6.5244,
      "lng": 3.3792
    },
    "radius": 15,
    "hotspotCount": 1
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `500 Internal Server Error` - Server error

---

### 4. Analyze Route

Analyze a single route and get alternative route suggestions with traffic impact comparison.

**Endpoint:** `POST /routes/analyze`

**Request Body:**

```json
{
  "origin": {
    "lat": 6.5245,
    "lng": 3.3792
  },
  "destination": "Lekki Phase 1, Lagos",
  "options": {
    "avoidTolls": false,
    "avoidHighways": false,
    "provideAlternatives": true
  }
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `origin` | object | Yes | Starting point with lat/lng |
| `destination` | string | Yes | Destination address or lat,lng |
| `options` | object | No | Route preferences |
| `options.avoidTolls` | boolean | No | Avoid toll roads (default: false) |
| `options.avoidHighways` | boolean | No | Avoid highways (default: false) |
| `options.provideAlternatives` | boolean | No | Include alternative routes (default: true) |

**Example Request:**

```bash
curl -X POST http://localhost:4000/api/v1/routes/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 6.5245, "lng": 3.3792},
    "destination": "Lekki Phase 1, Lagos",
    "options": {"provideAlternatives": true}
  }'
```

**Example Response:**

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:33.979Z",
  "data": {
    "mainRoute": {
      "id": "route-main-1",
      "name": "Lagos-Abeokuta Expressway",
      "distance": 18.5,
      "duration": 45,
      "durationWithTraffic": 62,
      "trafficDelay": 17,
      "trafficLevel": "high",
      "confidence": 95,
      "description": "Main expressway route"
    },
    "alternatives": [
      {
        "id": "route-alt-1",
        "name": "Ikoyi Link Bridge",
        "distance": 16.2,
        "duration": 38,
        "durationWithTraffic": 48,
        "trafficDelay": 10,
        "trafficLevel": "moderate",
        "timeSavings": 14,
        "distanceDifference": -2.3,
        "isRecommended": true,
        "description": "Faster alternative route"
      }
    ]
  },
  "meta": {
    "version": "1.0",
    "source": "google_maps",
    "optionsApplied": {
      "avoidTolls": false,
      "avoidHighways": false,
      "provideAlternatives": true
    }
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing required fields (origin, destination)
- `500 Internal Server Error` - Server error

---

### 5. Get Route Alternatives

Get faster alternative routes for a trip (simplified version of route analysis).

**Endpoint:** `GET /routes/alternatives`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `origin` | string | Yes | Origin as "lat,lng" or address |
| `destination` | string | Yes | Destination address or "lat,lng" |
| `avoidTolls` | boolean | No | Avoid toll roads |
| `avoidHighways` | boolean | No | Avoid highways |

**Example Request:**

```bash
curl "http://localhost:4000/api/v1/routes/alternatives?origin=6.5245,3.3792&destination=Lekki%20Phase%201"
```

**Example Response:**

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:29.836Z",
  "data": {
    "mainRoute": {
      "id": "route-main",
      "name": "Primary Route",
      "distance": 18.5,
      "durationWithTraffic": 62,
      "trafficLevel": "high"
    },
    "betterAlternatives": [
      {
        "id": "route-alt-1",
        "name": "Secondary Route",
        "distance": 16.2,
        "durationWithTraffic": 48,
        "trafficLevel": "moderate",
        "timeSavings": 14,
        "rating": 4.5
      }
    ],
    "betterRoutesCount": 1
  },
  "meta": {
    "version": "1.0",
    "source": "google_maps"
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing required parameters
- `500 Internal Server Error` - Server error

---

### 6. Search Locations

Search for destinations by name or query.

**Endpoint:** `GET /locations/search`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (place name, address) |
| `lat` | number | No | Latitude to bias search |
| `lng` | number | No | Longitude to bias search |
| `radius` | number | No | Search radius in kilometers |

**Example Request:**

```bash
curl "http://localhost:4000/api/v1/locations/search?q=Lekki%20Phase%201&lat=6.5&lng=3.4"
```

**Example Response:**

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:29.698Z",
  "data": [
    {
      "placeId": "place-123",
      "name": "Lekki Phase 1",
      "address": "Lekki Phase 1, Lagos, Nigeria",
      "location": {
        "lat": 6.4265,
        "lng": 3.5721
      },
      "types": ["locality", "political"]
    }
  ],
  "meta": {
    "version": "1.0",
    "query": "Lekki Phase 1",
    "resultCount": 1
  }
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing required query parameter (q)
- `500 Internal Server Error` - Server error

---

### 7. Get Directions

Get detailed turn-by-turn directions for a route with traffic information.

**Endpoint:** `POST /directions`

**Request Body:**

```json
{
  "origin": {
    "lat": 6.5245,
    "lng": 3.3792
  },
  "destination": "Lekki Phase 1, Lagos",
  "options": {
    "avoidTolls": false,
    "avoidHighways": false,
    "alternatives": false
  }
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `origin` | object | Yes | Starting point with lat/lng |
| `destination` | string | Yes | Destination address or lat,lng |
| `options` | object | No | Route preferences |
| `options.avoidTolls` | boolean | No | Avoid toll roads |
| `options.avoidHighways` | boolean | No | Avoid highways |
| `options.alternatives` | boolean | No | Include alternative routes |

**Example Request:**

```bash
curl -X POST http://localhost:4000/api/v1/directions \
  -H "Content-Type: application/json" \
  -d '{
    "origin": {"lat": 6.5245, "lng": 3.3792},
    "destination": "Lekki Phase 1, Lagos"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "timestamp": "2025-11-02T01:04:34.111Z",
  "data": {
    "routes": [
      {
        "summary": "Lagos-Abeokuta Expressway",
        "distance": 18500,
        "duration": 2700,
        "durationWithTraffic": 3720,
        "steps": [
          {
            "instruction": "Head east on Lagos-Abeokuta Expressway",
            "distance": 5000,
            "duration": 300,
            "startLocation": {
              "lat": 6.5245,
              "lng": 3.3792
            },
            "endLocation": {
              "lat": 6.5234,
              "lng": 3.4156
            }
          }
        ],
        "polyline": "encoded_polyline_string_for_mapping"
      }
    ]
  },
  "meta": {
    "version": "1.0",
    "source": "google_maps",
    "routeCount": 1
  }
}
```

**Response Fields:**

| Field | Description |
|-------|-------------|
| `summary` | Route name/description |
| `distance` | Total distance in meters |
| `duration` | Normal duration in seconds (no traffic) |
| `durationWithTraffic` | Duration with current traffic in seconds |
| `steps` | Array of turn-by-turn directions |
| `polyline` | Encoded polyline for map rendering |

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Server error

---

## Utility Endpoints

### Update Traffic Cache

Update the server-side traffic cache with current conditions (called by frontend after fetching Google Maps data).

**Endpoint:** `POST /traffic/update`

**Request Body:**

```json
{
  "conditions": [
    {
      "id": "real-traffic-xxx",
      "location": {
        "lat": 6.5244,
        "lng": 3.3792,
        "address": "Victoria Island, Lagos"
      },
      "severity": "high",
      "speed": 25,
      "duration": 45,
      "confidence": 95
    }
  ]
}
```

**Example Response:**

```json
{
  "ok": true,
  "cached": 1
}
```

---

## Data Types and Enums

### Severity Levels

```
"low"      - Light traffic (0-30% delay)
"moderate" - Moderate traffic (31-60% delay)
"high"     - Heavy traffic (61-80% delay)
"severe"   - Severe congestion (81-100% delay)
```

### Location Object

```json
{
  "lat": 6.5244,
  "lng": 3.3792,
  "address": "Victoria Island, Lagos"  // optional
}
```

### Route Object

```json
{
  "id": "route-1",
  "name": "Route Name",
  "distance": 18.5,              // km
  "duration": 45,                // minutes
  "durationWithTraffic": 62,     // minutes
  "trafficDelay": 17,            // minutes
  "trafficLevel": "high",        // low|moderate|high|severe
  "confidence": 95,              // 0-100
  "description": "Route details"
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Description of what went wrong",
  "timestamp": "2025-11-02T01:04:24.373Z"
}
```

### Common Error Codes

| Status | Error | Resolution |
|--------|-------|-----------|
| 400 | Missing required parameters | Include all required query/body parameters |
| 400 | Invalid latitude/longitude | Use valid numeric coordinates |
| 500 | Failed to get directions | Check origin and destination are valid |
| 500 | Server error | Try again or contact support |

---

## Usage Examples

### JavaScript/TypeScript

```javascript
// Get traffic conditions
async function getTrafficConditions(lat, lng) {
  const response = await fetch(
    `http://localhost:4000/api/v1/traffic/conditions?lat=${lat}&lng=${lng}`
  );
  const data = await response.json();
  return data.data;
}

// Analyze route
async function analyzeRoute(origin, destination) {
  const response = await fetch(
    'http://localhost:4000/api/v1/routes/analyze',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin,
        destination,
        options: { provideAlternatives: true }
      })
    }
  );
  return await response.json();
}

// Get predictions
async function getTrafficPredictions(lat, lng, horizon = '6h') {
  const response = await fetch(
    `http://localhost:4000/api/v1/traffic/predictions?lat=${lat}&lng=${lng}&horizon=${horizon}`
  );
  return await response.json();
}
```

### Python

```python
import requests

BASE_URL = "http://localhost:4000/api/v1"

def get_traffic_conditions(lat, lng, radius=5):
    response = requests.get(
        f"{BASE_URL}/traffic/conditions",
        params={"lat": lat, "lng": lng, "radius": radius}
    )
    return response.json()

def analyze_route(origin, destination):
    response = requests.post(
        f"{BASE_URL}/routes/analyze",
        json={
            "origin": origin,
            "destination": destination,
            "options": {"provideAlternatives": True}
        }
    )
    return response.json()

def search_locations(query):
    response = requests.get(
        f"{BASE_URL}/locations/search",
        params={"q": query}
    )
    return response.json()
```

### cURL Examples

```bash
# Get traffic conditions
curl "http://localhost:4000/api/v1/traffic/conditions?lat=6.5&lng=3.4"

# Get predictions for next 6 hours
curl "http://localhost:4000/api/v1/traffic/predictions?lat=6.5&lng=3.4&horizon=6h"

# Get hotspots
curl "http://localhost:4000/api/v1/traffic/hotspots?lat=6.5&lng=3.4"

# Analyze route
curl -X POST http://localhost:4000/api/v1/routes/analyze \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":6.5,"lng":3.4},"destination":"Lekki"}'

# Get alternatives
curl "http://localhost:4000/api/v1/routes/alternatives?origin=6.5,3.4&destination=Lekki"

# Search location
curl "http://localhost:4000/api/v1/locations/search?q=Lekki"

# Get directions
curl -X POST http://localhost:4000/api/v1/directions \
  -H "Content-Type: application/json" \
  -d '{"origin":{"lat":6.5,"lng":3.4},"destination":"Lekki"}'
```

---

## Rate Limiting

Currently, there are **no rate limits** on the API. However, for production deployments, it's recommended to implement:

- API keys for tracking usage per client
- Rate limits: 100 requests/hour for free tier
- Higher limits for premium tiers

---

## Data Freshness

| Endpoint | Update Frequency | Confidence |
|----------|------------------|-----------|
| `/traffic/conditions` | Real-time (5 min) | 95% (Google Maps) |
| `/traffic/predictions` | 15 minutes | 70-85% |
| `/traffic/hotspots` | Daily | N/A |
| `/routes/analyze` | Real-time | 95% (Google Maps) |
| `/routes/alternatives` | Real-time | 95% (Google Maps) |
| `/locations/search` | Real-time | 95% (Google Maps) |
| `/directions` | Real-time | 95% (Google Maps) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Client Apps                         │
│          (Web, Mobile, Third-party Services)            │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTPS Requests
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   API Gateway (v1)                       │
│    (/api/v1/traffic/*, /api/v1/routes/*, etc)          │
└────────────────────┬────────────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      ▼                             ▼
┌──────────────────┐    ┌──────────────────────┐
│ Google Maps API  │    │ Traffic Cache Layer  │
│  (Real-time)     │    │  (In-memory)         │
└──────────────────┘    └──────────────────────┘
```

---

## Support & Feedback

For issues, feature requests, or feedback:

- **GitHub Issues:** [0g-route/issues](https://github.com/anthropics/0g-route)
- **Email:** support@0g.ai
- **Documentation:** Check `/docs` folder for additional resources

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-02 | Initial release with 7 core endpoints |

---

## License

This API is part of the 0G Route project. See LICENSE file for details.
