import { useState, useRef, useCallback } from "react";
import { Upload, X, Link as LinkIcon, Loader2, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
  folder?: string;
  className?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label,
  bucket = "event-images",
  folder = "uploads",
  className = "",
}: ImageUploadProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"upload" | "url">(value ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Only PNG, JPG, and WEBP files are accepted.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File must be under 5 MB.");
        return;
      }
      setUploading(true);
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // strip data:…;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const resp = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileBase64: base64,
            contentType: file.type,
            bucket,
            folder,
            userId: user?.id,
          }),
        });

        const data = await resp.json();
        if (!resp.ok) {
          console.error("Upload error:", data.error);
          setError(data.error || "Upload failed");
          return;
        }
        onChange(data.url);
      } catch (err) {
        console.error("Upload error:", err);
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [bucket, folder, onChange, user?.id],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className={className}>
      {label && <Label className="text-xs mb-1.5 block">{label}</Label>}

      {/* Preview */}
      {value && (
        <div className="relative mb-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <img
            src={value}
            alt="Preview"
            className="w-full h-32 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={() => onChange("")}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          className={`text-xs px-2 py-1 rounded ${
            mode === "upload"
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
              : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          onClick={() => setMode("upload")}
        >
          <Upload className="h-3 w-3 inline mr-1" />
          Upload
        </button>
        <button
          type="button"
          className={`text-xs px-2 py-1 rounded ${
            mode === "url"
              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
              : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          onClick={() => setMode("url")}
        >
          <LinkIcon className="h-3 w-3 inline mr-1" />
          URL
        </button>
      </div>

      {mode === "upload" ? (
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={onFileChange}
          />
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          ) : (
            <>
              <ImageIcon className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">
                Drag & drop or click to upload
              </p>
            </>
          )}
        </div>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="text-xs"
        />
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
