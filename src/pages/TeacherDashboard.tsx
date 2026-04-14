import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, BarChart3, LogOut, Trash2, Video, Music } from 'lucide-react';

const ADAVUS = Array.from({ length: 7 }, (_, i) => `Tattu Adavu ${i + 1}`);

const TeacherDashboard = () => {
  const { user, signOut } = useAuth();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !title || !type || !user) {
      toast.error('Please fill in all fields and select a file.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;

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

      toast.success('Uploaded successfully!');
      setTitle('');
      setType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    try {
      // Extract path from URL
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

  const videoMaterials = materials?.filter((m) => m.type === 'reference_video') || [];
  const audioMaterials = materials?.filter((m) => m.type === 'sollukattu_audio') || [];

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
                  Upload Reference Material
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Adavu *</label>
                  <Select value={title} onValueChange={setTitle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an adavu" />
                    </SelectTrigger>
                    <SelectContent>
                      {ADAVUS.map((a) => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Type *</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reference_video">Reference Video</SelectItem>
                      <SelectItem value="sollukattu_audio">Sollukattu Audio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">File *</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={type === 'sollukattu_audio' ? 'audio/*' : 'video/*'}
                    className="mt-1 block w-full text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>

                <Button onClick={handleUpload} disabled={uploading} className="w-full">
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </CardContent>
            </Card>

            {/* Reference Videos */}
            {videoMaterials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    Reference Videos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {videoMaterials.map((m) => (
                    <div key={m.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{m.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(m.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id, m.file_url)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <video src={m.file_url} controls className="mt-3 w-full rounded-md" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Sollukattu Audio */}
            {audioMaterials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="h-5 w-5 text-primary" />
                    Sollukattu Audio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {audioMaterials.map((m) => (
                    <div key={m.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{m.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(m.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id, m.file_url)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <audio src={m.file_url} controls className="mt-3 w-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
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
