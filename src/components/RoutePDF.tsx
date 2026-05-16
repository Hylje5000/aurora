import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import {
  formatDistance,
  formatDuration,
  profileLabel,
  type PlannedRoute,
  type RouteIntelligence,
  type VehicleProfile,
  type RouteProfile,
} from "@/lib/routing";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    borderBottom: 2,
    borderBottomColor: "#1e293b",
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    color: "#1e293b",
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 5,
    textTransform: "uppercase",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    color: "#1e293b",
    backgroundColor: "#f1f5f9",
    padding: 4,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    fontSize: 9,
    color: "#64748b",
    width: 100,
  },
  value: {
    fontSize: 9,
    color: "#1e293b",
  },
  mapImage: {
    width: "100%",
    height: 320,
    objectFit: "contain",
    marginVertical: 10,
    border: 1,
    borderColor: "#e2e8f0",
  },
  summaryText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: "#334155",
    marginBottom: 4,
  },
  hazardRow: {
    padding: 6,
    borderBottom: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
  },
  severityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  hazardContent: {
    flex: 1,
  },
  hazardMessage: {
    fontSize: 9,
    color: "#1e293b",
  },
  hazardDetails: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 1,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTop: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
});

interface RoutePDFProps {
  plannedRoute: PlannedRoute;
  routeIntelligence: RouteIntelligence;
  routeSummary: string | null;
  routeProfile: RouteProfile;
  vehicle: VehicleProfile;
  mapScreenshot: string;
}

/**
 * Renders a tactical PDF report for a planned route.
 */
export const RoutePDF = ({
  plannedRoute,
  routeIntelligence,
  routeSummary,
  routeProfile,
  vehicle,
  mapScreenshot,
}: RoutePDFProps) => {
  const hazards = [...routeIntelligence.hazards].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  // Simple "markdown" renderer for summary - split by lines and handle headers/bold
  const renderSummary = (text: string) => {
    return text.split("\n").map((line, i) => {
      const isHeader = line.match(/^[0-9]\.|^#|^[A-Z\s]+$/);
      const cleanLine = line.replace(/\*\*|\*|#/g, "");
      if (!cleanLine.trim()) return <View key={i} style={{ height: 4 }} />;
      return (
        <Text
          key={i}
          style={[
            styles.summaryText,
            isHeader ? { fontSize: 10, color: "#1e293b", marginTop: 4 } : {},
          ]}
        >
          {cleanLine}
        </Text>
      );
    });
  };

  return (
    <Document title="Aurora Route Analysis">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AURORA ROUTE ANALYSIS</Text>
          <Text style={{ fontSize: 8, color: "#94a3b8", marginTop: 4 }}>
            Generated: {new Date().toLocaleString()}
          </Text>
        </View>

        {/* Mission Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Mission Overview</Text>
          <View style={{ flexDirection: "row" }}>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.label}>Profile:</Text>
                <Text style={styles.value}>{profileLabel(routeProfile)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Distance:</Text>
                <Text style={styles.value}>
                  {formatDistance(plannedRoute.total_distance_m)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Duration:</Text>
                <Text style={styles.value}>
                  {formatDuration(plannedRoute.total_duration_s)}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.label}>Vehicle:</Text>
                <Text style={styles.value}>{vehicle.label}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Mass:</Text>
                <Text style={styles.value}>{vehicle.mass_t} t</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Dimensions:</Text>
                <Text style={styles.value}>
                  {vehicle.width_m}m (W) x {vehicle.height_m}m (H)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tactical Map */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Tactical Map Overview</Text>
          {}
          {mapScreenshot && (
            <Image src={mapScreenshot} style={styles.mapImage} />
          )}
        </View>

        {/* AI Summary */}
        {routeSummary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              3. Tactical Executive Summary
            </Text>
            {renderSummary(routeSummary)}
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `AURORA - CLASSIFICATION: UNCLASSIFIED // Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>

      {/* Intelligence Annex Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>INTELLIGENCE ANNEX</Text>
          <Text style={{ fontSize: 8, color: "#94a3b8", marginTop: 4 }}>
            Route Hazards & Constraints
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Hazard Assessment</Text>
          <View style={{ flexDirection: "row", marginBottom: 10, fontSize: 8 }}>
            <Text style={{ color: "#ef4444", marginRight: 15 }}>
              CRITICAL: {routeIntelligence.summary.critical}
            </Text>
            <Text style={{ color: "#eab308", marginRight: 15 }}>
              WARNING: {routeIntelligence.summary.warning}
            </Text>
            <Text style={{ color: "#64748b" }}>
              INFO: {routeIntelligence.summary.info}
            </Text>
          </View>

          {hazards.map((hazard) => (
            <View key={hazard.id} style={styles.hazardRow}>
              <View
                style={[
                  styles.severityDot,
                  {
                    backgroundColor:
                      hazard.severity === "critical"
                        ? "#ef4444"
                        : hazard.severity === "warning"
                          ? "#eab308"
                          : "#94a3b8",
                  },
                ]}
              />
              <View style={styles.hazardContent}>
                <Text style={styles.hazardMessage}>
                  [{hazard.type.toUpperCase()}] {hazard.message}
                </Text>
                <Text style={styles.hazardDetails}>
                  Loc: {hazard.coordinates[1].toFixed(5)},{" "}
                  {hazard.coordinates[0].toFixed(5)}
                </Text>
              </View>
            </View>
          ))}
          {hazards.length === 0 && (
            <Text style={{ fontSize: 9, color: "#94a3b8", marginTop: 10 }}>
              No mobility hazards identified for this route profile.
            </Text>
          )}
        </View>

        {routeIntelligence.coverage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Communications Analysis</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Comms Covered:</Text>
              <Text style={styles.value}>
                {routeIntelligence.coverage.covered_pct}%
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Coverage Gaps:</Text>
              <Text style={styles.value}>
                {routeIntelligence.coverage.gap_count}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Maximum Gap:</Text>
              <Text style={styles.value}>
                {formatDistance(routeIntelligence.coverage.longest_gap_m)}
              </Text>
            </View>
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `AURORA - CLASSIFICATION: UNCLASSIFIED // Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
