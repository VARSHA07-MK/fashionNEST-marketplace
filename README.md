# FASHIONest Marketplace

FASHIONest is a fashion ecommerce platform focused on sarees and women's ethnic wear, with a community-buying layer for apartment associations and RWAs.

It combines:
- a Vite + React frontend
- an Express + TypeScript backend
- SQLite for local data
- role-based flows for `customer`, `rwa`, and `admin`

## Highlights

- Modern storefront for sarees, kurtas, blouses, dresses, and kurta sets
- Product detail pages, wishlist flow, cart, coupons, and checkout
- Role-aware community deal experience for RWA users
- Admin dashboard for products, orders, reviews, coupons, and community deals
- Security-question based password reset
- Address management with map-ready address picker flow

## Tech Stack

- Frontend: React, React Router, Vite, Tailwind CSS, Motion, Lucide
- Backend: Express, TypeScript, tsx
- Data: better-sqlite3
- Auth: JWT + session support
- Payments: Razorpay integration hooks
- Media: local uploads, optional Cloudinary settings

## Project Structure

```text
src/
  components/         shared UI pieces
  context/            auth and cart state
  pages/              route-level pages
server.ts             Express API + Vite dev server
society_saree.db      local SQLite database
uploads/              uploaded product images
```

## Run Locally

### Prerequisites

- Node.js 18+
- npm

### Setup

```powershell
npm install
copy .env.example .env
npm run dev
```

Open:

- [http://localhost:3000](http://localhost:3000)

## Scripts

- `npm run dev` - starts the Express + Vite development server
- `npm run build` - builds the frontend with Vite
- `npm run preview` - previews the built frontend
- `npm run lint` - runs TypeScript type-checking

## Environment Variables

See `.env.example`.

Main values:

- `JWT_SECRET`
- `APP_URL`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `VITE_GOOGLE_MAPS_API_KEY`

## Local Data Notes

This project currently stores data in local files:

- `society_saree.db`
- `uploads/`
- generated review export files such as `reviews.csv`

That is perfect for localhost development, demos, and iteration.

## Deployment Note

### Vercel

You do have a Vercel account, but the current app is not fully Vercel-ready as a persistent full-stack deployment yet.

Reasons:

- SQLite database is local to the project
- uploaded product images are stored on the local filesystem
- review export is appended to a local CSV file
- Vercel serverless functions use ephemeral filesystem behavior, so writes do not behave like a normal long-running server

Because of that, I did not add a misleading Vercel runtime config that would deploy but break cart, orders, uploads, or admin updates.

### To make Vercel-ready later

Move these pieces first:

- SQLite -> hosted database such as Neon, Supabase Postgres, PlanetScale, or Turso
- local uploads -> Cloudinary or another object storage
- local CSV export -> hosted storage or database-backed export generation

Once that is done, the app can be adapted for Vercel much more safely.

## Recommended Deployment Options Right Now

If you want the current architecture to work with fewer changes, better fits are:

- Render
- Railway
- VPS / Ubuntu server

These are easier for an Express app that writes to local disk.

## GitHub

Repository:

- [fashionNEST-marketplace](https://github.com/VARSHA07-MK/fashionNEST-marketplace)

## Status

Current checks that pass locally:

- `npm run lint`
- `npm run build`
