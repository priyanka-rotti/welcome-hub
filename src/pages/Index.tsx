import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You are signed in as <span className="font-medium text-foreground">{user?.email}</span>
          </p>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
