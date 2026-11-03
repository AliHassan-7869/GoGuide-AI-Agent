import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";

// Root HTML template for Expo Router Web Static Export
export default function Root({ children }) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } =
    typeof useServerDocumentContext === "function" ? useServerDocumentContext() : {};

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />

        <title>GoGuide AI — Intelligent Travel Agent & Itinerary Planner</title>
        <meta
          name="description"
          content="Autonomous AI travel companion creating personalized multi-day itineraries, flight & boutique hotel recommendations, and live route navigation."
        />

        {/* Google Fonts preconnect & Outfit CDN */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />

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

        {/* jsPDF for direct 1-click vector itinerary PDF downloads (100% reliable, zero blank pages) */}
        <script src="/jspdf.umd.min.js" defer></script>

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root {
            width: 100%;
            height: 100%;
            min-height: 100%;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            overflow-x: hidden;
          }
          #root {
            display: flex;
            flex-direction: column;
            flex: 1;
          }
          * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }
          body {
            overflow-wrap: break-word;
            word-break: normal;
          }
        ` }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
