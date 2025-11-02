import { useState, useEffect } from "react";

export function usePrecipitation(municipio = "TOCANCIPÁ") {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // URL de la API
      const url = `https://www.datos.gov.co/resource/s54a-sgyg.json?$where=municipio='${encodeURIComponent(
        municipio
      )}' AND valorobservado > 0&$order=fechaobservacion DESC&$limit=100`;

      try {
        const res = await fetch(url);
        const json = await res.json();

        // Convertir valorobservado a número
        const filtered = json.map((d) => ({
          ...d,
          valorobservado: Number(d.valorobservado),
          fechaobservacion: new Date(d.fechaobservacion),
        }));

        setData(filtered);
      } catch (err) {
        console.error("Error fetching precipitation data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [municipio]);

  return { data, loading };
}
