# Database schema (MongoDB)

Collections map 1:1 to Mongoose models in `backend/src/models/`.

## Users

| Field | Type | Description |
|-------|------|-------------|
| `email` | String | Unique, required |
| `passwordHash` | String | bcrypt hash |
| `displayName` | String | Optional |
| `ecoPoints` | Number | Redeemable reward balance |
| `interactionHistory[]` | Subdocs | `productId`, `rating`, `purchased`, `at` |
| `sessionActivity[]` | Subdocs | `productId`, `event` (view, cart_add, purchase, search), `at` |

## Products

| Field | Type | Description |
|-------|------|-------------|
| `name`, `description` | String | Catalog copy |
| `category` | String | For content-based features |
| `tags[]` | String | Keywords for TF‑IDF |
| `price` | Number | Unit price |
| `ecoScore` | Number | 0–100 sustainability signal for ranking |
| `carbonKgPerUnit` | Number | Optional transparency field |
| `stock` | Number | Inventory |

## Orders

| Field | Type | Description |
|-------|------|-------------|
| `userId` | ObjectId | Owner |
| `lines[]` | Subdocs | `productId`, `quantity`, `unitPrice`, `ecoScoreAtPurchase` |
| `subtotal` | Number | Before eco-points discount |
| `total` | Number | Charged amount after discount |
| `ecoPointsEarned`, `ecoPointsRedeemed` | Numbers | Lifecycle rewards |
| `discountFromEcoPoints` | Number | Dollar discount applied |
| `status` | Enum | `pending`, `paid`, `failed`, … |
| `paymentProvider`, `paymentIntentId` | String | Payment gateway (Phase 4) |
| `feedbackSubmitted` | Boolean | Gate duplicate feedback |

## Feedback

| Field | Type | Description |
|-------|------|-------------|
| `userId`, `orderId` | ObjectId | Required |
| `productId` | ObjectId | Optional line-level |
| `rating` | Number | 1–5 |
| `comment` | String | Optional |
| `sustainabilityRelevant` | Boolean | Optional survey flag |

**Index**: unique on `(orderId, userId)` for one feedback record per order in the default flow.
