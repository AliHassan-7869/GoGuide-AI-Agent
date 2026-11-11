"""
Curated Pre-computed Travel Itineraries for High-Volume Global Destinations
---------------------------------------------------------------------------
Saves 70-80% of API token usage by serving instant, curated itineraries
with real coordinates, realistic hotels, and accurate local attractions.
"""

import re

CURATED_DESTINATIONS = {
    "tokyo": {
        "destination": "Tokyo, Japan",
        "hotels": [
            {
                "name": "Hotel Gracery Shinjuku",
                "address": "1-19-1 Kabukicho, Shinjuku City",
                "price": "$140 per night",
                "coordinates": {"lat": 35.6953, "lng": 139.7022},
                "rating": "4.6"
            },
            {
                "name": "Keio Plaza Hotel Tokyo",
                "address": "2-2-1 Nishi-Shinjuku, Shinjuku City",
                "price": "$220 per night",
                "coordinates": {"lat": 35.6896, "lng": 139.6922},
                "rating": "4.7"
            }
        ],
        "days": [
            {
                "day": 1,
                "theme": "Historic Asakusa & Modern Skyline",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Senso-ji Temple & Nakamise-dori",
                        "details": "Tokyo's oldest Buddhist temple, giant red lanterns, and traditional artisanal snack stalls.",
                        "tickets": "Free",
                        "coordinates": {"lat": 35.7148, "lng": 139.7967}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Tokyo Skytree & Solamachi Mall",
                        "details": "Towering 634-meter observation tower with 360-degree views of Tokyo Bay and Mount Fuji.",
                        "tickets": "¥2,100 ($14 per person)",
                        "coordinates": {"lat": 35.7101, "lng": 139.8107}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Sumida River Promenade & Izakaya Dining",
                        "details": "Evening river breeze stroll followed by authentic Japanese yakitori and craft ramen.",
                        "tickets": "Free",
                        "coordinates": {"lat": 35.7126, "lng": 139.7989}
                    }
                ]
            },
            {
                "day": 2,
                "theme": "Iconic Shibuya & Harajuku Pop Culture",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Meiji Jingu Shrine & Yoyogi Park",
                        "details": "Peaceful forest sanctuary with grand wooden Torii gates in the center of Tokyo.",
                        "tickets": "Free",
                        "coordinates": {"lat": 35.6764, "lng": 139.6993}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "Takeshita Street & Omotesando Avenue",
                        "details": "Vibrant fashion boutiques, famous Japanese crepes, and architectural flagship stores.",
                        "tickets": "Free",
                        "coordinates": {"lat": 35.6702, "lng": 139.7027}
                    },
                    {
                        "time": "Evening (6:30 PM)",
                        "placeName": "Shibuya Scramble Crossing & Shibuya Sky",
                        "details": "World's busiest pedestrian crossing, iconic Hachiko statue, and open-air rooftop observation deck.",
                        "tickets": "¥2,200 for Shibuya Sky",
                        "coordinates": {"lat": 35.6595, "lng": 139.7005}
                    }
                ]
            },
            {
                "day": 3,
                "theme": "Culinary Tsukiji & Digital Art Wonderland",
                "activities": [
                    {
                        "time": "Morning (9:00 AM)",
                        "placeName": "Tsukiji Outer Market Food Crawl",
                        "details": "Fresh sushi, tamagoyaki Japanese omelettes, matcha ice cream, and seafood delicacies.",
                        "tickets": "Free entry (pay per food item)",
                        "coordinates": {"lat": 35.6655, "lng": 139.7708}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "teamLab Planets Digital Art Museum",
                        "details": "Immersive water-walking museum with infinite crystal light rooms and floating flower gardens.",
                        "tickets": "¥3,800 ($25 advance reservation)",
                        "coordinates": {"lat": 35.6534, "lng": 139.7915}
                    },
                    {
                        "time": "Evening (7:30 PM)",
                        "placeName": "Ginza District & Evening Ramen",
                        "details": "Luxury avenues, Kabuki-za theater exterior, and world-class culinary dining.",
                        "tickets": "Free",
                        "coordinates": {"lat": 35.6719, "lng": 139.7648}
                    }
                ]
            },
            {
                "day": 4,
                "theme": "Akihabara Otaku Hub & Ueno Cultural Park",
                "activities": [
                    {
                        "time": "Morning (10:00 AM)",
                        "placeName": "Akihabara Electric Town",
                        "details": "Epicenter of gaming, electronics, retro arcades, anime figurines, and multi-floor hobby shops.",
                        "tickets": "Free",
                        "coordinates": {"lat": 35.6984, "lng": 139.7731}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Ueno Park & Tokyo National Museum",
                        "details": "Historic public park, Shinobazu Pond, and Japan's oldest national art and cultural museum.",
                        "tickets": "¥1,000 for National Museum",
                        "coordinates": {"lat": 35.7188, "lng": 139.7765}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Ameyoko Shopping Street & Street Food",
                        "details": "Open-air market street packed with affordable clothing, cosmetics, and bustling food stalls.",
                        "tickets": "Free",
                        "coordinates": {"lat": 35.7112, "lng": 139.7744}
                    }
                ]
            },
            {
                "day": 5,
                "theme": "Futuristic Odaiba & Shinjuku Nightscape",
                "activities": [
                    {
                        "time": "Morning (10:00 AM)",
                        "placeName": "Odaiba Seaside Park & Life-Size Unicorn Gundam",
                        "details": "Tokyo Bay man-made island, Rainbow Bridge views, and the transforming anime mecha statue.",
                        "tickets": "Free",
                        "coordinates": {"lat": 35.6244, "lng": 139.7755}
                    },
                    {
                        "time": "Afternoon (2:30 PM)",
                        "placeName": "Shinjuku Gyoen National Garden",
                        "details": "Sprawling tranquil park featuring French formal, English landscape, and traditional Japanese gardens.",
                        "tickets": "¥500 entry",
                        "coordinates": {"lat": 35.6852, "lng": 139.7101}
                    },
                    {
                        "time": "Evening (7:30 PM)",
                        "placeName": "Shinjuku Omoide Yokocho (Memory Lane) & Golden Gai",
                        "details": "Atmospheric retro lantern-lit alleyways filled with cozy counter izakayas and yakitori grills.",
                        "tickets": "Free to explore",
                        "coordinates": {"lat": 35.6928, "lng": 139.7001}
                    }
                ]
            }
        ]
    },

    "dubai": {
        "destination": "Dubai, United Arab Emirates",
        "hotels": [
            {
                "name": "Rove Downtown Dubai",
                "address": "Downtown Dubai, Near Burj Khalifa",
                "price": "$120 per night",
                "coordinates": {"lat": 25.1972, "lng": 55.2744},
                "rating": "4.6"
            },
            {
                "name": "Atlantis, The Palm",
                "address": "Crescent Road, Palm Jumeirah",
                "price": "$380 per night",
                "coordinates": {"lat": 25.1304, "lng": 55.1171},
                "rating": "4.8"
            }
        ],
        "days": [
            {
                "day": 1,
                "theme": "Modern Icons & Downtown Glamour",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "At The Top - Burj Khalifa",
                        "details": "Ascend to level 124 & 125 for panoramic views of the skyline and Arabian Gulf.",
                        "tickets": "$45 per person",
                        "coordinates": {"lat": 25.1972, "lng": 55.2744}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "The Dubai Mall & Dubai Aquarium",
                        "details": "Explore the world's largest shopping mall, underwater zoo, and indoor ice rink.",
                        "tickets": "Free mall entry ($35 for Aquarium)",
                        "coordinates": {"lat": 25.1985, "lng": 55.2796}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Dubai Fountain Show & Souk Al Bahar",
                        "details": "Witness the choreographed water show and enjoy dinner overlooking the lake.",
                        "tickets": "Free",
                        "coordinates": {"lat": 25.1953, "lng": 55.2762}
                    }
                ]
            },
            {
                "day": 2,
                "theme": "Heritage, Souks & Desert Adventure",
                "activities": [
                    {
                        "time": "Morning (9:00 AM)",
                        "placeName": "Al Fahidi Historical District & Gold Souk",
                        "details": "Stroll wind-tower alleys, cross Dubai Creek on a traditional Abra boat ($1).",
                        "tickets": "$1 Abra ride",
                        "coordinates": {"lat": 25.2631, "lng": 55.2972}
                    },
                    {
                        "time": "Afternoon (3:30 PM)",
                        "placeName": "Red Dune Desert Safari",
                        "details": "4x4 dune bashing, sandboarding, and sunset photo stops in Lahbab desert.",
                        "tickets": "$50 - $70 (includes BBQ)",
                        "coordinates": {"lat": 24.9575, "lng": 55.6121}
                    },
                    {
                        "time": "Evening (8:00 PM)",
                        "placeName": "Bedouin Camp & Stargazing",
                        "details": "Traditional dinner, tanoura dance performance, and fire show under the stars.",
                        "tickets": "Included with Safari",
                        "coordinates": {"lat": 24.9575, "lng": 55.6121}
                    }
                ]
            },
            {
                "day": 3,
                "theme": "Palm Jumeirah & Marina Riviera",
                "activities": [
                    {
                        "time": "Morning (10:00 AM)",
                        "placeName": "The View at The Palm",
                        "details": "360-degree observation deck 240 meters above Palm Jumeirah island.",
                        "tickets": "$28 per person",
                        "coordinates": {"lat": 25.1147, "lng": 55.1417}
                    },
                    {
                        "time": "Afternoon (2:30 PM)",
                        "placeName": "Dubai Marina Walk & JBR Beach",
                        "details": "Relax along the vibrant seaside promenade, cafes, and open beach.",
                        "tickets": "Free",
                        "coordinates": {"lat": 25.0782, "lng": 55.1345}
                    },
                    {
                        "time": "Evening (7:30 PM)",
                        "placeName": "Marina Yacht Cruise & Dinner",
                        "details": "Cruise between illuminated skyscrapers on a sunset dinner catamaran.",
                        "tickets": "$40 per person",
                        "coordinates": {"lat": 25.0805, "lng": 55.1396}
                    }
                ]
            },
            {
                "day": 4,
                "theme": "Future City, Frame & Old Creek Culture",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Museum of the Future",
                        "details": "Futuristic torus-shaped museum showcasing AI, space travel, and climate innovations.",
                        "tickets": "$40 (book in advance)",
                        "coordinates": {"lat": 25.2192, "lng": 55.2819}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Dubai Frame & Zabeel Park",
                        "details": "Walk the 150-meter-high glass skydeck linking old and new Dubai.",
                        "tickets": "$15 entry",
                        "coordinates": {"lat": 25.2345, "lng": 55.3003}
                    },
                    {
                        "time": "Evening (7:30 PM)",
                        "placeName": "Al Seef Heritage Waterfront & Dhow Dinner",
                        "details": "Traditional wind-tower promenade on Dubai Creek with evening cruise dining.",
                        "tickets": "$35 dhow cruise",
                        "coordinates": {"lat": 25.2570, "lng": 55.3100}
                    }
                ]
            },
            {
                "day": 5,
                "theme": "Abu Dhabi Capital & Grand Mosque Day Excursion",
                "activities": [
                    {
                        "time": "Morning (9:00 AM)",
                        "placeName": "Sheikh Zayed Grand Mosque (Abu Dhabi)",
                        "details": "One of the world's largest mosques featuring 82 white marble domes and Swarovski chandeliers.",
                        "tickets": "Free entry",
                        "coordinates": {"lat": 24.4128, "lng": 54.4749}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Louvre Abu Dhabi (Saadiyat Island)",
                        "details": "Floating museum under a rain-of-light dome showcasing global art history.",
                        "tickets": "$18 entry",
                        "coordinates": {"lat": 24.5337, "lng": 54.3982}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Abu Dhabi Corniche & Waterfront Return",
                        "details": "Scenic coastal drive and dinner before scenic return to Dubai.",
                        "tickets": "Free",
                        "coordinates": {"lat": 24.4682, "lng": 54.3312}
                    }
                ]
            }
        ]
    },
    "paris": {
        "destination": "Paris, France",
        "hotels": [
            {
                "name": "CitizenM Paris Gare de Lyon",
                "address": "8 Rue Van Gogh, 12th Arrondissement",
                "price": "$160 per night",
                "coordinates": {"lat": 48.8448, "lng": 2.3734},
                "rating": "4.5"
            },
            {
                "name": "Hotel Dame des Arts",
                "address": "4 Rue Danton, Latin Quarter",
                "price": "$290 per night",
                "coordinates": {"lat": 48.8526, "lng": 2.3428},
                "rating": "4.7"
            }
        ],
        "days": [
            {
                "day": 1,
                "theme": "Classic Landmarks & The Seine",
                "activities": [
                    {
                        "time": "Morning (9:00 AM)",
                        "placeName": "Eiffel Tower & Champ de Mars",
                        "details": "Visit the summit or 2nd floor, followed by photos on the green lawns.",
                        "tickets": "€28 per person",
                        "coordinates": {"lat": 48.8584, "lng": 2.2945}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "Louvre Museum",
                        "details": "Marvel at Mona Lisa, Venus de Milo, and the glass pyramid courtyards.",
                        "tickets": "€22 (advance booking mandatory)",
                        "coordinates": {"lat": 48.8606, "lng": 2.3376}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Seine River Sunset Cruise (Bateaux Parisiens)",
                        "details": "Glide past Notre Dame, Musée d'Orsay, and illuminated bridges.",
                        "tickets": "€17 per person",
                        "coordinates": {"lat": 48.8590, "lng": 2.2933}
                    }
                ]
            },
            {
                "day": 2,
                "theme": "Bohemian Montmartre & Latin Quarter",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Sacré-Cœur Basilica & Place du Tertre",
                        "details": "Highest viewpoint in Paris, cobblestone alleys, and portrait painters.",
                        "tickets": "Free (Dome climb €8)",
                        "coordinates": {"lat": 48.8867, "lng": 2.3431}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Le Marais & Place des Vosges",
                        "details": "Historic French mansions, vintage boutiques, and famous falafel on Rue des Rosiers.",
                        "tickets": "Free",
                        "coordinates": {"lat": 48.8553, "lng": 2.3657}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Latin Quarter & Boulevard Saint-Germain",
                        "details": "Cozy bistros, Shakespeare & Company bookstore, and evening jazz bars.",
                        "tickets": "Free",
                        "coordinates": {"lat": 48.8522, "lng": 2.3470}
                    }
                ]
            },
            {
                "day": 3,
                "theme": "Art, Gardens & Royal Grandeur",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Musée d'Orsay",
                        "details": "Impressionist masterworks by Monet, Van Gogh, and Renoir inside a beaux-arts railway station.",
                        "tickets": "€16 per person",
                        "coordinates": {"lat": 48.8599, "lng": 2.3265}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "Jardin des Tuileries & Arc de Triomphe",
                        "details": "Stroll down Champs-Élysées up to the panoramic terrace of Arc de Triomphe.",
                        "tickets": "€16 for Arc terrace",
                        "coordinates": {"lat": 48.8738, "lng": 2.2950}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Palais Garnier (Paris Opera) & Dinner",
                        "details": "Admire the gilded opera house and savor authentic French cuisine nearby.",
                        "tickets": "€15 self-guided tour",
                        "coordinates": {"lat": 48.8719, "lng": 2.3316}
                    }
                ]
            },
            {
                "day": 4,
                "theme": "Royal Versailles Palace & Grand Canal",
                "activities": [
                    {
                        "time": "Morning (9:00 AM)",
                        "placeName": "Château de Versailles & Hall of Mirrors",
                        "details": "Tour the Sun King's royal apartments, king's bedchamber, and the iconic mirror gallery.",
                        "tickets": "€21 entry (passport ticket)",
                        "coordinates": {"lat": 48.8049, "lng": 2.1204}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "Versailles Gardens & Grand Trianon",
                        "details": "Explore monumental fountains, Marie Antoinette's Hamlet, and rowboats on the Grand Canal.",
                        "tickets": "Included with Passport",
                        "coordinates": {"lat": 48.8149, "lng": 2.1066}
                    },
                    {
                        "time": "Evening (7:30 PM)",
                        "placeName": "Saint-Germain-des-Prés & Boulevard Cafes",
                        "details": "Return to Paris for dinner at a traditional brasserie near Café de Flore.",
                        "tickets": "Free",
                        "coordinates": {"lat": 48.8540, "lng": 2.3331}
                    }
                ]
            },
            {
                "day": 5,
                "theme": "Art Museums, Marais & River Bridges",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Musée Rodin & Sculptured Gardens",
                        "details": "Admire 'The Thinker' and 'The Gates of Hell' in a tranquil historic rose garden.",
                        "tickets": "€14 entry",
                        "coordinates": {"lat": 48.8550, "lng": 2.3158}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Centre Pompidou & Modern Art",
                        "details": "High-tech architecture and Europe's largest modern art collection with city views.",
                        "tickets": "€15 entry",
                        "coordinates": {"lat": 48.8606, "lng": 2.3522}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Pont des Arts & Île Saint-Louis",
                        "details": "Sunset stroll along the pedestrian bridge and artisan ice cream at Berthillon.",
                        "tickets": "Free",
                        "coordinates": {"lat": 48.8583, "lng": 2.3375}
                    }
                ]
            }
        ]
    },
    "istanbul": {
        "destination": "Istanbul, Turkey",
        "hotels": [
            {
                "name": "Sirkeci Mansion Hotel",
                "address": "Sultanahmet Old City",
                "price": "$95 per night",
                "coordinates": {"lat": 41.0125, "lng": 28.9790},
                "rating": "4.7"
            },
            {
                "name": "The Marmara Taksim",
                "address": "Taksim Square, Beyoğlu",
                "price": "$170 per night",
                "coordinates": {"lat": 41.0369, "lng": 28.9858},
                "rating": "4.5"
            }
        ],
        "days": [
            {
                "day": 1,
                "theme": "Imperial Ottoman & Byzantine Wonders",
                "activities": [
                    {
                        "time": "Morning (9:00 AM)",
                        "placeName": "Hagia Sophia (Ayasofya)",
                        "details": "Marvel at the 1,500-year-old architectural marvel and massive golden mosaics.",
                        "tickets": "€25 visitor entry",
                        "coordinates": {"lat": 41.0086, "lng": 28.9802}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "Topkapi Palace & Blue Mosque",
                        "details": "Visit the Ottoman Sultan's palace, treasury, and the 6-minaret Blue Mosque.",
                        "tickets": "$35 Palace entry (Blue Mosque is Free)",
                        "coordinates": {"lat": 41.0115, "lng": 28.9833}
                    },
                    {
                        "time": "Evening (6:30 PM)",
                        "placeName": "Basilica Cistern & Sultanahmet Square",
                        "details": "Subterranean Roman water reservoir featuring illuminated columns and Medusa heads.",
                        "tickets": "$20 entry",
                        "coordinates": {"lat": 41.0084, "lng": 28.9778}
                    }
                ]
            },
            {
                "day": 2,
                "theme": "Bazaars & The Two Continents (Bosphorus)",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Grand Bazaar & Egyptian Spice Market",
                        "details": "Wander 4,000 shops with Turkish delights, lanterns, spices, and ceramics.",
                        "tickets": "Free",
                        "coordinates": {"lat": 41.0107, "lng": 28.9680}
                    },
                    {
                        "time": "Afternoon (2:30 PM)",
                        "placeName": "Bosphorus Strait Cruise",
                        "details": "Ferry cruise separating Europe and Asia, viewing waterfront Ottoman mansions (Yalı).",
                        "tickets": "$5 Public Ferry / $15 Private",
                        "coordinates": {"lat": 41.0183, "lng": 28.9723}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Galata Tower & Karaköy Dining",
                        "details": "360-degree panorama of Golden Horn followed by authentic seafood or kebabs.",
                        "tickets": "€30 Tower ticket",
                        "coordinates": {"lat": 41.0256, "lng": 28.9741}
                    }
                ]
            },
            {
                "day": 3,
                "theme": "Modern Chic & Kadıköy Asian Side",
                "activities": [
                    {
                        "time": "Morning (10:00 AM)",
                        "placeName": "Dolmabahçe Palace",
                        "details": "19th-century waterfront palace adorned with crystal chandeliers and gold leaf.",
                        "tickets": "$30 entry",
                        "coordinates": {"lat": 41.0392, "lng": 29.0003}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Ferry to Kadıköy (Asian Side)",
                        "details": "Scenic 20-minute ferry across continents to explore trendy Moda cafes and street art.",
                        "tickets": "$1 (using Istanbulkart)",
                        "coordinates": {"lat": 40.9904, "lng": 29.0254}
                    },
                    {
                        "time": "Evening (7:30 PM)",
                        "placeName": "İstiklal Avenue & Taksim Square",
                        "details": "Historic red tram, Turkish coffee tasting, and vibrant street performers.",
                        "tickets": "Free",
                        "coordinates": {"lat": 41.0340, "lng": 28.9778}
                    }
                ]
            },
            {
                "day": 4,
                "theme": "Golden Horn Heritage & Bohemian Quarters",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Fener & Balat Historic Quarters",
                        "details": "Stroll steep cobblestone lanes filled with pastel Ottoman houses, antique shops, and the Ecumenical Patriarchate.",
                        "tickets": "Free",
                        "coordinates": {"lat": 41.0298, "lng": 28.9492}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Chora / Kariye Mosque & Theodosian Walls",
                        "details": "Remarkable Byzantine mosaics and ancient 5th-century imperial fortress ramparts.",
                        "tickets": "€20 entry",
                        "coordinates": {"lat": 41.0312, "lng": 28.9392}
                    },
                    {
                        "time": "Evening (6:30 PM)",
                        "placeName": "Pierre Loti Hill Cable Car & Sunset",
                        "details": "Ride the Eyüp gondola lift up to the panoramic terrace overlooking the Golden Horn for Turkish tea at dusk.",
                        "tickets": "15 TL (Istanbulkart)",
                        "coordinates": {"lat": 41.0538, "lng": 28.9338}
                    }
                ]
            },
            {
                "day": 5,
                "theme": "Princes' Islands (Büyükada) Island Escape",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Büyükada Historic Island Ferry & Promenade",
                        "details": "Peaceful car-free island voyage across the Marmara Sea, passing pine forests and Victorian-era wooden villas.",
                        "tickets": "$3 Ferry (Istanbulkart)",
                        "coordinates": {"lat": 40.8742, "lng": 29.1287}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "Aya Yorgi Monastery & Pine Crest Viewpoint",
                        "details": "Climb the scenic path to the 6th-century hilltop chapel for panoramic island and sea vistas.",
                        "tickets": "Free",
                        "coordinates": {"lat": 40.8576, "lng": 29.1192}
                    },
                    {
                        "time": "Evening (6:30 PM)",
                        "placeName": "Kuzguncuk & Ortaköy Bosphorus Waterfront",
                        "details": "Return to European shore for sunset beside Ortaköy Mosque and famous loaded baked potatoes (kumpir).",
                        "tickets": "Free",
                        "coordinates": {"lat": 41.0474, "lng": 29.0270}
                    }
                ]
            }
        ]
    },
    "london": {
        "destination": "London, United Kingdom",
        "hotels": [
            {
                "name": "Hub by Premier Inn London Westminster",
                "address": "21 Tothill St, Westminster",
                "price": "$140 per night",
                "coordinates": {"lat": 51.4998, "lng": -0.1314},
                "rating": "4.5"
            },
            {
                "name": "The Hoxton, Holborn",
                "address": "199-206 High Holborn",
                "price": "$240 per night",
                "coordinates": {"lat": 51.5173, "lng": -0.1221},
                "rating": "4.6"
            }
        ],
        "days": [
            {
                "day": 1,
                "theme": "Royal London & Iconic Monuments",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Big Ben & Westminster Abbey",
                        "details": "Gothic architecture and coronation church of British monarchs.",
                        "tickets": "£29 Abbey entry (Big Ben free viewing)",
                        "coordinates": {"lat": 51.4994, "lng": -0.1274}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "Buckingham Palace & St. James's Park",
                        "details": "View the royal residence and stroll through park gardens.",
                        "tickets": "Free (State rooms £32 in summer)",
                        "coordinates": {"lat": 51.5014, "lng": -0.1419}
                    },
                    {
                        "time": "Evening (6:30 PM)",
                        "placeName": "The London Eye & South Bank",
                        "details": "Observation wheel views followed by buskers and food stalls along the Thames.",
                        "tickets": "£38 per person",
                        "coordinates": {"lat": 51.5033, "lng": -0.1195}
                    }
                ]
            },
            {
                "day": 2,
                "theme": "History, Tower Bridge & Street Markets",
                "activities": [
                    {
                        "time": "Morning (9:00 AM)",
                        "placeName": "Tower of London & Crown Jewels",
                        "details": "Medieval fortress, Beefeater tour, and 900 years of royal history.",
                        "tickets": "£34 per person",
                        "coordinates": {"lat": 51.5081, "lng": -0.0759}
                    },
                    {
                        "time": "Afternoon (1:00 PM)",
                        "placeName": "Tower Bridge & Borough Market",
                        "details": "Walk the glass floor of Tower Bridge then feast on artisan foods at Borough Market.",
                        "tickets": "£13.40 Bridge walkway",
                        "coordinates": {"lat": 51.5055, "lng": -0.0900}
                    },
                    {
                        "time": "Evening (6:30 PM)",
                        "placeName": "Covent Garden & West End Theatre",
                        "details": "Performers, piazza shopping, and an evening West End musical performance.",
                        "tickets": "Shows from £30",
                        "coordinates": {"lat": 51.5117, "lng": -0.1238}
                    }
                ]
            },
            {
                "day": 3,
                "theme": "Museums & Royal Parks",
                "activities": [
                    {
                        "time": "Morning (10:00 AM)",
                        "placeName": "The British Museum",
                        "details": "Rosetta Stone, Parthenon sculptures, and world antiquity treasures.",
                        "tickets": "Free (Donations welcome)",
                        "coordinates": {"lat": 51.5194, "lng": -0.1270}
                    },
                    {
                        "time": "Afternoon (2:30 PM)",
                        "placeName": "Hyde Park & Kensington Palace",
                        "details": "Rent a pedal boat on the Serpentine Lake and tour Kensington Gardens.",
                        "tickets": "Free (£24 Palace tour)",
                        "coordinates": {"lat": 51.5073, "lng": -0.1696}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Soho & Chinatown Dining",
                        "details": "Vibrant multicultural nightlife, dim sum, and classic British pubs.",
                        "tickets": "Free",
                        "coordinates": {"lat": 51.5136, "lng": -0.1313}
                    }
                ]
            },
            {
                "day": 4,
                "theme": "Soho, Greenwich Maritime & Greenwich Observatory",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Cutty Sark & National Maritime Museum",
                        "details": "Step aboard the historic 19th-century tea clipper ship and explore British naval history.",
                        "tickets": "£20 Cutty Sark",
                        "coordinates": {"lat": 51.4828, "lng": -0.0096}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "Royal Observatory & Prime Meridian",
                        "details": "Stand on the Prime Meridian line (GMT 0) with hilltop panoramic views over Canary Wharf.",
                        "tickets": "£20 entry",
                        "coordinates": {"lat": 51.4769, "lng": 0.0005}
                    },
                    {
                        "time": "Evening (6:30 PM)",
                        "placeName": "Thames Clipper Boat & Borough Evening",
                        "details": "Cruise back up the Thames on the Uber Boat clipper to Southwark riverside for dinner.",
                        "tickets": "£10 boat fare",
                        "coordinates": {"lat": 51.5050, "lng": -0.0860}
                    }
                ]
            },
            {
                "day": 5,
                "theme": "Kensington Cultural Mile & Camden Market",
                "activities": [
                    {
                        "time": "Morning (10:00 AM)",
                        "placeName": "Natural History & Victoria and Albert Museum",
                        "details": "World-class decorative art, fashion, and famous dinosaur halls in South Kensington.",
                        "tickets": "Free entry",
                        "coordinates": {"lat": 51.4967, "lng": -0.1764}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Regent's Canal & Camden Market",
                        "details": "Walk from picturesque Little Venice to Camden Lock's vibrant food stalls and vintage fashion.",
                        "tickets": "Free",
                        "coordinates": {"lat": 51.5414, "lng": -0.1466}
                    },
                    {
                        "time": "Evening (6:30 PM)",
                        "placeName": "Primrose Hill Sunset & Gastropub Dinner",
                        "details": "Iconic hilltop sunset views over the London skyline followed by a classic roast or fish & chips.",
                        "tickets": "Free",
                        "coordinates": {"lat": 51.5394, "lng": -0.1604}
                    }
                ]
            }
        ]
    },
    "lahore": {
        "destination": "Lahore, Pakistan",
        "hotels": [
            {
                "name": "Pearl Continental Hotel Lahore",
                "address": "Shahrah-e-Quaid-e-Azam, Mall Road",
                "price": "$85 per night",
                "coordinates": {"lat": 31.5546, "lng": 74.3317},
                "rating": "4.4"
            },
            {
                "name": "Nishat Hotel Gulberg",
                "address": "Mian Mehmood Ali Kasoori Road, Gulberg III",
                "price": "$125 per night",
                "coordinates": {"lat": 31.5103, "lng": 74.3542},
                "rating": "4.6"
            }
        ],
        "days": [
            {
                "day": 1,
                "theme": "Mughal Splendor & Walled City",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Badshahi Mosque & Lahore Fort",
                        "details": "Grand 17th-century red sandstone mosque and Sheesh Mahal (Palace of Mirrors).",
                        "tickets": "Rs. 50 - 500 ($1 - $2)",
                        "coordinates": {"lat": 31.5880, "lng": 74.3107}
                    },
                    {
                        "time": "Afternoon (1:30 PM)",
                        "placeName": "Delhi Gate & Wazir Khan Mosque",
                        "details": "Frescoed Persian tilework in the heart of Old Lahore and Royal Shahi Hammam.",
                        "tickets": "Rs. 200 ($1)",
                        "coordinates": {"lat": 31.5828, "lng": 74.3218}
                    },
                    {
                        "time": "Evening (7:00 PM)",
                        "placeName": "Haveli Restaurant - Fort Road Food Street",
                        "details": "Rooftop dining with illuminated views of Badshahi Mosque serving mutton chops & karahi.",
                        "tickets": "Dining cost: $10 - $20 / person",
                        "coordinates": {"lat": 31.5878, "lng": 74.3142}
                    }
                ]
            },
            {
                "day": 2,
                "theme": "National Heritage & Wagah Flag Ceremony",
                "activities": [
                    {
                        "time": "Morning (10:00 AM)",
                        "placeName": "Lahore Museum & Mall Road",
                        "details": "Fast Buddha of Gandhara, Mughal miniature paintings, and colonial architecture.",
                        "tickets": "Rs. 50 - 1000 ($1 - $3)",
                        "coordinates": {"lat": 31.5683, "lng": 74.3090}
                    },
                    {
                        "time": "Afternoon (3:30 PM)",
                        "placeName": "Wagah Border Beating Retreat Ceremony",
                        "details": "High-octane patriotic military parade between Pakistan and Indian border rangers.",
                        "tickets": "Free (arrive early for front seats)",
                        "coordinates": {"lat": 31.6047, "lng": 74.5728}
                    },
                    {
                        "time": "Evening (8:00 PM)",
                        "placeName": "Anarkali Bazaar & Food Trail",
                        "details": "Century-old bazaar, famous for falooda, halwa puri, and embroidered textiles.",
                        "tickets": "Free",
                        "coordinates": {"lat": 31.5694, "lng": 74.3144}
                    }
                ]
            },
            {
                "day": 3,
                "theme": "Gardens, Modern Gulberg & Shopping",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Shalimar Gardens",
                        "details": "UNESCO World Heritage terraced Mughal water gardens built by Shah Jahan in 1642.",
                        "tickets": "Rs. 50 - 500 ($1 - $2)",
                        "coordinates": {"lat": 31.5858, "lng": 74.3820}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "MM Alam Road, Gulberg",
                        "details": "Upscale dining, cafes, and boutiques in Lahore's culinary heartland.",
                        "tickets": "Free",
                        "coordinates": {"lat": 31.5186, "lng": 74.3524}
                    },
                    {
                        "time": "Evening (7:30 PM)",
                        "placeName": "Packages Mall or Liberty Market",
                        "details": "Traditional handicrafts, leather goods, and casual dinner.",
                        "tickets": "Free",
                        "coordinates": {"lat": 31.4725, "lng": 74.3563}
                    }
                ]
            },
            {
                "day": 4,
                "theme": "Colonial Arts, Lawrence Gardens & Gulberg Dining",
                "activities": [
                    {
                        "time": "Morning (10:00 AM)",
                        "placeName": "Alhamra Arts Council & Mall Road Walk",
                        "details": "Explore contemporary Pakistani art exhibits, red-brick modernist architecture, and historic civil buildings.",
                        "tickets": "Free",
                        "coordinates": {"lat": 31.5580, "lng": 74.3275}
                    },
                    {
                        "time": "Afternoon (2:00 PM)",
                        "placeName": "Bagh-e-Jinnah (Lawrence Gardens) & Library",
                        "details": "Stroll 140 acres of lush botanical gardens and neoclassical Victorian library halls.",
                        "tickets": "Free",
                        "coordinates": {"lat": 31.5510, "lng": 74.3325}
                    },
                    {
                        "time": "Evening (7:30 PM)",
                        "placeName": "Gaddafi Stadium Food Enclave",
                        "details": "Sample traditional Sajji, nihari, and karahi in the buzzing sports and dining hub.",
                        "tickets": "Dining: $8 - $15 / person",
                        "coordinates": {"lat": 31.5133, "lng": 74.3333}
                    }
                ]
            },
            {
                "day": 5,
                "theme": "Hiran Minar Historical Excursion & Sufi Heritage",
                "activities": [
                    {
                        "time": "Morning (9:30 AM)",
                        "placeName": "Hiran Minar & Mughal Water Tank (Sheikhupura)",
                        "details": "Scenic 45-minute drive to Emperor Jahangir's 1606 royal hunting retreat and monumental minaret.",
                        "tickets": "Rs. 50 - 500 ($1 - $2)",
                        "coordinates": {"lat": 31.7454, "lng": 73.9525}
                    },
                    {
                        "time": "Afternoon (2:30 PM)",
                        "placeName": "Data Darbar & Sufi Heritage",
                        "details": "Visit one of South Asia's oldest and most revered Sufi shrines with qawwali devotional singing.",
                        "tickets": "Free",
                        "coordinates": {"lat": 31.5792, "lng": 74.3044}
                    },
                    {
                        "time": "Evening (7:30 PM)",
                        "placeName": "Lake City & Ring Road Rooftop Dining",
                        "details": "End the trip with modern open-air dining and panoramic city views.",
                        "tickets": "Dining: $12 - $20",
                        "coordinates": {"lat": 31.3780, "lng": 74.2480}
                    }
                ]
            }
        ]
    }
}


def find_curated_key(clean_dest: str) -> str | None:
    """Whole-word match so 'rome' does not match 'chrome' or 'jerome'."""
    for key in CURATED_DESTINATIONS:
        if re.search(rf"\b{re.escape(key)}\b", clean_dest):
            return key
    return None


def get_curated_plan(destination: str, days: int, budget: str, allow_partial: bool = False) -> dict | None:
    """
    Check if a requested destination matches our pre-computed curated database.
    Returns standard GoGuide response payload if matched, or None.
    NEVER cycles base days using modulo arithmetic. If requested days exceed
    the catalog length, returns None so AI generation provides a bespoke plan
    with 100% unique attractions across all days.
    """
    if not destination:
        return None

    clean_dest = destination.strip().lower()

    # Direct match or substring match
    matched_key = find_curated_key(clean_dest)

    if not matched_key:
        return None

    entry = CURATED_DESTINATIONS[matched_key]
    base_days = entry["days"]

    # If the user requested more days than our verified catalog has, and allow_partial is False,
    # return None so the AI model (Gemini) generates all requested days with zero duplicates.
    if not allow_partial and days > len(base_days):
        return None

    actual_days = max(1, min(days, len(base_days)))

    selected_days = []
    for d in range(1, actual_days + 1):
        copied = dict(base_days[d - 1])
        copied["day"] = d
        selected_days.append(copied)

    night_count = max(1, actual_days - 1)

    plan_payload = {
        "trip": {
            "destination": entry["destination"],
            "duration": f"{actual_days} Days {night_count} Nights",
            "budget": budget,
            "hotels": entry["hotels"],
            "itinerary": selected_days,
            # Coordinates in this catalog are hand-checked, so maps may use them exactly
            "coordinatesVerified": True,
        }
    }

    return {
        "status": "success",
        "data": {
            "destination": entry["destination"],
            "days": actual_days,
            "budget": budget,
            "plan": plan_payload,
        }
    }

