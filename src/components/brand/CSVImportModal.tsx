import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, FileSpreadsheet, Mail, Users } from "lucide-react";
import type { ICImportRow } from "@/lib/csv-import";

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listName: string;
  rows: ICImportRow[];
  skippedRows: number;
  importing: boolean;
  importProgress: number;
  onConfirm: () => void;
}

export default function CSVImportModal({
  open,
  onOpenChange,
  listName,
  rows,
  skippedRows,
  importing,
  importProgress,
  onConfirm,
}: CSVImportModalProps) {
  const emailCount = rows.filter((r) => r.contact_email).length;
  const previewRows = rows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-[#1e3a5f]" />
            Import CSV to {listName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{rows.length}</span> creators
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-green-600" />
            <span className="font-medium">{emailCount}</span> with emails
          </div>
          {skippedRows > 0 && (
            <span className="text-xs text-amber-600">
              {skippedRows} rows skipped (missing name/username)
            </span>
          )}
        </div>

        <div className="overflow-auto max-h-56 border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Handle</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Platform</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="max-w-[150px] truncate">
                    {r.display_name}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate">
                    @{r.handle || "--"}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    {r.contact_email || "--"}
                  </TableCell>
                  <TableCell>{r.follower_count.toLocaleString()}</TableCell>
                  <TableCell className="capitalize">{r.platform}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {rows.length > 5 && (
          <p className="text-xs text-muted-foreground">
            Showing first 5 of {rows.length} rows
          </p>
        )}

        {importing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-2 text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" /> Importing...
              </span>
              <span className="text-muted-foreground">
                {Math.round(importProgress)}%
              </span>
            </div>
            <Progress value={importProgress} className="h-2" />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={importing || rows.length === 0}
            className="bg-[#1e3a5f] hover:bg-[#2d5282]"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import {rows.length} Creator{rows.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
