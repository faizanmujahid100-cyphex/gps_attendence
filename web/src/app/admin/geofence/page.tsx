'use client';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getGeofence, updateGeofence } from '@/lib/firestore';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/utils';
import type { GeofenceSettings } from '@/types';

const schema = z.object({
  label: z.string().min(1, 'Label required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().min(10).max(5000),
});
type FormData = z.infer<typeof schema>;

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export default function AdminGeofencePage() {
  const { user } = useAuthStore();
  const [geofence, setGeofence] = useState<GeofenceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLat, setPreviewLat] = useState(31.572329);
  const [previewLng, setPreviewLng] = useState(74.303710);
  const [previewRadius, setPreviewRadius] = useState(150);
  const mapRef = useRef<HTMLIFrameElement>(null);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { label: 'GIGCCL Main Campus', latitude: 31.572329, longitude: 74.303710, radiusMeters: 150 },
  });

  const watchedLat = watch('latitude');
  const watchedLng = watch('longitude');
  const watchedRadius = watch('radiusMeters');

  useEffect(() => {
    const num = Number(watchedLat);
    if (!isNaN(num) && num >= -90 && num <= 90) setPreviewLat(num);
  }, [watchedLat]);

  useEffect(() => {
    const num = Number(watchedLng);
    if (!isNaN(num) && num >= -180 && num <= 180) setPreviewLng(num);
  }, [watchedLng]);

  useEffect(() => {
    const num = Number(watchedRadius);
    if (!isNaN(num) && num > 0) setPreviewRadius(num);
  }, [watchedRadius]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getGeofence();
        if (data) {
          setGeofence(data);
          reset({ label: data.label, latitude: data.latitude, longitude: data.longitude, radiusMeters: data.radiusMeters });
          setPreviewLat(data.latitude);
          setPreviewLng(data.longitude);
          setPreviewRadius(data.radiusMeters);
        }
      } catch {
        toast({ title: 'Failed to load geofence', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSaving(true);
    try {
      await updateGeofence({ label: data.label, latitude: data.latitude, longitude: data.longitude, radiusMeters: data.radiusMeters }, user.uid);
      toast({ title: 'Geofence updated successfully', variant: 'success' as never });
      const updated = await getGeofence();
      setGeofence(updated);
    } catch {
      toast({ title: 'Failed to update geofence', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const mapSrc = MAPS_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${previewLat},${previewLng}&zoom=17&maptype=satellite`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${previewLng - 0.003},${previewLat - 0.003},${previewLng + 0.003},${previewLat + 0.003}&layer=mapnik&marker=${previewLat},${previewLng}`;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Geofence Settings</h1>
        <p className="text-muted-foreground text-sm">Configure the GPS attendance boundary for GIGCCL campus</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Map Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" /> Live Map Preview
            </CardTitle>
            <CardDescription>
              Radius: <strong>{previewRadius}m</strong> — Changes update in real-time
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative">
              <iframe
                ref={mapRef}
                src={mapSrc}
                className="w-full h-80 rounded-b-lg"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
              />
              {/* Radius Circle Overlay (visual indicator) */}
              <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                <MapPin className="w-3 h-3 inline mr-1" />
                {previewLat.toFixed(6)}, {previewLng.toFixed(6)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings Form */}
        <Card>
          <CardHeader>
            <CardTitle>Geofence Configuration</CardTitle>
            {geofence && (
              <CardDescription>
                Last updated: {formatDateTime(geofence.updatedAt.toDate())}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label>Location Label *</Label>
                  <Input placeholder="GIGCCL Main Campus" {...register('label')} />
                  {errors.label && <p className="text-xs text-rose-500">{errors.label.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Latitude *</Label>
                    <Input type="number" step="any" placeholder="31.572329" {...register('latitude')} />
                    {errors.latitude && <p className="text-xs text-rose-500">{errors.latitude.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label>Longitude *</Label>
                    <Input type="number" step="any" placeholder="74.303710" {...register('longitude')} />
                    {errors.longitude && <p className="text-xs text-rose-500">{errors.longitude.message}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Radius (meters) *</Label>
                  <Input type="number" min={10} max={5000} placeholder="150" {...register('radiusMeters')} />
                  {errors.radiusMeters && <p className="text-xs text-rose-500">{errors.radiusMeters.message}</p>}
                  <p className="text-xs text-muted-foreground">Recommended: 100–200m for campus boundary</p>
                </div>

                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Default GIGCCL Coordinates:</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Lat: 31.572329 | Lng: 74.303710 | Radius: 150m</p>
                </div>

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</> : <><Save className="w-4 h-4 mr-1" /> Save Geofence Settings</>}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Settings Display */}
      {geofence && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Label', value: geofence.label },
                { label: 'Latitude', value: geofence.latitude.toFixed(6) },
                { label: 'Longitude', value: geofence.longitude.toFixed(6) },
                { label: 'Radius', value: `${geofence.radiusMeters}m` },
              ].map(item => (
                <div key={item.label} className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-semibold mt-1">{item.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
