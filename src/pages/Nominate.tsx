import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import MarketingLayout from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Award, Mic, User, Mail, Globe, FileText, Sparkles, CheckCircle } from "lucide-react";

const nominationSchema = z.object({
  programId: z.string().min(1, "Please select an awards program"),
  categoryId: z.string().min(1, "Please select a category"),
  showName: z.string().min(2, "Show name must be at least 2 characters").max(200, "Show name too long"),
  hostName: z.string().min(2, "Host name must be at least 2 characters").max(100, "Host name too long"),
  hostEmail: z.string().email("Please enter a valid email").max(255, "Email too long").optional().or(z.literal("")),
  podcastUrl: z.string().url("Please enter a valid URL").max(500, "URL too long").optional().or(z.literal("")),
  description: z.string().min(50, "Please provide at least 50 characters explaining why this podcast deserves to win").max(2000, "Description too long"),
  episodeLink: z.string().url("Please enter a valid URL").max(500, "URL too long").optional().or(z.literal("")),
});

type NominationFormData = z.infer<typeof nominationSchema>;

interface AwardProgram {
  id: string;
  title: string;
  description: string | null;
  nomination_start: string | null;
  nomination_end: string | null;
}

interface AwardCategory {
  id: string;
  name: string;
  description: string | null;
  program_id: string;
}

const Nominate = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<AwardProgram[]>([]);
  const [categories, setCategories] = useState<AwardCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<AwardCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<NominationFormData>({
    resolver: zodResolver(nominationSchema),
    defaultValues: {
      programId: "",
      categoryId: "",
      showName: "",
      hostName: "",
      hostEmail: "",
      podcastUrl: "",
      description: "",
      episodeLink: "",
    },
  });

  const selectedProgramId = form.watch("programId");

  useEffect(() => {
    fetchProgramsAndCategories();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      const filtered = categories.filter(c => c.program_id === selectedProgramId);
      setFilteredCategories(filtered);
      form.setValue("categoryId", "");
    }
  }, [selectedProgramId, categories]);

  const fetchProgramsAndCategories = async () => {
    try {
      const [programsRes, categoriesRes] = await Promise.all([
        supabase
          .from("award_programs")
          .select("id, title, description, nomination_start, nomination_end")
          .eq("is_published", true),
        supabase
          .from("award_categories")
          .select("id, name, description, program_id")
          .order("sort_order", { ascending: true }),
      ]);

      if (programsRes.error) throw programsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setPrograms(programsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load awards data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: NominationFormData) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to submit a nomination.",
        variant: "destructive",
      });
      navigate("/auth?redirect=/nominate");
      return;
    }

    setIsSubmitting(true);

    try {
      const submissionData = {
        show_name: data.showName,
        host_name: data.hostName,
        host_email: data.hostEmail || null,
        podcast_url: data.podcastUrl || null,
        episode_link: data.episodeLink || null,
        description: data.description,
      };

      const { error } = await supabase.from("nominations").insert({
        program_id: data.programId,
        category_id: data.categoryId,
        nominee_name: data.showName,
        nominee_email: data.hostEmail || null,
        nominee_description: data.description,
        submitted_by: user.id,
        submission_data: submissionData,
        status: "submitted",
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Nomination submitted!",
        description: "Thank you for your nomination. We'll review it shortly.",
      });
    } catch (error: any) {
      console.error("Error submitting nomination:", error);
      toast({
        title: "Submission failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <MarketingLayout>
        <section className="min-h-[80vh] flex items-center justify-center px-6 py-24">
          <Card className="max-w-lg w-full p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-foreground">
              Nomination Submitted!
            </h1>
            <p className="text-muted-foreground">
              Thank you for your nomination. Our team will review it and you'll be notified of any updates.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => { setIsSuccess(false); form.reset(); }}>
                Submit Another
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Back to Home
              </Button>
            </div>
          </Card>
        </section>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="py-16 px-6 bg-gradient-hero border-b border-border">
        <div className="container mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20">
            <Award className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Nominations Open</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-foreground">
            Nominate a Podcast
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Know a podcast that deserves recognition? Submit your nomination for the awards.
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-2xl">
          {!user && !authLoading && (
            <Card className="p-6 mb-8 bg-accent/5 border-accent/20">
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Sign in to nominate</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    You need to be signed in to submit a nomination. Your information helps us prevent duplicate entries.
                  </p>
                  <Button onClick={() => navigate("/auth?redirect=/nominate")} size="sm">
                    Sign In or Create Account
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Awards Program */}
                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Awards Program
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an awards program" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedProgramId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedProgramId ? "Select a category" : "Select a program first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filteredCategories.find(c => c.id === field.value)?.description && (
                        <FormDescription>
                          {filteredCategories.find(c => c.id === field.value)?.description}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="border-t border-border pt-6">
                  <h3 className="font-display font-semibold text-lg mb-4">Podcast Information</h3>
                </div>

                {/* Show Name */}
                <FormField
                  control={form.control}
                  name="showName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        Podcast / Show Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the podcast name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Host Name */}
                <FormField
                  control={form.control}
                  name="hostName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Host Name(s)
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Name of the host or hosts" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Host Email (optional) */}
                <FormField
                  control={form.control}
                  name="hostEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Host Email <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="host@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        We may contact the host if they become a finalist
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Podcast URL (optional) */}
                <FormField
                  control={form.control}
                  name="podcastUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Podcast Website or RSS <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Recommended Episode (optional) */}
                <FormField
                  control={form.control}
                  name="episodeLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Recommended Episode Link <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="Link to a standout episode" {...field} />
                      </FormControl>
                      <FormDescription>
                        Share an episode that best represents this podcast
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description / Why they deserve to win */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Why does this podcast deserve to win?
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us what makes this podcast special, its impact on the community, unique qualities, etc." 
                          className="min-h-[150px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        {field.value.length}/2000 characters (minimum 50)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg"
                  disabled={isSubmitting || !user}
                >
                  {isSubmitting ? "Submitting..." : "Submit Nomination"}
                </Button>

                {!user && (
                  <p className="text-sm text-center text-muted-foreground">
                    Please sign in above to submit your nomination
                  </p>
                )}
              </form>
            </Form>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default Nominate;
