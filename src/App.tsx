import { useEffect, useRef, useState } from "react";
import Map from "react-map-gl/maplibre";
import { Protocol } from "pmtiles";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faInfo } from "@fortawesome/free-solid-svg-icons";

function App() {
  const mapRef = useRef<any>(null);
  const [activeLayer, setActiveLayer] = useState<"senate" | "assembly">(
    "senate"
  );
  const [showLabels, setShowLabels] = useState(true);
  const [infoExpanded, setInfoExpanded] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [districtData, setDistrictData] = useState<any>({ senate: [], assembly: [] });

  useEffect(() => {
    // Register the PMTiles protocol once when component mounts
    let protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);

    // Cleanup on unmount
    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  const toggleLayer = (layer: "senate" | "assembly") => {
    setActiveLayer(layer);
    setSelectedFeature(null);
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    // Hide all layers first
    map.setLayoutProperty("senate-polygon", "visibility", "none");
    map.setLayoutProperty("senate-line", "visibility", "none");
    map.setLayoutProperty("senate-points", "visibility", "none");
    map.setLayoutProperty("assembly-polygon", "visibility", "none");
    map.setLayoutProperty("assembly-line", "visibility", "none");
    map.setLayoutProperty("assembly-points", "visibility", "none");

     // Reset opacity to normal
     map.setPaintProperty("senate-polygon", "fill-opacity", [
       "case",
       ["get", "activity"],
       0.3,
       0.2
     ]);
     map.setPaintProperty("assembly-polygon", "fill-opacity", [
       "case",
       ["get", "activity"],
       0.3,
       0.2
     ]);

    // Show selected layer
    if (layer === "senate") {
      map.setLayoutProperty("senate-polygon", "visibility", "visible");
      map.setLayoutProperty("senate-line", "visibility", "visible");
      if (showLabels) {
        map.setLayoutProperty("senate-points", "visibility", "visible");
      }
    } else {
      map.setLayoutProperty("assembly-polygon", "visibility", "visible");
      map.setLayoutProperty("assembly-line", "visibility", "visible");
      if (showLabels) {
        map.setLayoutProperty("assembly-points", "visibility", "visible");
      }
    }
  };

  const toggleLabels = () => {
    setShowLabels(!showLabels);
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    const visibility = showLabels ? "none" : "visible";

    if (activeLayer === "senate") {
      map.setLayoutProperty("senate-points", "visibility", visibility);
    } else {
      map.setLayoutProperty("assembly-points", "visibility", visibility);
    }
  };

  const selectDistrictFromDropdown = (districtLabel: string) => {
    if (!mapRef.current || !districtLabel) return;
    const map = mapRef.current.getMap();

    const sourceLayer = activeLayer === "senate" ? "senate" : "assembly";
    const labelField = activeLayer === "senate" ? "senate_district_label" : "assembly_district_label";
    
    // Query features from the map
    const features = map.querySourceFeatures("district-tiles", {
      sourceLayer: sourceLayer,
      filter: ["==", labelField, districtLabel]
    });

    if (features.length > 0) {
      const properties = features[0].properties;
      setInfoExpanded(false);
      setSelectedFeature({ ...properties, layer: activeLayer });

      // Highlight the selected feature
      const polygonLayer = activeLayer === "senate" ? "senate-polygon" : "assembly-polygon";
      map.setPaintProperty(polygonLayer, "fill-opacity", [
        "case",
        ["==", ["get", labelField], districtLabel],
        0.6,
        [
          "case",
          ["get", "activity"],
          0.3,
          0.2
        ],
      ]);
    }
  };

  const handleMapLoad = () => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();

    // Add your PMTiles source from R2 bucket
    map.addSource("district-tiles", {
      type: "vector",
      url: "pmtiles://https://pub-ab0c00b2b5024563855a23efd20fe62b.r2.dev/districts.pmtiles",
    });

    // Load GeoJSON files directly
    Promise.all([
      fetch(
        "https://pub-ab0c00b2b5024563855a23efd20fe62b.r2.dev/senate_points.geojson"
      ).then((response) => response.json()),
      fetch(
        "https://pub-ab0c00b2b5024563855a23efd20fe62b.r2.dev/assembly_points.geojson"
      ).then((response) => response.json()),
    ])
      .then(([senateData, assemblyData]) => {
        // Add sources
        map.addSource("senate-points", {
          type: "geojson",
          data: senateData,
        });

        map.addSource("assembly-points", {
          type: "geojson",
          data: assemblyData,
        });

        // Wait for map to be idle before adding text layers to ensure halos render correctly
        map.once("idle", () => {
          if (!map.getLayer("senate-points")) {
            map.addLayer({
              id: "senate-points",
              type: "symbol",
              source: "senate-points",
              layout: {
                "text-field": ["get", "senate_district_label"],
                "text-size": 12,
                "text-anchor": "center",
                "text-allow-overlap": false,
                "text-ignore-placement": false,
              },
              paint: {
                "text-color": "#000000",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2,
                "text-halo-blur": 1,
              },
            });
          }

          if (!map.getLayer("assembly-points")) {
            map.addLayer({
              id: "assembly-points",
              type: "symbol",
              source: "assembly-points",
              layout: {
                "text-field": ["get", "assembly_district_label"],
                "text-size": 12,
                "text-anchor": "center",
                "text-allow-overlap": false,
                "text-ignore-placement": false,
                visibility: "none",
              },
              paint: {
                "text-color": "#000000",
                "text-halo-color": "#ffffff",
                "text-halo-width": 2,
                "text-halo-blur": 1,
              },
            });
          }
        });
      })
      .catch((error) => {
        console.error("Error loading GeoJSON files:", error);
      });

    // Add click handlers for feature selection and highlighting
    map.on("click", "senate-polygon", (e: any) => {
      const properties = e.features[0].properties;

      setInfoExpanded(false);
      setSelectedFeature({ ...properties, layer: 'senate' });

      // change opacity
      map.setPaintProperty("senate-polygon", "fill-opacity", [
        "case",
        [
          "==",
          ["get", "senate_district_label"],
          properties.senate_district_label,
        ],
        0.6,
        [
          "case",
          ["get", "activity"],
          0.3,
          0.2
        ],
      ]);
    });

    map.on("click", "assembly-polygon", (e: any) => {
      const properties = e.features[0].properties;

      setInfoExpanded(false);
      setSelectedFeature({ ...properties, layer: 'assembly' });

      // change opacity
      map.setPaintProperty("assembly-polygon", "fill-opacity", [
        "case",
        [
          "==",
          ["get", "assembly_district_label"],
          properties.assembly_district_label,
        ],
        0.6,
        [
          "case",
          ["get", "activity"],
          0.3,
          0.2
        ],
      ]);
    });

    // Clear highlights when clicking on empty areas
    map.on("click", (e: any) => {
      // Query features at the click point
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["senate-polygon", "assembly-polygon"],
      });

      if (features.length === 0) {
        // Clicked on no features
        map.setPaintProperty("senate-polygon", "fill-opacity", [
          "case",
          ["get", "activity"],
          0.3,
          0.2
        ]);
        map.setPaintProperty("assembly-polygon", "fill-opacity", [
          "case",
          ["get", "activity"],
          0.3,
          0.2
        ]);
        setInfoExpanded(false);
        setSelectedFeature(null);
      }
    });

    // Change cursor on hover
    map.on("mouseenter", "senate-polygon", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "senate-polygon", () => {
      map.getCanvas().style.cursor = "";
    });

    map.on("mouseenter", "assembly-polygon", () => {
      map.getCanvas().style.cursor = "pointer";
    });

    map.on("mouseleave", "assembly-polygon", () => {
      map.getCanvas().style.cursor = "";
    });

    // Listen for source data events
    map.on("sourcedata", (e: any) => {
      if (e.sourceId === "district-tiles" && e.isSourceLoaded) {
        // Populate district dropdown data
        const senateFeatures = map.querySourceFeatures("district-tiles", {
          sourceLayer: "senate"
        });
        const assemblyFeatures = map.querySourceFeatures("district-tiles", {
          sourceLayer: "assembly"
        });

        const senateDistricts = senateFeatures
          .map((f: any) => ({
            label: f.properties.senate_district_label,
            representative: f.properties.representative
          }))
          .filter((item: any, index: number, self: any[]) => 
            item.label && self.findIndex(s => s.label === item.label) === index
          )
          .sort((a: any, b: any) => a.label.localeCompare(b.label));

        const assemblyDistricts = assemblyFeatures
          .map((f: any) => ({
            label: f.properties.assembly_district_label,
            representative: f.properties.representative
          }))
          .filter((item: any, index: number, self: any[]) => 
            item.label && self.findIndex(s => s.label === item.label) === index
          )
          .sort((a: any, b: any) => a.label.localeCompare(b.label));

        setDistrictData({ senate: senateDistricts, assembly: assemblyDistricts });

        // senate layer
        if (!map.getLayer("senate-polygon")) {
          map.addLayer({
            id: "senate-polygon",
            type: "fill",
            source: "district-tiles",
            "source-layer": "senate",
            layout: { visibility: "visible" },
             paint: {
               "fill-color": "#3388ff",
               "fill-opacity": [
                 "case",
                 ["get", "activity"],
                 0.3,
                 0.2
               ],
             },
          });
        }

        // Add line layer for polygon borders
        if (!map.getLayer("senate-line")) {
          map.addLayer({
            id: "senate-line",
            type: "line",
            source: "district-tiles",
            "source-layer": "senate",
            layout: { visibility: "visible" },
            paint: {
              "line-color": "#484848",
              "line-width": 1,
            },
          });
        }

        // assembly layer
        if (!map.getLayer("assembly-polygon")) {
          map.addLayer({
            id: "assembly-polygon",
            type: "fill",
            source: "district-tiles",
            "source-layer": "assembly",
            layout: { visibility: "none" },
             paint: {
               "fill-color": "#8462C0",
               "fill-opacity": [
                 "case",
                 ["get", "activity"],
                 0.3,
                 0.2
               ],
             },
          });
        }

        // Add line layer for polygon borders
        if (!map.getLayer("assembly-line")) {
          map.addLayer({
            id: "assembly-line",
            type: "line",
            source: "district-tiles",
            "source-layer": "assembly",
            layout: { visibility: "none" },
            paint: {
              "line-color": "#484848",
              "line-width": 1,
            },
          });
        }
      }
    });
  };

  return (
    <div style={{ height: "100vh", width: "100%", position: "relative" }}>
      <Map
        ref={mapRef}
        onLoad={handleMapLoad}
        initialViewState={{
          longitude: -120.081,
          latitude: 37.725,
          zoom: 5.25,
        }}
        style={{ height: "100%", width: "100%" }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
      />

      {/* District Toggle UI */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "white",
          color: "black",
          padding: "6px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: 1000,
        }}
      >
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => toggleLayer("senate")}
            style={{
              padding: "8px 24px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: activeLayer === "senate" ? "#3388ff" : "white",
              color: activeLayer === "senate" ? "white" : "black",
              cursor: "pointer",
            }}
          >
            Senate
          </button>
          <button
            onClick={() => toggleLayer("assembly")}
            style={{
              padding: "8px 16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              background: activeLayer === "assembly" ? "#8462C0" : "white",
              color: activeLayer === "assembly" ? "white" : "black",
              cursor: "pointer",
            }}
          >
            Assembly
          </button>
        </div>
      </div>

      {/* District Dropdown */}
      <div
        style={{
          position: "absolute",
          top: "80px",
          left: "20px",
          background: "white",
          color: "black",
          padding: "6px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: 1000,
        }}
      >
        <select
          value={selectedFeature ? (activeLayer === 'senate' ? selectedFeature.senate_district_label : selectedFeature.assembly_district_label) : ""}
          onChange={(e) => selectDistrictFromDropdown(e.target.value)}
          style={{
            fontSize: "12px",
            fontWeight: "600",
            padding: "8px 10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            background: "white",
            color: "black",
            cursor: "pointer",
            width: "150px",
          }}
        >
          <option value="">Select District</option>
          {(activeLayer === 'senate' ? districtData.senate : districtData.assembly).map((district: any) => (
            <option key={district.label} value={district.label}>
              {district.label} - {district.representative}
            </option>
          ))}
        </select>
      </div>

      {/* Labels Toggle UI */}
      <div
        style={{
          position: "absolute",
          top: "140px",
          left: "20px",
          background: "white",
          color: "black",
          padding: "6px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
          zIndex: 1000,
        }}
      >
        <button
          onClick={toggleLabels}
          style={{
            fontSize: "12px",
            padding: "8px 10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            background: "#F1F1F1",
            color: "black",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <FontAwesomeIcon
            icon={showLabels ? faEye : faEyeSlash}
            style={{ fontSize: "12px" }}
          />
          Labels
        </button>
      </div>

      {/* Feature Detail Panel */}
      {selectedFeature && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
            color: "#333",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
            zIndex: 1000,
            width: "400px",
            overflow: "hidden",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ 
            padding: "12px 16px", 
            fontSize: "12px",
            background: selectedFeature.layer === 'senate' 
              ? 'linear-gradient(135deg, #3587FF 0%, #4A9DFF 100%)' 
              : 'linear-gradient(135deg, #8462C0 0%, #9B7DD4 100%)',
            color: "white",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: "18px", 
                fontWeight: "600",
                color: "white",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)"
              }}>
                {selectedFeature.layer === 'senate' ? selectedFeature.senate_district_name : selectedFeature.assembly_district_name}
              </h2>
              <h3 style={{ 
                margin: 0, 
                fontSize: "15px", 
                fontWeight: "500",
                color: "white",
                textShadow: "0 1px 2px rgba(0,0,0,0.1)"
              }}>{selectedFeature.representative}</h3>
            </div>
          </div>
          <div style={{ 
            padding: "12px 12px", 
            fontSize: "14px",
            maxHeight: "82.5vh",
            overflowY: "auto"
          }}>
            {selectedFeature.activity ? (() => {
              const attributes = [];
              const badgeGradient = selectedFeature.layer === 'senate' 
                ? 'linear-gradient(135deg, #3587FF, #4A9DFF)'
                : 'linear-gradient(135deg, #8462C0, #9B7DD4)';
              
              if (selectedFeature.county_resolution_names) {
                attributes.push({
                  label: `<span style="background: ${badgeGradient}; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 700; margin-right: 6px;">${selectedFeature.county_resolutions_passed}</span>County Resolution${selectedFeature.county_resolutions_passed === 1 ? "" : "s"}`,
                  content: selectedFeature.county_resolution_names.replaceAll(",", "<br />")
                });
              }
              
              if (selectedFeature.city_resolution_names) {
                attributes.push({
                  label: `<span style="background: ${badgeGradient}; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 700; margin-right: 6px;">${selectedFeature.city_resolutions_passed}</span>City Resolution${selectedFeature.city_resolutions_passed === 1 ? "" : "s"}`,
                  content: selectedFeature.city_resolution_names.replaceAll(",", "<br />")
                });
              }
              
              if (selectedFeature.letter_authors) {
                attributes.push({
                  label: `<span style="background: ${badgeGradient}; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 700; margin-right: 6px;">${selectedFeature.number_of_letters}</span>Local Elected Sign-On${selectedFeature.number_of_letters === 1 ? "" : "s"}`,
                  content: selectedFeature.letter_authors.replaceAll(",", "<br />")
                });
              }
              
              if (selectedFeature.walkouts) {
                attributes.push({
                  label: `<span style="background: ${badgeGradient}; color: white; padding: 2px 8px; border-radius: 12px; font-weight: 700; margin-right: 6px;">${selectedFeature.number_of_walkouts}</span>Student Walkout${selectedFeature.number_of_walkouts === 1 ? "" : "s"}`,
                  content: selectedFeature.walkouts.replaceAll(",", "<br />")
                });
              }

              return attributes.map((attr, index) => {
                const bgColor = index % 2 === 0 ? "rgba(248, 249, 250, 0.6)" : "rgba(255, 255, 255, 0.8)";
                return (
                  <div 
                    key={index}
                    style={{
                      margin: 0,
                      padding: "8px 10px",
                      backgroundColor: bgColor,
                      borderRadius: "8px",
                      marginBottom: "6px",
                      border: "1px solid rgba(0,0,0,0.05)",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}
                    dangerouslySetInnerHTML={{
                      __html: `<strong style="color: #444; font-weight: 600;">${attr.label}</strong><ul style="margin: 4px 0 0 0; padding-left: 20px;"><li style="color: #666; line-height: 1.5;">${attr.content.replaceAll("<br />", "</li><li style='color: #666; line-height: 1.5;'>")}</li></ul>`
                    }}
                  />
                );
              });
            })() : (
              <div style={{
                margin: 0,
                padding: "8px 10px",
                backgroundColor: "rgba(248, 249, 250, 0.6)",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.05)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                textAlign: "center"
              }}>
                <i style={{ color: "#999", fontSize: "13px" }}>No activity reported yet</i>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
          color: "#333",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.1)",
          zIndex: 1000,
          transition: "all 0.3s ease",
          overflow: "hidden",
          backdropFilter: "blur(10px)",
        }}
      >
        {infoExpanded ? (
          <div>
            <div style={{ 
              padding: "9px 16px", 
              background: 'linear-gradient(135deg, #3587FF 0%, #4A9DFF 100%)', 
              color: "white",
            }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ 
                  margin: 0, 
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "white",
                  textShadow: "0 1px 2px rgba(0,0,0,0.1)"
                }}>Welcome!</h3>
                <button
                  onClick={() => setInfoExpanded(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "20px",
                    cursor: "pointer",
                    padding: "0",
                    color: "white",
                    opacity: 0.9,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            <div style={{ padding: "12px 16px", fontSize: "14px", lineHeight: "1.6", minWidth: "300px" }}>
              <p style={{ margin: "0 0 12px 0", color: "#555" }}>
                This map shows California legislative districts with information about support for<br /> the{" "}
                <a 
                  href="https://www.makepolluterspayca.com/" 
                  target="_blank"
                  style={{ 
                    color: "#3587FF", 
                    textDecoration: "none",
                    fontWeight: "600"
                  }}
                >
                  Polluters Pay Climate Superfund Act of 2025
                </a> in each of those areas.
              </p>
              <div style={{ 
                padding: "10px 12px",
                backgroundColor: "rgba(248, 249, 250, 0.6)",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.05)"
              }}>
                <strong style={{ color: "#333", fontSize: "13px" }}>How to use the map:</strong>
                <ul style={{ margin: "6px 0 0 0", paddingLeft: "20px", color: "#666" }}>
                  <li style={{ marginBottom: "4px" }}>
                    Click on a district in the map or use the dropdown to view detailed information
                  </li>
                  <li style={{ marginBottom: "4px" }}>
                    Use the buttons in the top left to toggle between Senate and Assembly districts
                  </li>
                  <li>
                    Darker shaded areas indicate activity in that district
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setInfoExpanded(true)}
            style={{
              background: "linear-gradient(135deg, #3587FF 0%, #4A9DFF 100%)",
              border: "none",
              padding: "12px 14px",
              cursor: "pointer",
              fontSize: "20px",
              color: "white",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(53, 135, 255, 0.3)",
              transition: "all 0.2s ease",
            }}
            title="Show Information"
            onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <FontAwesomeIcon icon={faInfo} style={{ fontSize: "18px" }} />
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
