import { useState } from "react";
import { Loader2, Sparkles, Check, ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STYLES = [
  "Photorealistic",
  "Cinematic",
  "Illustrated",
  "Abstract",
  "Military Bold",
];

const MOODS = [
  "Inspiring",
  "Professional",
  "Energetic",
  "Patriotic",
  "Community",
];

interface AIBannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  eventLocation: string;
  eventDate: string;
  onSelectImage: (url: string) => void;
}

interface GeneratedImage {
  url: string;
  revised_prompt?: string;
}

export default function AIBannerModal({
  open,
  onOpenChange,
  eventName,
  eventLocation,
  eventDate,
  onSelectImage,
}: AIBannerModalProps) {
  const { user } = useAuth();
  const [style, setStyle] = useState("Photorealistic");
  const [mood, setMood] = useState("Professional");
  const [customDetails, setCustomDetails] = useState("");
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selecting, setSelecting] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!eventName.trim()) {
      toast.error("Please enter an event name first");
      return;
    }

    setGenerating(true);
    setImages([]);

    try {
      // Step 1: Use Anthropic to write an optimized DALL-E prompt
      const promptResp = await fetch("/api/anthropic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system:
            "You are an expert at writing DALL-E 3 image generation prompts for military event banners. Write vivid, detailed prompts that produce professional, high-quality event imagery. Respond with ONLY the prompt text, no explanation or preamble.",
          messages: [
            {
              role: "user",
              content: `Write a DALL-E 3 prompt for an event banner. Event: ${eventName}. Location: ${eventLocation || "not specified"}. Date: ${eventDate || "not specified"}. Style: ${style}. Mood: ${mood}. Extra details: ${customDetails || "none"}. The image should be suitable as a professional event banner, 16:9 aspect ratio, no text or words in the image.`,
            },
          ],
        }),
      });

      if (!promptResp.ok) {
        const err = await promptResp.json();
        throw new Error(err.error?.message || "Failed to generate prompt");
      }

      const promptData = await promptResp.json();
      const dallePrompt =
        promptData.content?.[0]?.text || `Professional event banner for ${eventName}, ${style} style, ${mood} mood, 16:9 aspect ratio, no text`;

      // Step 2: Call DALL-E 3 three times in parallel
      const imagePromises = Array.from({ length: 3 }, () =>
        fetch("/api/openai-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: dallePrompt,
            size: "1792x1024",
            quality: "standard",
          }),
        }).then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "Image generation failed");
          return data as GeneratedImage;
        })
      );

      const results = await Promise.allSettled(imagePromises);
      const successful = results
        .filter(
          (r): r is PromiseFulfilledResult<GeneratedImage> =>
            r.status === "fulfilled"
        )
        .map((r) => r.value);

      if (successful.length === 0) {
        const firstError = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        );
        throw new Error(
          firstError?.reason?.message || "All image generations failed"
        );
      }

      setImages(successful);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelect = async (index: number) => {
    const image = images[index];
    if (!image) return;

    setSelecting(index);
    try {
      // Try to re-upload to Supabase Storage for a permanent URL
      let finalUrl = image.url;
      let uploaded = false;

      try {
        const resp = await fetch(image.url);
        const blob = await resp.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const uploadResp = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            contentType: "image/png",
            bucket: "event-images",
            folder: "events",
            userId: user?.id,
          }),
        });

        const uploadData = await uploadResp.json();
        if (uploadResp.ok && uploadData.url) {
          finalUrl = uploadData.url;
          uploaded = true;
        }
      } catch {
        // Upload failed — fall through to use OpenAI URL directly
      }

      onSelectImage(finalUrl);
      onOpenChange(false);

      if (uploaded) {
        toast.success("Banner image saved!");
      } else {
        // OpenAI URLs expire after ~1 hour
        toast.warning("Image saved temporarily — it will expire in ~1 hour. Save the event to lock it in.", { duration: 6000 });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save image";
      toast.error(msg);
    } finally {
      setSelecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Banner Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Style selector */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Style</Label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    style === s
                      ? "bg-purple-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Mood selector */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Mood</Label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    mood === m
                      ? "bg-purple-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Custom details */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">
              Custom details{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              value={customDetails}
              onChange={(e) => setCustomDetails(e.target.value)}
              placeholder="e.g. Include American flags, outdoor setting, sunset..."
            />
          </div>

          {/* Generate button */}
          <div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating 3 options...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate 3 Options
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-1.5">
              ~$0.12 per generation (3 images)
            </p>
          </div>

          {/* Generated images */}
          {images.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Choose your banner
              </Label>
              <div className="grid grid-cols-1 gap-4">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <img
                      src={img.url}
                      alt={`Generated option ${i + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-3 bg-white dark:bg-[#1A1D27]">
                      <Button
                        onClick={() => handleSelect(i)}
                        disabled={selecting !== null}
                        className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                        size="sm"
                      >
                        {selecting === i ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Select This Image
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {generating && (
            <div className="flex flex-col items-center py-8">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                <ImageIcon className="h-5 w-5 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Generating 3 options...
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take 15-30 seconds
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
