import React from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";

import { Colors } from "../constants/constants";

// Haversine formula to compute distance between coordinates in km
function computeDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function DayRouteModal({ visible, day, destination, onClose, theme }) {
  if (!day) return null;

  const activities = day.activities || [];

  const triggerHaptic = () => {
    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {}
  };

  // Launch full multi-stop navigation in Google Maps
  const openFullDayRoute = () => {
    triggerHaptic();
    if (activities.length === 0) return;

    const origin = encodeURIComponent(
      activities[0].placeName + " " + (destination || "")
    );
    const dest = encodeURIComponent(
      activities[activities.length - 1].placeName + " " + (destination || "")
    );

    let waypointsParam = "";
    if (activities.length > 2) {
      const waypoints = activities
        .slice(1, -1)
        .map((a) => a.placeName + " " + (destination || ""))
        .join("|");
      waypointsParam = `&waypoints=${encodeURIComponent(waypoints)}`;
    }

    const routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypointsParam}&travelmode=driving`;
    Linking.openURL(routeUrl);
  };

  // Open single stop directions
  const openSingleStop = (act) => {
    triggerHaptic();
    let query = "";
    if (act.coordinates?.lat && act.coordinates?.lng && act.coordinates.lat !== 0) {
      query = `${act.coordinates.lat},${act.coordinates.lng}`;
    } else {
      query = encodeURIComponent(act.placeName + " " + (destination || ""));
    }
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`);
  };

  // Compute map bounding box for Web OpenStreetMap embed
  const validCoords = activities
    .map((a) => a.coordinates)
    .filter((c) => c?.lat && c?.lng && c.lat !== 0 && c.lng !== 0);

  let mapUrl = null;
  if (validCoords.length > 0) {
    const lats = validCoords.map((c) => c.lat);
    const lngs = validCoords.map((c) => c.lng);
    const minLat = Math.min(...lats) - 0.03;
    const maxLat = Math.max(...lats) + 0.03;
    const minLng = Math.min(...lngs) - 0.03;
    const maxLng = Math.max(...lngs) + 0.03;
    mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${validCoords[0].lat}%2C${validCoords[0].lng}`;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        {/* Modal Header */}
        <View style={[styles.header, { borderBottomColor: theme.isDark ? "#282828" : "#E5E7EB" }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.badgeRow}>
              <View style={styles.dayPill}>
                <Text style={styles.dayPillText}>Day {day.day}</Text>
              </View>
              <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
                {activities.length} Stops Planned
              </Text>
            </View>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {day.theme || "Daily Route Overview"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: theme.isDark ? "#282828" : "#F3F4F6" }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Live Map Preview on Web or Visual GPS Banner */}
          {Platform.OS === "web" && mapUrl ? (
            <View style={styles.mapFrameWrapper}>
              <iframe
                title="Route Map"
                width="100%"
                height="220"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src={mapUrl}
                style={{ borderRadius: 16, border: "none" }}
              />
              <View style={styles.mapOverlayHint}>
                <Ionicons name="compass" size={14} color="#FFFFFF" />
                <Text style={styles.mapOverlayHintText}>OpenStreetMap Real-time Coordinates</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.nativeMapCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.mapCardLeft}>
                <View style={styles.mapIconCircle}>
                  <Ionicons name="map" size={24} color={Colors.PRIMARY} />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.nativeMapTitle, { color: theme.text }]}>Visual Waypoint Route</Text>
                  <Text style={[styles.nativeMapSubtitle, { color: theme.subtext }]}>
                    {destination ? `Optimized for travel in ${destination}` : "Sequential transit line"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Sequential Waypoint Timeline */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Sequential Stop Order</Text>

          <View style={styles.waypointsList}>
            {activities.map((act, idx) => {
              const isLast = idx === activities.length - 1;
              const nextAct = !isLast ? activities[idx + 1] : null;
              const dist =
                nextAct &&
                act.coordinates?.lat &&
                nextAct.coordinates?.lat
                  ? computeDistanceKm(
                      act.coordinates.lat,
                      act.coordinates.lng,
                      nextAct.coordinates.lat,
                      nextAct.coordinates.lng
                    )
                  : null;

              return (
                <View key={idx} style={styles.waypointRow}>
                  {/* Left Column: Numbered Badge & Connecting Line */}
                  <View style={styles.connectorCol}>
                    <View style={styles.stopNumCircle}>
                      <Text style={styles.stopNumText}>{idx + 1}</Text>
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.verticalConnectorLine,
                          { backgroundColor: Colors.PRIMARY + "40" },
                        ]}
                      />
                    )}
                  </View>

                  {/* Right Column: Place Card */}
                  <View style={[styles.waypointCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.waypointCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.timeLabel, { color: Colors.PRIMARY }]}>
                          {act.time || `Stop ${idx + 1}`}
                        </Text>
                        <Text style={[styles.placeName, { color: theme.text }]}>
                          {act.placeName}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.navigateMiniBtn}
                        onPress={() => openSingleStop(act)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="navigate" size={14} color="#10B981" />
                        <Text style={styles.navigateMiniText}>Go</Text>
                      </TouchableOpacity>
                    </View>

                    {act.details && (
                      <Text style={[styles.placeDetails, { color: theme.subtext }]} numberOfLines={2}>
                        {act.details}
                      </Text>
                    )}

                    {/* Distance indicator to next stop */}
                    {!isLast && (
                      <View style={[styles.legBadge, { backgroundColor: theme.isDark ? "#242424" : "#F3F4F6" }]}>
                        <Ionicons name="arrow-down" size={11} color={theme.subtext} />
                        <Text style={[styles.legText, { color: theme.subtext }]}>
                          {dist ? `~${dist} km to Stop ${idx + 2}` : `Next stop in route`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Floating Navigation Action */}
        <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.isDark ? "#282828" : "#E5E7EB" }]}>
          <TouchableOpacity
            style={styles.fullRouteBtn}
            onPress={openFullDayRoute}
            activeOpacity={0.85}
          >
            <Ionicons name="map" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.fullRouteBtnText}>Launch Day Route in Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  dayPill: {
    backgroundColor: Colors.PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dayPillText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Outfit-Medium",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  mapFrameWrapper: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(10, 126, 164, 0.2)",
  },
  mapOverlayHint: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  mapOverlayHintText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: "Outfit-Medium",
  },
  nativeMapCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  mapCardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.PRIMARY + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  nativeMapTitle: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
  nativeMapSubtitle: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Outfit-Bold",
    marginBottom: 14,
  },
  waypointsList: {
    paddingLeft: 4,
  },
  waypointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  connectorCol: {
    alignItems: "center",
    width: 32,
    marginRight: 12,
  },
  stopNumCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  stopNumText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Outfit-Bold",
  },
  verticalConnectorLine: {
    width: 2,
    flex: 1,
    minHeight: 50,
    marginTop: 4,
  },
  waypointCard: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  waypointCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  timeLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  placeName: {
    fontSize: 16,
    fontFamily: "Outfit-Bold",
    marginTop: 2,
  },
  placeDetails: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    marginTop: 6,
    lineHeight: 18,
  },
  navigateMiniBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B98115",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  navigateMiniText: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    color: "#10B981",
  },
  legBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 10,
    gap: 4,
  },
  legText: {
    fontSize: 11,
    fontFamily: "Outfit-Medium",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 1,
  },
  fullRouteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.PRIMARY,
    paddingVertical: 15,
    borderRadius: 16,
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  fullRouteBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Outfit-Bold",
  },
});
