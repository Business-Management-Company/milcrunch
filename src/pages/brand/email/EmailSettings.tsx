import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Save, Globe, CheckCircle2, XCircle, Clock, Mail } from "lucide-react";
import { getEmailSettings, upsertEmailSettings } from "@/lib/email-db";
import type { EmailSettings, DnsRecord } from "@/lib/email-types";

const LS_KEY = "recurrentx_email_settings";

function loadFromLocalStorage(): Partial<EmailSettings> | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToLocalStorage(data: Partial<EmailSettings>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

const EmailSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [fromName, setFromName] = useState("MilCrunch");
  const [fromEmail, setFromEmail] = useState("hello@milcrunch.com");
  const [customDomain, setCustomDomain] = useState("");
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);
  const [domainStatus, setDomainStatus] = useState<string | null>(null);
  const [footerText, setFooterText] = useState("You received this email because you subscribed at milcrunch.com. You can unsubscribe at any time.");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const s = await getEmailSettings(user.id);
      if (s) {
        setSettings(s);
        setFromName(s.from_name || "MilCrunch");
        setFromEmail(s.from_email || "hello@milcrunch.com");
        setCustomDomain(s.custom_domain || "");
        setFooterText(s.footer_text || "");
        if (s.dns_records?.length) setDnsRecords(s.dns_records);
        if (s.domain_verified != null) setDomainStatus(s.domain_verified ? "verified" : "pending");
        // Also persist to localStorage as backup
        saveToLocalStorage({ from_name: s.from_name, from_email: s.from_email, custom_domain: s.custom_domain, footer_text: s.footer_text, dns_records: s.dns_records, domain_verified: s.domain_verified });
      } else {
        // Fallback: load from localStorage if Supabase table doesn't exist yet
        const ls = loadFromLocalStorage();
        if (ls) {
          if (ls.from_name) setFromName(ls.from_name);
          if (ls.from_email) setFromEmail(ls.from_email);
          if (ls.custom_domain) setCustomDomain(ls.custom_domain);
          if (ls.footer_text) setFooterText(ls.footer_text);
          if (ls.dns_records?.length) setDnsRecords(ls.dns_records);
          if (ls.domain_verified != null) setDomainStatus(ls.domain_verified ? "verified" : "pending");
        }
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    // Always save to localStorage as fallback
    saveToLocalStorage({ from_name: fromName, from_email: fromEmail, custom_domain: customDomain || null, footer_text: footerText, dns_records: dnsRecords, domain_verified: domainStatus === "verified" });

    const result = await upsertEmailSettings({
      id: settings?.id,
      user_id: user.id,
      from_name: fromName,
      from_email: fromEmail,
      custom_domain: customDomain || null,
      footer_text: footerText,
      dns_records: dnsRecords,
      domain_verified: domainStatus === "verified",
    });
    if (result) {
      setSettings(result);
      toast.success("Settings saved");
    } else {
      // Supabase failed but localStorage saved
      toast.success("Settings saved locally (database table may need to be created)");
    }
    setSaving(false);
  };

  const handleVerifyDomain = async () => {
    if (!customDomain) {
      toast.error("Enter a domain first");
      return;
    }
    setVerifying(true);
    try {
      const resp = await fetch("/api/resend-verify-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: customDomain }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        toast.error(data.error || "Failed to verify domain");
        setVerifying(false);
        return;
      }

      // Map records from Resend API response
      const records: DnsRecord[] = (data.records || []).map((r: any) => ({
        type: r.type || "TXT",
        name: r.name || "",
        value: r.value || "",
        status: r.status || "pending",
        verified: r.status === "verified",
      }));

      setDnsRecords(records);
      setDomainStatus(data.status || "pending");

      // Persist to Supabase + localStorage
      if (user?.id) {
        const result = await upsertEmailSettings({
          id: settings?.id,
          user_id: user.id,
          custom_domain: customDomain,
          domain_verified: data.verified === true,
          dns_records: records,
        });
        if (result) setSettings(result);
      }
      saveToLocalStorage({ from_name: fromName, from_email: fromEmail, custom_domain: customDomain, footer_text: footerText, dns_records: records, domain_verified: data.verified === true });

      if (data.verified) {
        toast.success("Domain is verified!");
      } else {
        toast.success("Domain submitted — add the DNS records below, then verify again.");
      }
    } catch {
      toast.error("Failed to verify domain");
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-pd-navy dark:text-white mb-2">Email Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Configure your email sending defaults and domain verification.</p>
      </div>

      <div className="space-y-6 max-w-3xl">
        {/* Default Sender */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Default Sender</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input id="fromName" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="MilCrunch" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input id="fromEmail" type="email" value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="hello@milcrunch.com" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Custom Domain */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Custom Domain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input value={customDomain} onChange={e => setCustomDomain(e.target.value)} placeholder="e.g. mail.milcrunch.com" className="flex-1" />
              <Button variant="outline" onClick={handleVerifyDomain} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {verifying ? "Verifying..." : "Verify Domain"}
              </Button>
            </div>

            {domainStatus && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Domain Status:</span>
                {domainStatus === "verified" ? (
                  <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>
                ) : domainStatus === "failed" ? (
                  <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
                )}
              </div>
            )}

            {dnsRecords.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">Add these DNS records to your domain provider:</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dnsRecords.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{r.type}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[150px] truncate" title={r.name}>{r.name}</TableCell>
                        <TableCell className="font-mono text-xs max-w-[250px] truncate" title={r.value}>{r.value}</TableCell>
                        <TableCell>
                          {(r as any).status === "verified" || r.verified ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle2 className="h-4 w-4" /> Verified</span>
                          ) : (r as any).status === "failed" ? (
                            <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><XCircle className="h-4 w-4" /> Failed</span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-600 text-xs font-medium"><Clock className="h-4 w-4" /> Pending</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {dnsRecords.length === 0 && !domainStatus && (
              <p className="text-sm text-muted-foreground">Enter your domain and click "Verify Domain" to get DNS records.</p>
            )}
          </CardContent>
        </Card>

        {/* Footer Text */}
        <Card>
          <CardHeader>
            <CardTitle>Email Footer (CAN-SPAM)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="footer">Default footer text included in every email</Label>
            <Textarea id="footer" value={footerText} onChange={e => setFooterText(e.target.value)} rows={3} placeholder="You received this email because..." />
            <p className="text-xs text-muted-foreground">Required by CAN-SPAM. An unsubscribe link is always appended automatically.</p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>
    </>
  );
};

export default EmailSettingsPage;
