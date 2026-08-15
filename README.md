# MEI SPARE — Car Spare Parts & Accessories

A full client-side store demo inspired by autodukan.com (auto spare-parts e-commerce),
rebuilt with a different UI structure: a persistent vertical category rail, dark
industrial "garage" theme, and a dual Retail / Trade (B2B) pricing mode.

## Stack

- React 19 + Vite
- react-router-dom (hash routing — works from any static host)
- Zero other runtime dependencies; icons and product artwork are inline SVG

## Features

- **Home** — part-number search, fitment finder (make → model → compatible parts),
  asymmetric category bento grid, featured parts, B2B trade strip, brand marquee,
  how-it-works, testimonials, perks.
- **Shop** — category, brand, price, in-stock and vehicle-fitment filters driven by
  URL query params; sort options; active-filter chips; empty state.
- **Product detail** — artwork gallery, trade/retail price block, quantity stepper,
  delivery estimates, fitment vehicles, specs table, related parts.
- **Cart** — slide-in drawer with quantity controls, savings summary, persisted to
  `localStorage`.
- **Retail ↔ Trade mode** — toggle in the sidebar switches every price across the
  site to wholesale (15% below retail) and shows MRP savings.

## Run

```bash
npm install
npm run dev      # dev server
npm run build    # production build -> dist/
npm run preview  # preview the production build
npm run lint     # oxlint
```

## Structure

```
src/
  data.js                    # categories, vehicles, products, content
  context/
    storeContext.js          # context object
    StoreContext.jsx         # store provider (cart, mode, toasts)
    useStore.js              # useStore hook
  components/
    Sidebar.jsx              # left rail: brand, mode toggle, category nav
    Topbar.jsx               # search with autocomplete, fitment link, cart
    ProductCard.jsx          # catalogue card
    CartDrawer.jsx           # slide-in cart
    Toast.jsx                # "added to cart" notification
    ProductArt.jsx           # SVG part illustrations per category
    icons.jsx                # icon set
  pages/
    Home.jsx
    Shop.jsx
    ProductDetail.jsx
  css/                       # layout, products, home, shop, components
```

Edit product/category/vehicle data in `src/data.js` to extend the demo.
