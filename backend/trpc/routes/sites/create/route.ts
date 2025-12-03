import { protectedProcedure } from "../../../create-context";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

export default protectedProcedure
  .input(z.object({
    projectId: z.string().uuid(),
    name: z.string().min(1),
    areaHa: z.number().positive(),
    latitude: z.number(),
    longitude: z.number(),
    polygon: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
    })).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[tRPC] Creating site:', input.name);
    
    let geom = null;
    let centroid = null;
    let bbox = null;

    if (input.polygon && input.polygon.length >= 3) {
      const coords = input.polygon.map(p => `${p.longitude} ${p.latitude}`).join(',');
      const firstCoord = input.polygon[0];
      const closedCoords = `${coords},${firstCoord.longitude} ${firstCoord.latitude}`;
      
      geom = `SRID=4326;MULTIPOLYGON(((${closedCoords})))`;
      
      const centerLat = input.polygon.reduce((sum, p) => sum + p.latitude, 0) / input.polygon.length;
      const centerLng = input.polygon.reduce((sum, p) => sum + p.longitude, 0) / input.polygon.length;
      centroid = `SRID=4326;POINT(${centerLng} ${centerLat})`;
    } else {
      centroid = `SRID=4326;POINT(${input.longitude} ${input.latitude})`;
    }

    const { data, error } = await supabase
      .from('sites')
      .insert({
        project_id: input.projectId,
        name: input.name,
        area_ha: input.areaHa,
        geom,
        centroid,
        bbox,
      })
      .select()
      .single();

    if (error) {
      console.error('[tRPC] Error creating site:', error);
      throw new Error(error.message);
    }

    console.log('[tRPC] Site created:', data.id);
    return data;
  });
