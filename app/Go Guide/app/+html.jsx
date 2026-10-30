import { ScrollViewStyleReset } from "expo-router/html";

// Root HTML template for Expo Router Web Static Export
export default function Root({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        <title>GoGuide AI — Intelligent Travel Agent & Itinerary Planner</title>
        <meta
          name="description"
          content="Autonomous AI travel companion creating personalized multi-day itineraries, flight & boutique hotel recommendations, and live route navigation."
        />

        {/* Open Graph / WhatsApp / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="GoGuide AI" />
        <meta property="og:title" content="GoGuide AI — Intelligent Travel Agent & Itinerary Planner" />
        <meta
          property="og:description"
          content="Autonomous AI travel companion creating personalized multi-day itineraries, flight & boutique hotel recommendations, and live route navigation."
        />
        <meta property="og:url" content="https://dist-seven-tau-79.vercel.app" />
        <meta
          property="og:image"
          content="https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GoGuide AI — Intelligent Travel Agent" />
        <meta
          name="twitter:description"
          content="Autonomous AI travel companion creating personalized multi-day itineraries, boutique hotel stays, and live budget tracking."
        />
        <meta
          name="twitter:image"
          content="https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1200&auto=format&fit=crop"
        />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
