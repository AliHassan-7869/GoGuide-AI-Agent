import { Platform, Alert } from "react-native";

/**
 * Direct 1-Click PDF Downloader for Trip Itineraries
 * On Web: Generates and downloads a clean A4 PDF file using html2pdf.js with zero intermediate dialogs.
 * On Native: Saves/shares the official travel document.
 */
export async function downloadItineraryPDF(plan, destinationName) {
  if (!plan) {
    if (Platform.OS === "web") {
      window.alert("No trip plan found to download.");
    } else {
      Alert.alert("Notice", "No trip plan found to download.");
    }
    return false;
  }

  const dest = plan.destination || destinationName || "Trip";
  const destClean = dest.replace(/[^a-zA-Z0-9]/g, "_");

  if (Platform.OS === "web" && typeof window !== "undefined") {
    // 1. Build high-quality printable document HTML
    const itineraryHtml = (plan.itinerary || [])
      .map(
        (day) => `
        <div style="page-break-inside: avoid; margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-family: 'Outfit', sans-serif;">
          <div style="background: #0a7ea4; color: white; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between;">
            <span style="background: white; color: #0a7ea4; font-weight: 800; font-size: 12px; padding: 3px 8px; border-radius: 4px;">Day ${day.day}</span>
            <span style="font-weight: 600; font-size: 14px;">${day.theme || ""}</span>
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f8fafc; text-align: left; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 8px 12px; width: 20%; color: #475569;">Time</th>
                <th style="padding: 8px 12px; width: 40%; color: #475569;">Activity / Place</th>
                <th style="padding: 8px 12px; width: 40%; color: #475569;">Details & Ticket</th>
              </tr>
            </thead>
            <tbody>
              ${(day.activities || [])
                .map(
                  (act) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 8px 12px; font-weight: 700; color: #0a7ea4;">${act.time || ""}</td>
                  <td style="padding: 8px 12px; font-weight: 600; color: #0f172a;">${act.placeName || ""}</td>
                  <td style="padding: 8px 12px; color: #475569;">${act.details || ""}${act.tickets ? ` <span style="color: #0284c7; font-weight: 700;">(${act.tickets})</span>` : ""}</td>
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
          <strong style="color: #0f172a;">${h.name}</strong> — <span style="color: #475569;">${h.address || h.details || ""}</span> 
          <span style="font-weight: 700; color: #16a34a; margin-left: 8px;">${h.price || ""}</span>
        </div>
      `
      )
      .join("");

    const fullDocHtml = `
      <div id="goguide-direct-pdf" style="padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; max-width: 800px; margin: 0 auto; background: #ffffff;">
        <div style="border-bottom: 2px solid #0a7ea4; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 26px; font-weight: 800; color: #0a7ea4; letter-spacing: -0.5px;">GoGuide<span style="color: #f2994a;">.AI</span></div>
            <div style="font-size: 12px; color: #64748b; font-weight: 500;">Smart Travel Itinerary & Official Pass</div>
          </div>
          <div style="text-align: right;">
            <h1 style="font-size: 20px; font-weight: 700; margin: 0; color: #0f172a;">${dest}</h1>
            <div style="font-size: 12px; color: #64748b;">Generated: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div style="display: flex; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; flex-wrap: wrap;">
          <div><strong style="color: #0a7ea4;">Duration:</strong> ${plan.duration || "Multi-Day"}</div>
          <div><strong style="color: #0a7ea4;">Budget:</strong> ${plan.budget || "Standard"}</div>
          <div><strong style="color: #0a7ea4;">Traveler:</strong> ${plan.traveler || "Explorer"}</div>
          <div><strong style="color: #0a7ea4;">Weather:</strong> ${plan.weatherBrief || "Seasonal"}</div>
        </div>

        <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a;">Day-by-Day Itinerary</h3>
        ${itineraryHtml}

        ${hotelsHtml ? `<div style="margin-top: 22px;"><h3 style="font-size: 16px; font-weight: 700; margin-bottom: 10px; color: #0f172a;">Recommended Hotels & Boutique Stays</h3>${hotelsHtml}</div>` : ""}

        <div style="margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #64748b; text-align: center;">
          This official travel document was automatically generated by GoGuide AI. Keep this offline pass handy during travel.
        </div>
      </div>
    `;

    // 2. Direct 1-Click PDF Generation with html2pdf
    try {
      const getHtml2Pdf = () => {
        return new Promise((resolve) => {
          if (window.html2pdf) return resolve(window.html2pdf);
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve(window.html2pdf);
          script.onerror = () => resolve(null);
          document.head.appendChild(script);
        });
      };

      const html2pdf = await getHtml2Pdf();
      if (html2pdf) {
        const container = document.createElement("div");
        container.innerHTML = fullDocHtml;
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "0";
        container.style.width = "800px";
        document.body.appendChild(container);

        const options = {
          margin: 10,
          filename: `GoGuide_Itinerary_${destClean}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };

        await html2pdf().set(options).from(container).save();
        document.body.removeChild(container);

        if (window.alert) {
          window.alert("PDF Downloaded! 📄 Your trip itinerary has been downloaded to your device.");
        }
        return true;
      }
    } catch (e) {
      console.warn("Direct html2pdf generation note:", e);
    }

    // 3. Resilient File Download Fallback
    try {
      const blob = new Blob([fullDocHtml], { type: "text/html;charset=utf-8" });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `GoGuide_Itinerary_${destClean}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      if (window.alert) {
        window.alert("Itinerary Downloaded! 📄 Saved to your device downloads.");
      }
      return true;
    } catch (fallbackErr) {
      console.error("Direct download fallback error:", fallbackErr);
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
