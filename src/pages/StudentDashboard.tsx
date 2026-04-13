import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, Video, MessageSquare, LogOut } from 'lucide-react';

const StudentDashboard = () => {
  const { user, signOut } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const { data: videos, refetch: refetchVideos } = useQuery({
    queryKey: ['videos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: feedback } = useQuery({
    queryKey: ['feedback', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*, videos(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleUpload = async () => {
    if (!file || !title || !user) {
      toast.error('Please provide a title and select a video file.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title,
          description,
          video_url: urlData.publicUrl,
        });

      if (insertError) throw insertError;

      toast.success('Video uploaded successfully!');
      setTitle('');
      setDescription('');
      setFile(null);
      refetchVideos();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload video.');
    } finally {
      setUploading(false);
    }
  };

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
              <Video className="h-4 w-4" />
              Upload Videos
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Practice Video
                </CardTitle>
                <CardDescription>
                  Record or upload your dance practice videos for teacher review.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Title *</label>
                  <Input
                    placeholder="e.g. Bharatanatyam Adavu Practice"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Textarea
                    placeholder="Add notes about your practice..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Video File *</label>
                  <Input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                </div>
                <Button onClick={handleUpload} disabled={uploading} className="w-full">
                  {uploading ? 'Uploading...' : 'Upload Video'}
                </Button>
              </CardContent>
            </Card>

            {videos && videos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>My Videos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {videos.map((video) => (
                    <div key={video.id} className="rounded-lg border border-border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">{video.title}</h3>
                          {video.description && (
                            <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(video.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-accent/20 px-2 py-1 text-xs font-medium text-accent-foreground">
                          {video.status}
                        </span>
                      </div>
                      <video
                        src={video.video_url}
                        controls
                        className="mt-3 w-full rounded-md"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="feedback" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Teacher Feedback
                </CardTitle>
                <CardDescription>
                  View feedback from your teacher on your practice videos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {feedback && feedback.length > 0 ? (
                  <div className="space-y-4">
                    {feedback.map((fb) => (
                      <div key={fb.id} className="rounded-lg border border-border p-4">
                        <p className="text-sm font-medium text-primary">
                          On: {(fb as any).videos?.title || 'Video'}
                        </p>
                        <p className="mt-2 text-foreground">{fb.comments}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No feedback yet. Upload a practice video to get started!
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
