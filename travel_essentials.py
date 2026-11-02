"""
Zero-Token Offline Travel Intelligence Engine
---------------------------------------------
Provides 100% free, offline, instant travel logistics for:
- Visa & passport guidelines
- Seasonal festivals & events
- Emergency hotlines & health advisories
- Currency, payments, and tipping culture
"""


def get_visa_guidelines(destination: str) -> str:
    """Check tourist visa rules, passport validity, and entry requirements."""
    dest_lower = (destination or "").lower().strip()

    if any(c in dest_lower for c in ["dubai", "uae", "abu dhabi"]):
        rules = (
            "- Visa on Arrival: 70+ nationalities (US, UK, EU, Canada, Australia, Japan, etc.) receive free 30-day stamp.\n"
            "- Pre-arranged eVisa: 30-day or 60-day tourist visa available online via airlines (Emirates/FlyDubai) or GDRFA.\n"
            "- GCC Residents: Eligible for special GCC resident online entry permits."
        )
    elif any(c in dest_lower for c in ["paris", "france", "rome", "italy", "amsterdam", "schengen", "germany", "spain", "europe"]):
        rules = (
            "- Schengen Area: 90 days stay within 180-day rolling window.\n"
            "- Visa-exempt countries (US, UK, Canada, Australia) require ETIAS pre-authorization.\n"
            "- Other nationalities require a Schengen Type C Tourist Visa applied at destination embassy with biometric appointment."
        )
    elif any(c in dest_lower for c in ["london", "uk", "united kingdom", "scotland"]):
        rules = (
            "- UK Standard Visitor Visa: Allows up to 6 months stay for tourism.\n"
            "- Visa-exempt nationalities require UK ETA (Electronic Travel Authorisation).\n"
            "- Note: UK is NOT part of Schengen; separate UK visa required even if you hold a European Schengen visa."
        )
    elif any(c in dest_lower for c in ["istanbul", "turkey", "turkiye"]):
        rules = (
            "- Official e-Visa (evisa.gov.tr): Available in 3 minutes for 100+ countries.\n"
            "- Conditional e-Visa: Holders of valid US, UK, Ireland, or Schengen visas can obtain instant Turkish e-Visa online.\n"
            "- Visa-free: EU, UK, and several South American citizens enter visa-free up to 90 days."
        )
    elif any(c in dest_lower for c in ["lahore", "pakistan", "karachi", "islamabad"]):
        rules = (
            "- Pakistan Online Visa Portal (visa.nadra.gov.pk): Tourist eVisa issued within 48-72 hours.\n"
            "- Visa on Arrival (Tourist): 60+ countries eligible for Electronic Travel Authorization (ETA) prior to arrival."
        )
    elif any(c in dest_lower for c in ["tokyo", "japan", "kyoto", "osaka"]):
        rules = (
            "- Visa-free for 68+ countries (US, Canada, UK, EU, Australia, Singapore) up to 90 days.\n"
            "- Japan eVisa available online for eligible residents of select countries."
        )
    elif any(c in dest_lower for c in ["bangkok", "thailand", "phuket"]):
        rules = (
            "- 30 to 60-day visa exemption for 93 countries.\n"
            "- Visa on Arrival (15 days) available at major international airports."
        )
    else:
        rules = (
            "- General Tourist Visa: Check online eVisa availability at official government immigration portals.\n"
            "- Many popular tourist hubs offer streamlined 30-day eVisa or Visa-on-Arrival."
        )

    return (
        f"🛂 Visa & Entry Guidelines for {destination.title() if destination else 'your trip'}:\n"
        f"{rules}\n"
        "- Universal Requirements: Passport must have minimum 6 months validity from entry date.\n"
        "- Must-Have Documents: Confirmed return flight ticket, hotel reservation proof, and travel health insurance."
    )


def get_seasonal_events(city: str) -> str:
    """Discover major seasonal festivals, cultural events, and celebrations."""
    city_lower = (city or "").lower().strip()

    if "dubai" in city_lower:
        events = (
            "- Dubai Shopping Festival (Dec - Jan): Massive citywide mega-sales, fireworks, and concerts.\n"
            "- Ramadan & Eid Celebrations: Night markets, authentic iftar tents, and family festivities.\n"
            "- Dubai Food Festival (April - May): Street food carnivals and exclusive fine-dining chef tables."
        )
    elif "paris" in city_lower:
        events = (
            "- Bastille Day (July 14): Spectacular military parade on Champs-Élysées and Eiffel Tower fireworks.\n"
            "- Paris Fashion Week (Feb/March & Sept/Oct): Designer runways and buzzing nightlife.\n"
            "- Christmas Markets (Dec): Festive chalets at Tuileries Garden and illuminated boulevard displays."
        )
    elif "istanbul" in city_lower:
        events = (
            "- Istanbul Tulip Festival (April): Over 30 million vibrant tulips blooming in Emirgan and Gülhane parks.\n"
            "- Bosphorus Cross-Continental Swim (July/August): Legendary open-water race between Asia and Europe.\n"
            "- Istanbul International Jazz & Film Festivals (Spring/Summer): Waterfront open-air concerts."
        )
    elif "london" in city_lower:
        events = (
            "- Wimbledon Tennis Championships (July): Historic grass-court tennis and strawberries & cream.\n"
            "- Notting Hill Carnival (August Bank Holiday): Europe's largest Caribbean street party with vibrant floats.\n"
            "- Hyde Park Winter Wonderland (Nov - Jan): Giant observation wheel, ice skating, and festive circus."
        )
    elif "lahore" in city_lower:
        events = (
            "- Lahore Literary Festival (LLF - February): Premier international festival of arts, ideas, and literature.\n"
            "- Mela Chiraghan (Festival of Lights - March): Historic Sufi gathering celebrating Madho Lal Hussain.\n"
            "- Horse & Cattle Show / Spring Floral Gala (Spring): Traditional folk dances, polo, and vibrant flower displays."
        )
    elif "tokyo" in city_lower:
        events = (
            "- Cherry Blossom Season (Sakura - late March to April): Hanami picnics under blooming cherry trees in Ueno & Shinjuku Gyoen.\n"
            "- Sumida River Fireworks Festival (Late July): Ancient summer celebration with 20,000 fireworks over Tokyo.\n"
            "- Meiji Shrine Autumn Grand Festival (Nov 1-3): Traditional archery (Yabusame) and cultural performances."
        )
    else:
        events = (
            "- National Independence Day & Cultural Heritage Days: Parades, fireworks, and museum free-entry days.\n"
            "- Seasonal Night Markets & Street Food Carnivals: Vibrant local artisan gatherings."
        )

    return (
        f"🎉 Major Seasonal Events & Cultural Highlights for {city.title() if city else 'Destination'}:\n"
        f"{events}\n"
        "Tip: Book accommodation and attraction tickets well in advance if traveling during a major festival."
    )


def get_emergency_and_health(city: str) -> str:
    """Get verified emergency numbers, healthcare advice, and tap water safety."""
    city_lower = (city or "").lower().strip()

    if any(c in city_lower for c in ["dubai", "uae", "abu dhabi"]):
        contacts = "Police: 999 | Ambulance: 998 | Fire: 997 | Tourist Police Hotline: 901"
        water = "Tap water is safe for brushing/cooking; bottled or filtered water is preferred for drinking."
    elif any(c in city_lower for c in ["london", "uk", "united kingdom"]):
        contacts = "Emergency (Police / Ambulance / Fire): 999 or 112 | Non-emergency medical: 111"
        water = "Tap water is 100% strictly tested, pristine, and safe to drink."
    elif any(c in city_lower for c in ["paris", "france", "rome", "italy", "amsterdam", "madrid", "berlin"]):
        contacts = "European Universal Emergency Number: 112 | Medical SAMU (France): 15 | Police: 17"
        water = "Tap water is completely safe and potable throughout public cafes and hotels."
    elif any(c in city_lower for c in ["istanbul", "turkey"]):
        contacts = "Unified Emergency Call: 112 (Police, Ambulance, Fire) | Tourist Police: +90 212 527 4503"
        water = "Bottled water is universally recommended for drinking; readily available everywhere for cheap."
    elif any(c in city_lower for c in ["lahore", "pakistan", "karachi", "islamabad"]):
        contacts = "Rescue 1122 (Ambulance/Fire) | Police Helpline: 15 | Tourist Helpline: 1421"
        water = "Only consume sealed bottled mineral water (Nestle/Aquafina) or boiled water."
    elif any(c in city_lower for c in ["tokyo", "japan", "kyoto", "osaka"]):
        contacts = "Police: 110 | Ambulance / Fire: 119 | Japan Helpline: 0570-000-911"
        water = "Tap water is strictly regulated, mineral-rich, and safe to drink anywhere."
    else:
        contacts = "Universal Emergency (GSM): 112 or 911 | Inquire at your hotel front desk upon arrival."
        water = "When uncertain, consume sealed bottled water and avoid iced drinks from street vendors."

    return (
        f"🚨 Emergency & Health Brief for {city.title() if city else 'your destination'}:\n"
        f"- Emergency Hotlines: {contacts}\n"
        f"- Drinking Water Safety: {water}\n"
        "- Travel Pharmacy Kit: Carry personal prescriptions in original boxes, rehydration salts, and basic painkillers."
    )


def get_currency_and_payments(city: str) -> str:
    """Provide local currency information, payment norms (cash vs card), and tipping etiquette."""
    city_lower = (city or "").lower().strip()

    cash_preferred = {"lahore", "karachi", "cairo", "hanoi", "kathmandu", "delhi", "mumbai", "bangkok"}
    card_dominant = {"london", "new york", "amsterdam", "paris", "tokyo", "singapore", "dubai", "sydney"}

    if any(c in city_lower for c in card_dominant):
        payment_mode = "Credit/Debit cards, Apple Pay, and contactless payments are accepted almost everywhere. Minimal cash needed."
    elif any(c in city_lower for c in cash_preferred):
        payment_mode = "Cash is king for street markets, local transit, and small dining. Keep local currency bills on hand; cards accepted at major malls/hotels."
    else:
        payment_mode = "Hybrid: Cards widely accepted at hotels and restaurants; carry moderate local cash for small purchases and taxis."

    return (
        f"💵 Payment & Currency Guidance for {city.title() if city else 'your destination'}:\n"
        f"- Payment Norm: {payment_mode}\n"
        "- ATM Tip: Use bank-attached ATMs during business hours to avoid foreign card skimmers.\n"
        "- Tipping: 5-10% in casual dining if service charge is not included; rounding up taxi fares is customary."
    )

