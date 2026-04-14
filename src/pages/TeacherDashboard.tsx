import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, BarChart3, LogOut, Trash2, Video, Music } from 'lucide-react';

const TeacherDashboard = () => {
  const { user, signOut } = useAuth();
  const [adavuName, setAdavuName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const { data: materials, refetch } = useQuery({
    queryKey: ['reference_materials', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reference_materials')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const uploadFile = async (file: File, title: string, type: string) => {
    if (!user) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}_${type}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('reference-materials')
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('reference-materials')
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from('reference_materials')
      .insert({
        teacher_id: user.id,
        title,
        type,
        file_url: urlData.publicUrl,
      });
    if (insertError) throw insertError;
  };

  const handleUpload = async () => {
    const videoFile = videoInputRef.current?.files?.[0];
    const audioFile = audioInputRef.current?.files?.[0];
    const trimmedName = adavuName.trim();

    if (!trimmedName || !videoFile || !audioFile) {
      toast.error('Please fill in the adavu name and select both files.');
      return;
    }

    setUploading(true);
    try {
      await uploadFile(videoFile, trimmedName, 'reference_video');
      await uploadFile(audioFile, trimmedName, 'sollukattu_audio');

      toast.success(`"${trimmedName}" uploaded successfully!`);
      setAdavuName('');
      setHasVideo(false);
      setHasAudio(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
      if (audioInputRef.current) audioInputRef.current.value = '';
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    try {
      const urlParts = fileUrl.split('/reference-materials/');
      if (urlParts[1]) {
        await supabase.storage.from('reference-materials').remove([urlParts[1]]);
      }
      const { error } = await supabase.from('reference_materials').delete().eq('id', id);
      if (error) throw error;
      toast.success('Deleted successfully.');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed.');
    }
  };

  // Group materials by adavu title
  const groupedMaterials = materials?.reduce((acc, m) => {
    if (!acc[m.title]) acc[m.title] = { videos: [], audios: [] };
    if (m.type === 'reference_video') acc[m.title].videos.push(m);
    else if (m.type === 'sollukattu_audio') acc[m.title].audios.push(m);
    return acc;
  }, {} as Record<string, { videos: typeof materials; audios: typeof materials }>) || {};

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary">🪷 Nritya</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Practice Stats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Add Adavu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Adavu Name *</label>
                  <Input
                    placeholder="e.g. Natta Adavu 1"
                    value={adavuName}
                    onChange={(e) => setAdavuName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    Reference Video *
                  </label>
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => setHasVideo(!!e.target.files?.length)}
                    className="mt-1 block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Music className="h-4 w-4 text-primary" />
                    Sollukattu Audio *
                  </label>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setHasAudio(!!e.target.files?.length)}
                    className="mt-1 block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !adavuName.trim() || !hasVideo || !hasAudio}
                  className="w-full"
                >
                  {uploading ? 'Uploading...' : 'Upload Adavu'}
                </Button>
              </CardContent>
            </Card>

            {/* Uploaded Materials grouped by adavu */}
            {Object.entries(groupedMaterials).map(([title, { videos, audios }]) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {videos.map((m) => (
                    <div key={m.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Video className="h-4 w-4 text-primary" /> Reference Video
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id, m.file_url)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <video src={m.file_url} controls className="w-full rounded-md" />
                    </div>
                  ))}
                  {audios.map((m) => (
                    <div key={m.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground flex items-center gap-2">
                          <Music className="h-4 w-4 text-primary" /> Sollukattu Audio
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id, m.file_url)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <audio src={m.file_url} controls className="w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Practice Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  Practice statistics coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TeacherDashboard;
