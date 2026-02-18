import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, ArrowLeft, Upload, Loader2, Trash2, UserMinus, Mail } from "lucide-react";
import {
  getEmailLists, upsertEmailList, deleteEmailList,
  getContacts, getContactCount, addContact, addContactsBulk, deleteContact, unsubscribeContact,
} from "@/lib/email-db";
import { CONTACT_STATUS_COLORS } from "@/lib/email-types";
import type { EmailList, EmailContact } from "@/lib/email-types";

const EmailLists = () => {
  const { listId } = useParams();
  const navigate = useNavigate();
  const csvRef = useRef<HTMLInputElement>(null);

  // List state
  const [lists, setLists] = useState<EmailList[]>([]);
  const [listCounts, setListCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Detail state
  const [selectedList, setSelectedList] = useState<EmailList | null>(null);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactFirst, setContactFirst] = useState("");
  const [contactLast, setContactLast] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load lists
  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await getEmailLists();
      setLists(data);
      // Load counts for each list
      const counts: Record<string, number> = {};
      await Promise.all(data.map(async l => {
        counts[l.id] = await getContactCount(l.id);
      }));
      setListCounts(counts);
      setLoading(false);
    })();
  }, []);

  // Load detail when listId changes
  useEffect(() => {
    if (!listId) { setSelectedList(null); return; }
    const list = lists.find(l => l.id === listId);
    if (list) {
      setSelectedList(list);
      loadContacts(listId);
    } else if (lists.length > 0) {
      navigate("/brand/email/lists");
    }
  }, [listId, lists]);

  const loadContacts = async (id: string) => {
    setLoadingContacts(true);
    setContacts(await getContacts(id));
    setLoadingContacts(false);
  };

  const handleCreateList = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const result = await upsertEmailList({ name: newName.trim(), description: newDesc.trim() || null });
    if (result) {
      setLists(prev => [result, ...prev]);
      setListCounts(prev => ({ ...prev, [result.id]: 0 }));
      toast.success("List created");
      setShowCreateDialog(false);
      setNewName("");
      setNewDesc("");
    } else {
      toast.error("Failed to create list");
    }
    setCreating(false);
  };

  const handleDeleteList = async () => {
    if (!deleteId) return;
    const ok = await deleteEmailList(deleteId);
    if (ok) {
      setLists(prev => prev.filter(l => l.id !== deleteId));
      toast.success("List deleted");
      if (listId === deleteId) navigate("/brand/email/lists");
    } else {
      toast.error("Failed to delete list");
    }
    setDeleteId(null);
  };

  const handleAddContact = async () => {
    if (!contactEmail.trim() || !selectedList) return;
    setAddingContact(true);
    const result = await addContact({
      list_id: selectedList.id,
      email: contactEmail.trim(),
      first_name: contactFirst.trim() || undefined,
      last_name: contactLast.trim() || undefined,
    });
    if (result) {
      setContacts(prev => [result, ...prev]);
      setListCounts(prev => ({ ...prev, [selectedList.id]: (prev[selectedList.id] ?? 0) + 1 }));
      toast.success("Contact added");
      setShowAddContact(false);
      setContactEmail("");
      setContactFirst("");
      setContactLast("");
    } else {
      toast.error("Failed to add contact — may already exist");
    }
    setAddingContact(false);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedList) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) { toast.error("CSV is empty"); return; }
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      const emailIdx = headers.findIndex(h => h === "email" || h === "e-mail" || h === "email address");
      if (emailIdx === -1) { toast.error("CSV must have an 'email' column"); return; }
      const fnIdx = headers.findIndex(h => h.includes("first"));
      const lnIdx = headers.findIndex(h => h.includes("last"));
      const rows = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        return {
          email: cols[emailIdx] || "",
          first_name: fnIdx >= 0 ? cols[fnIdx] : undefined,
          last_name: lnIdx >= 0 ? cols[lnIdx] : undefined,
        };
      }).filter(r => r.email && r.email.includes("@"));
      if (rows.length === 0) { toast.error("No valid emails found"); return; }
      const result = await addContactsBulk(selectedList.id, rows);
      toast.success(`Imported ${result.inserted} contacts (${result.duplicates} skipped)`);
      await loadContacts(selectedList.id);
      setListCounts(prev => ({ ...prev, [selectedList.id]: (prev[selectedList.id] ?? 0) + result.inserted }));
    };
    reader.readAsText(file, "UTF-8");
    if (csvRef.current) csvRef.current.value = "";
  };

  const handleDeleteContact = async (id: string) => {
    const ok = await deleteContact(id);
    if (ok) {
      setContacts(prev => prev.filter(c => c.id !== id));
      if (selectedList) setListCounts(prev => ({ ...prev, [selectedList.id]: Math.max(0, (prev[selectedList.id] ?? 1) - 1) }));
      toast.success("Contact removed");
    } else {
      toast.error("Failed to remove contact");
    }
  };

  const handleUnsubscribe = async (id: string) => {
    const ok = await unsubscribeContact(id);
    if (ok) {
      setContacts(prev => prev.map(c => c.id === id ? { ...c, status: "unsubscribed" } : c));
      toast.success("Contact unsubscribed");
    } else {
      toast.error("Failed to unsubscribe");
    }
  };

  const filteredContacts = contacts.filter(c =>
    !searchQuery || c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.last_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Detail View ──────────────────────────────────────────────────
  if (selectedList) {
    return (
      <>
        <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvImport} />

        {/* Add Contact Dialog */}
        <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="jane@example.com" type="email" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={contactFirst} onChange={e => setContactFirst(e.target.value)} placeholder="Jane" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={contactLast} onChange={e => setContactLast(e.target.value)} placeholder="Smith" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddContact(false)}>Cancel</Button>
              <Button onClick={handleAddContact} disabled={addingContact || !contactEmail.trim()}>
                {addingContact && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add Contact
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/brand/email/lists")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Lists
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-pd-navy dark:text-white">{selectedList.name}</h1>
              {selectedList.description && <p className="text-gray-500 dark:text-gray-400 mt-1">{selectedList.description}</p>}
              <p className="text-sm text-muted-foreground mt-1">{listCounts[selectedList.id] ?? 0} subscribers</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddContact(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Contact
              </Button>
              <Button variant="outline" size="sm" onClick={() => csvRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Import CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <Input placeholder="Search contacts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="max-w-sm" />
        </div>

        {loadingContacts ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium">No contacts yet</p>
            <p className="text-sm mt-1">Add contacts manually, import a CSV, or sync from events.</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map(c => {
                  const sc = CONTACT_STATUS_COLORS[c.status] || CONTACT_STATUS_COLORS.subscribed;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.email}</TableCell>
                      <TableCell>{c.first_name || "—"}</TableCell>
                      <TableCell>{c.last_name || "—"}</TableCell>
                      <TableCell><Badge className={`${sc.bg} ${sc.text}`}>{c.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.status === "subscribed" && (
                            <Button variant="ghost" size="icon" onClick={() => handleUnsubscribe(c.id)} title="Unsubscribe">
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteContact(c.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </>
    );
  }

  // ── Grid View ────────────────────────────────────────────────────
  return (
    <>
      {/* Create List Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create Email List</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>List Name *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Newsletter Subscribers" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What's this list for?" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateList} disabled={creating || !newName.trim()}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this list?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the list and all its contacts. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Email Lists</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your subscriber lists and contacts.</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New List
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : lists.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-12 text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No lists yet</p>
          <p className="text-sm mt-1">Create your first email list to start collecting subscribers.</p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Create List
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lists.map(list => (
            <Card key={list.id} className="p-5 cursor-pointer hover:shadow-md transition-shadow group" onClick={() => navigate(`/brand/email/lists/${list.id}`)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-foreground">{list.name}</h3>
                  {list.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{list.description}</p>}
                </div>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); setDeleteId(list.id); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{listCounts[list.id] ?? 0} subscribers</span>
                <span>Created {new Date(list.created_at).toLocaleDateString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default EmailLists;
