// src/components/ArcGISWebMap.jsx
import { useEffect, useRef } from "react";
import esriConfig from "@arcgis/core/config";
import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import Legend from "@arcgis/core/widgets/Legend";
import LayerList from "@arcgis/core/widgets/LayerList";
import Search from "@arcgis/core/widgets/Search";
import Expand from "@arcgis/core/widgets/Expand";

export default function ArcGISWebMap({ webmapId, region = "Tramo Medio" }) {
  const ref = useRef(null);

  useEffect(() => {
    // Si el webmap está en ese portal, ayuda a acelerar búsquedas:
    esriConfig.portalUrl = "https://cundinamarca-map.maps.arcgis.com";

    const webmap = new WebMap({
      portalItem: { id: webmapId }, // <-- pega aquí el ID del web map
    });

    const view = new MapView({
      container: ref.current,
      map: webmap,
      center: [-73.913, 4.965], // Quebrada Esmeralda aprox
      zoom: 13,
      constraints: { snapToZoom: false },
    });

    // Widgets
    const legend = new Legend({ view });
    const layers = new LayerList({ view });
    const search = new Search({ view });

    view.ui.add(new Expand({ view, content: legend, expandIconClass: "esri-icon-legend" }), "top-right");
    view.ui.add(new Expand({ view, content: layers, expandIconClass: "esri-icon-layers" }), "top-right");
    view.ui.add(search, "top-left");

    // Cuando cargue el webmap, aplica filtro por región si existe el campo
    view.when(async () => {
      try {
        await webmap.loadAll();
        webmap.layers.forEach((lyr) => {
          // Si la capa tiene campo 'region', filtramos
          if (("fields" in lyr) && lyr.fields?.some(f => f.name?.toLowerCase() === "region")) {
            lyr.definitionExpression = `region = '${region}'`;
          }
        });
      } catch {}
    });

    return () => view?.destroy();
  }, [webmapId, region]);

  return <div ref={ref} style={{ width: "100%", height: "78vh", borderRadius: 16, overflow: "hidden" }} />;
}
