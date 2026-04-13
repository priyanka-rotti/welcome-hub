import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const CLASSES = ['Tuesday', 'Thursday', 'Saturday'] as const;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session } = useAuth();

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentName, setStudentName] = useState('');
  const [parentName, setParentName] = useState('');
  const [role, setRole] = useState<string>('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  useEffect(() => {
    if (session) navigate('/', { replace: true });
  }, [session, navigate]);

  const toggleClass = (cls: string) => {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentName.trim()) {
      toast({ title: 'Name of Student is required', variant: 'destructive' });
      return;
    }
    if (!role) {
      toast({ title: 'Role is required', variant: 'destructive' });
      return;
    }
    if (selectedClasses.length === 0) {
      toast({ title: 'Please select at least one class', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          student_name: studentName.trim(),
          parent_name: parentName.trim(),
          role,
          classes: selectedClasses,
        },
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent you a confirmation link.' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{isLogin ? 'Welcome Back' : 'Create Account'}</CardTitle>
          <CardDescription>
            {isLogin ? 'Sign in to your account' : 'Fill in the details to sign up'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="studentName">Name of Student *</Label>
                  <Input
                    id="studentName"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    placeholder="Enter student name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentName">Parent Name</Label>
                  <Input
                    id="parentName"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    placeholder="Enter parent name"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Contact Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Class *</Label>
                  <p className="text-sm text-muted-foreground">Select one or more days</p>
                  <div className="flex flex-col gap-2">
                    {CLASSES.map((cls) => (
                      <label key={cls} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedClasses.includes(cls)}
                          onCheckedChange={() => toggleClass(cls)}
                        />
                        <span className="text-sm">{cls}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary underline-offset-4 hover:underline font-medium"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
