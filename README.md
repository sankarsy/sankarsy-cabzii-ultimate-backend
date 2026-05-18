# cabzii-ultimate-backend

Production-ready backend scaffold for `cabzii.in` taxi/tour platform.

## Features

- MongoDB connection with Mongoose
- JWT auth with OTP login
- Role system:
  - `super_admin`
  - `vendor_admin`
  - `customer`
- OTP mode support:
  - `fast2sms`
  - `factor2`
  - `local` (development/testing)
- CRUD APIs for:
  - Cabs
  - Drivers
  - Packages
  - Bookings
- Role-based admin protection

## Setup

1. Copy env template:

```bash
cp .env.example .env
```

2. Fill `.env` values (`MONGODB_URI`, `JWT_SECRET`, OTP keys, etc.)

Role mapping env:

- `SUPER_ADMIN_PHONES=9999999999,8888888888`
- `VENDOR_ADMIN_MAP=9999999990:SwiftRide,9999999991:Urban Wheels`

3. Install dependencies:

```bash
npm install
```

4. Run:

```bash
npm run dev
```

## Sample data (MongoDB)

From this directory, with `MONGODB_URI` set in `.env`:

```bash
npm run seed
```

Clears **cabs**, **packages**, and **drivers**, then inserts the same catalog as `cabzii-ultimate/src/data/travelData.js` (via `scripts/sampleData.js`). Options:

- `npm run seed -- --append` — insert without clearing first (can duplicate rows).
- `npm run seed -- --with-bookings` — also inserts three demo **bookings** (cab, tour, driver) tied to the first inserted items; uses phone `910000000099` and replaces any existing seed rows for that phone.

After editing `travelData.js`, refresh the snapshot used by the seed:

```bash
npm run seed:sync
```

## API Base

`/api/v1`

### Health

- `GET /api/v1/health`

### Auth

- `POST /api/v1/auth/send-otp`
- `POST /api/v1/auth/verify-otp`
- `GET /api/v1/auth/me` (Bearer token)

### Cabs

- `GET /api/v1/cabs`
- `POST /api/v1/cabs` (admin)
- `PUT /api/v1/cabs/:id` (admin)
- `DELETE /api/v1/cabs/:id` (admin)

### Drivers

- `GET /api/v1/drivers`
- `POST /api/v1/drivers` (admin)
- `PUT /api/v1/drivers/:id` (admin)
- `DELETE /api/v1/drivers/:id` (admin)

### Packages

- `GET /api/v1/packages`
- `POST /api/v1/packages` (admin)
- `PUT /api/v1/packages/:id` (admin)
- `DELETE /api/v1/packages/:id` (admin)

### Bookings

- `POST /api/v1/bookings` (optional Bearer for admins to set initial `status`)
- `GET /api/v1/bookings` (auth; super_admin and vendor_admin see all, customer sees own by phone)
- `PUT /api/v1/bookings/:id` (admin — full update)
- `PATCH /api/v1/bookings/:id/status` (admin — status only)
- `DELETE /api/v1/bookings/:id` (admin)

## Notes

- Never commit real secrets to git.
- Use `OTP_MODE=local` during development; the generated OTP is returned in API response.
