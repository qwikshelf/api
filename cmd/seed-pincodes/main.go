package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/qwikshelf/api/internal/adapter/secondary/postgres"
	"github.com/qwikshelf/api/internal/config"
	"github.com/qwikshelf/api/internal/domain/entity"
)

type GeoJSON struct {
	Type     string `json:"type"`
	Features []struct {
		Type       string                 `json:"type"`
		Properties map[string]interface{} `json:"properties"`
		Geometry   interface{}            `json:"geometry"`
	} `json:"features"`
}

func main() {
	geoPath := flag.String("geojson", "", "Path to GeoJSON file")
	zoneID := flag.Int64("zone", 0, "Default Zone ID to link pincodes to")
	flag.Parse()

	if *geoPath == "" {
		log.Fatal("GeoJSON path is required, usage: seed-pincodes -geojson data.json -zone 1")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load config:", err)
	}

	db, err := postgres.NewConnection(cfg.Database)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	pincodeRepo := postgres.NewPincodeRepository(db)
	ctx := context.Background()

	file, err := os.ReadFile(*geoPath)
	if err != nil {
		log.Fatal("Failed to read GeoJSON:", err)
	}

	var data GeoJSON
	if err := json.Unmarshal(file, &data); err != nil {
		log.Fatal("Failed to parse GeoJSON:", err)
	}

	fmt.Printf("Seeding %d features...\n", len(data.Features))

	for _, feat := range data.Features {
		pincode, ok := feat.Properties["Pincode"].(string)
		if !ok {
			// Try "pincode" lowercase
			pincode, ok = feat.Properties["pincode"].(string)
			if !ok {
				fmt.Println("Skipping feature without Pincode property")
				continue
			}
		}

		// Convert geometry back to JSON string for PostGIS
		geomJSON, _ := json.Marshal(feat.Geometry)

		geoData := &entity.PincodeGeoData{
			Pincode:  pincode,
			Boundary: string(geomJSON), // Repository uses ST_GeomFromGeoJSON if we update it, or we use ST_GeomFromText if we convert. 
			// Wait, my repository use ST_GeomFromText. I should either update repo to use ST_GeomFromGeoJSON or convert here.
			// Let's update repo to use ST_GeomFromGeoJSON as it's cleaner for this tool.
			Metadata: feat.Properties,
		}

		// Calculate center (simple centroid or keep it empty for now)
		// For simplicity, we'll let PostGIS handle it if we add a trigger or do it in Repo.

		fmt.Printf("Processing %s...\n", pincode)
		
		// 1. Save GeoData
		if err := pincodeRepo.SaveGeoData(ctx, geoData); err != nil {
			fmt.Printf("Error saving geo for %s: %v\n", pincode, err)
			continue
		}

		// 2. Map to Zone if provided
		if *zoneID > 0 {
			if err := pincodeRepo.MapPincodeToZone(ctx, pincode, *zoneID); err != nil {
				fmt.Printf("Error mapping %s to zone %d: %v\n", pincode, *zoneID, err)
			}
		}
	}

	fmt.Println("Seeding completed!")
}
