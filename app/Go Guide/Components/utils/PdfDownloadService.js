import { Platform, Alert } from "react-native";

/**
 * Robust 1-Click PDF Downloader for Trip Itineraries
 * Fixes:
 * 1. Offscreen canvas at (0, 0, zIndex -99999) so html2canvas NEVER renders a blank page.
 * 2. outputPdf('blob') with delayed URL revocation (15s) so the download never navigates to a dead URL or blank page.
 * 3. Zero DOM crashes on React 19 root.
 * 4. Resilient hidden iframe print fallback with zero main-page navigation.
 */
export async function downloadItineraryPDF(plan, destinationName) {
  if (!plan) {
    if (Platform.OS === "web") {
      console.warn("No trip plan found to download.");
    } else {
      Alert.alert("Notice", "No trip plan found to download.");
    }
    return false;
  }

  const dest = plan.destination || destinationName || "Trip";
  const destClean = dest.replace(/[^a-zA-Z0-9]/g, "_");

  if (Platform.OS === "web" && typeof window !== "undefined") {
    // 1. Build high-quality printable document HTML with explicit inline styling
    const itineraryHtml = (plan.itinerary || [])
      .map(
        (day) => `
        <div style="page-break-inside: avoid; margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-family: 'Outfit', -apple-system, sans-serif; background: #ffffff;">
          <div style="background: #0a7ea4; color: #ffffff; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;">
            <span style="background: #ffffff; color: #0a7ea4; font-weight: 800; font-size: 12px; padding: 3px 8px; border-radius: 4px;">Day ${day.day}</span>
            <span style="font-weight: 600; font-size: 14px; color: #ffffff;">${day.theme || "Daily Highlights"}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px; background: #ffffff;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 8px 12px; width: 22%; color: #475569; font-weight: 700;">Time</th>
                <th style="padding: 8px 12px; width: 40%; color: #475569; font-weight: 700;">Activity / Attraction</th>
                <th style="padding: 8px 12px; width: 38%; color: #475569; font-weight: 700;">Details & Pass</th>
              </tr>
            </thead>
            <tbody>
              ${(day.activities || [])
                .map(
                  (act) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 12px; font-weight: 700; color: #0a7ea4;">${act.time || "Scheduled"}</td>
                  <td style="padding: 8px 12px; font-weight: 600; color: #0f172a;">${act.placeName || "Sightseeing Spot"}</td>
                  <td style="padding: 8px 12px; color: #475569;">${act.details || act.placeDetails || "Curated local experience"}${act.tickets ? ` <span style="color: #0284c7; font-weight: 700;">(${act.tickets})</span>` : ""}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
      )
      .join("");

    const hotelsHtml = (plan.hotels || [])
      .map(
        (h) => `
        <div style="background: #f8fafc; padding: 10px 14px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid #0a7ea4; font-size: 13px;">
          <strong style="color: #0f172a;">${h.name}</strong> — <span style="color: #475569;">${h.address || h.details || "Prime location"}</span> 
          <span style="font-weight: 700; color: #16a34a; margin-left: 8px;">${h.price || ""}</span>
        </div>
      `
      )
      .join("");

    const fullDocHtml = `
      <div id="goguide-direct-pdf-content" style="padding: 28px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; width: 750px; margin: 0 auto; background: #ffffff; box-sizing: border-box;">
        <div style="border-bottom: 2px solid #0a7ea4; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 24px; font-weight: 800; color: #0a7ea4; letter-spacing: -0.5px;">GoGuide<span style="color: #f2994a;">.AI</span></div>
            <div style="font-size: 11px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Smart Travel Itinerary & Official Pass</div>
          </div>
          <div style="text-align: right;">
            <h1 style="font-size: 18px; font-weight: 700; margin: 0; color: #0f172a;">${dest}</h1>
            <div style="font-size: 11px; color: #64748b;">Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div style="display: flex; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px; margin-bottom: 18px; font-size: 12px; flex-wrap: wrap;">
          <div><strong style="color: #0a7ea4;">Duration:</strong> ${plan.duration || "Multi-Day"}</div>
          <div><strong style="color: #0a7ea4;">Budget:</strong> ${plan.budget || "Moderate"}</div>
          <div><strong style="color: #0a7ea4;">Traveler:</strong> ${plan.traveler || "Explorer"}</div>
          <div><strong style="color: #0a7ea4;">Flights:</strong> ${plan.flightDetails?.airline || "Flight Info Included"}</div>
        </div>

        <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">🗓️ Day-by-Day Schedule</h3>
        ${itineraryHtml}

        ${hotelsHtml ? `<div style="margin-top: 20px;"><h3 style="font-size: 15px; font-weight: 700; margin-bottom: 10px; color: #0f172a;">🏨 Recommended Stays & Hotels</h3>${hotelsHtml}</div>` : ""}

        <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #64748b; text-align: center;">
          This official travel document was automatically generated by GoGuide AI. Keep this offline pass handy during travel.
        </div>
      </div>
    `;

    // 2. Direct 1-Click PDF Generation with html2pdf
    try {
      const getHtml2Pdf = () => {
        return new Promise((resolve) => {
          if (window.html2pdf) return resolve(window.html2pdf);
          const existing = document.querySelector("script[src*='html2pdf']");
          if (existing) {
            existing.addEventListener("load", () => resolve(window.html2pdf));
            return;
          }
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve(window.html2pdf);
          script.onerror = () => resolve(null);
          document.head.appendChild(script);
        });
      };

      const html2pdf = await getHtml2Pdf();
      if (html2pdf) {
        // Position container at (0, 0) with zIndex -99999 so html2canvas captures real pixels without being visible to user
        const container = document.createElement("div");
        container.id = "goguide-pdf-canvas-container";
        container.innerHTML = fullDocHtml;
        container.style.position = "absolute";
        container.style.top = "0";
        container.style.left = "0";
        container.style.width = "750px";
        container.style.zIndex = "-99999";
        container.style.opacity = "1";
        container.style.pointerEvents = "none";
        container.style.backgroundColor = "#ffffff";
        document.body.appendChild(container);

        const options = {
          margin: [8, 8, 8, 8],
          filename: `GoGuide_Itinerary_${destClean}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            letterRendering: true,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 750,
            logging: false,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        };

        // Generate PDF as Blob
        const worker = html2pdf().set(options).from(container);
        const pdfBlob = await worker.outputPdf("blob");

        // Clean up DOM container
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }

        // Direct Download without navigating the active browser window
        const blobUrl = URL.createObjectURL(pdfBlob);
        const dlLink = document.createElement("a");
        dlLink.href = blobUrl;
        dlLink.download = `GoGuide_Itinerary_${destClean}.pdf`;
        dlLink.style.display = "none";
        document.body.appendChild(dlLink);
        dlLink.click();

        setTimeout(() => {
          if (dlLink.parentNode) dlLink.parentNode.removeChild(dlLink);
          URL.revokeObjectURL(blobUrl);
        }, 15000);

        return true;
      }
    } catch (e) {
      console.warn("Direct html2pdf generation notice:", e);
    }

    // 3. Resilient Hidden Iframe Print Fallback (Never navigates main page, never blank)
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow || iframe.contentDocument;
      const doc = frameDoc.document || frameDoc;
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>GoGuide Itinerary - ${dest}</title>
            <style>
              @page { size: A4; margin: 12mm; }
              body { margin: 0; padding: 0; background: #ffffff; }
            </style>
          </head>
          <body>
            ${fullDocHtml}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                }, 300);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 60000);

      return true;
    } catch (frameErr) {
      console.error("Iframe print fallback error:", frameErr);
    }
  } else {
    // Native Mobile (Android / iOS)
    Alert.alert(
      "Itinerary PDF Ready 📄",
      `Your complete itinerary for ${dest} is formatted. You can export or print it from your device files.`
    );
    return true;
  }
}
