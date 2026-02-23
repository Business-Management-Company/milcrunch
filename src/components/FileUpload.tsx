import { useState, useRef, useCallback } from "react";
import { Upload, X, Link as LinkIcon, Loader2, FileText, FileSpreadsheet, File as FileIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return <FileText className="h-5 w-5 text-red-500" />;
  if (["ppt", "pptx"].includes(ext)) return <FileSpreadsheet className="h-5 w-5 text-orange-500" />;
  if (["doc", "docx"].includes(ext)) return <FileText className="h-5 w-5 text-blue-500" />;
  return <FileIcon className="h-5 w-5 text-gray-500" />;
}

export function getFileIcon(url: string) {
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0] || "";
  if (ext === "pdf") return <FileText className="h-4 w-4 text-red-500" />;
  if (["ppt", "pptx"].includes(ext)) return <FileSpreadsheet className="h-4 w-4 text-orange-500" />;
  if (["doc", "docx"].includes(ext)) return <FileText className="h-4 w-4 text-blue-500" />;
  return <FileText className="h-4 w-4 text-blue-600" />;
}

interface FileUploadProps {
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  maxSize?: number;
  bucket?: string;
  folder?: string;
  label?: string;
  description?: string;
  className?: string;
}

export default function FileUpload({
  value,
  onChange,
  accept = ".pdf,.ppt,.pptx,.doc,.docx",
  maxSize = 50,
  bucket = "uploads",
  folder = "decks",
  label,
  description,
  className = "",
}: FileUploadProps) {
  const [mode, setMode] = useState<"upload" | "url">(value ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const acceptedExtensions = accept.split(",").map((e) => e.trim().toLowerCase());
  const descriptionText = description || `${acceptedExtensions.map((e) => e.replace(".", "").toUpperCase()).join(", ")} up to ${maxSize}MB`;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Validate extension
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
      if (!acceptedExtensions.includes(ext)) {
        setError(`File type ${ext} is not accepted. Allowed: ${accept}`);
        return;
      }

      // Validate size
      if (file.size > maxSize * 1024 * 1024) {
        setError(`File must be under ${maxSize} MB.`);
        return;
      }

      setSelectedFile({ name: file.name, size: file.size });
      setUploading(true);
      setProgress(10);

      try {
        const fileName = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        // Simulate progress since supabase doesn't provide upload progress
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90));
        }, 300);

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        clearInterval(progressInterval);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setError(uploadError.message);
          setUploading(false);
          setProgress(0);
          setSelectedFile(null);
          return;
        }

        setProgress(100);

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        onChange(urlData.publicUrl);
        toast.success("File uploaded!");
      } catch (err) {
        console.error("Upload error:", err);
        setError("Upload failed. Please try again.");
        setSelectedFile(null);
      } finally {
        setUploading(false);
        setTimeout(() => setProgress(0), 500);
      }
    },
    [accept, acceptedExtensions, bucket, folder, maxSize, onChange],
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

  const clearFile = () => {
    onChange("");
    setSelectedFile(null);
    setProgress(0);
    setError(null);
  };

  return (
    <div className={className}>
      {label && <Label className="text-xs text-gray-500 mb-1.5 block">{label}</Label>}

      {/* Mode toggle */}
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
            mode === "upload"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500"
              : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          onClick={() => setMode("upload")}
        >
          <Upload className="h-3 w-3 inline mr-1" />
          Upload File
        </button>
        <button
          type="button"
          className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
            mode === "url"
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500"
              : "text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
          }`}
          onClick={() => setMode("url")}
        >
          <LinkIcon className="h-3 w-3 inline mr-1" />
          Paste URL
        </button>
      </div>

      {mode === "upload" ? (
        <>
          {/* Show selected/uploaded file */}
          {(selectedFile || value) && !uploading ? (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {getFileTypeIcon(selectedFile?.name || value)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile?.name || value.split("/").pop()}</p>
                {selectedFile?.size && (
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-red-500"
                onClick={clearFile}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-[#1e3a5f] bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-700 hover:border-[#1e3a5f] hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !uploading && fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={onFileChange}
              />
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#1e3a5f]" />
                  <p className="text-sm text-muted-foreground">Uploading...</p>
                  <div className="w-48 mx-auto h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#1e3a5f] rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Drag & drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{descriptionText}</p>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://drive.google.com/..."
          className="text-sm"
        />
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
