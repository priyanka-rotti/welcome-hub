import { useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Video, MessageSquare, LogOut, Circle, Square } from 'lucide-react';

const StudentDashboard = () => {
  const { user, signOut } = useAuth();
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordedBlob(null);
      setRecordedUrl(null);
    } catch (err) {
      toast.error('Could not access camera. Please allow camera permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const discardRecording = () => {
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
  };

  const handleSave = async () => {
    if (!recordedBlob || !title || !user) {
      toast.error('Please provide a title and record a video.');
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, recordedBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('videos')
        .insert({
          user_id: user.id,
          title,
          video_url: urlData.publicUrl,
        });

      if (insertError) throw insertError;

      toast.success('Video saved successfully!');
      setTitle('');
      discardRecording();
      refetchVideos();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save video.');
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
        <Tabs defaultValue="record" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="record" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Record Video
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Record Practice Video
                </CardTitle>
                <CardDescription>
                  Use your camera to record your dance practice for teacher review.
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

                {/* Live preview / recorded preview */}
                <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
                  {recording && (
                    <video
                      ref={videoRef}
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}
                  {!recording && recordedUrl && (
                    <video
                      src={recordedUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}
                  {!recording && !recordedUrl && (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground text-sm">Camera preview will appear here</p>
                    </div>
                  )}
                  {recording && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1">
                      <Circle className="h-2.5 w-2.5 fill-destructive-foreground text-destructive-foreground animate-pulse" />
                      <span className="text-xs font-medium text-destructive-foreground">REC</span>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  {!recording && !recordedBlob && (
                    <Button onClick={startRecording} className="w-full flex items-center gap-2">
                      <Circle className="h-4 w-4" />
                      Start Recording
                    </Button>
                  )}
                  {recording && (
                    <Button onClick={stopRecording} variant="destructive" className="w-full flex items-center gap-2">
                      <Square className="h-4 w-4" />
                      Stop Recording
                    </Button>
                  )}
                  {!recording && recordedBlob && (
                    <>
                      <Button variant="outline" onClick={discardRecording} className="flex-1">
                        Re-record
                      </Button>
                      <Button onClick={handleSave} disabled={uploading} className="flex-1">
                        {uploading ? 'Saving...' : 'Save Video'}
                      </Button>
                    </>
                  )}
                </div>
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
                  Feedback
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
                    No feedback yet. Record a practice video to get started!
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
