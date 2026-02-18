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
import { Loader2, Save, Globe, CheckCircle2, XCircle, Mail } from "lucide-react";
import { getEmailSettings, upsertEmailSettings } from "@/lib/email-db";
import type { EmailSettings, DnsRecord } from "@/lib/email-types";

const DEFAULT_DNS_RECORDS: DnsRecord[] = [
  { type: "TXT", name: "resend._domainkey", value: "Loading...", verified: false },
  { type: "TXT", name: "@", value: "v=spf1 include:amazonses.com ~all", verified: false },
  { type: "CNAME", name: "rp._domainkey", value: "rp._domainkey.resend.dev", verified: false },
];

const EmailSettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [fromName, setFromName] = useState("RecurrentX");
  const [fromEmail, setFromEmail] = useState("noreply@milcrunch.com");
  const [customDomain, setCustomDomain] = useState("");
  const [footerText, setFooterText] = useState("You received this email because you subscribed at milcrunch.com. You can unsubscribe at any time.");

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const s = await getEmailSettings(user.id);
      if (s) {
        setSettings(s);
        setFromName(s.from_name || "RecurrentX");
        setFromEmail(s.from_email || "noreply@milcrunch.com");
        setCustomDomain(s.custom_domain || "");
        setFooterText(s.footer_text || "");
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const result = await upsertEmailSettings({
      id: settings?.id,
      user_id: user.id,
      from_name: fromName,
      from_email: fromEmail,
      custom_domain: customDomain || null,
      footer_text: footerText,
    });
    if (result) {
      setSettings(result);
      toast.success("Settings saved");
    } else {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  const handleVerifyDomain = async () => {
    if (!customDomain) {
      toast.error("Enter a domain first");
      return;
    }
    try {
      const apiKey = import.meta.env.VITE_RESEND_API_KEY;
      const resp = await fetch("/api/resend/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ name: customDomain }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const records: DnsRecord[] = (data.records || []).map((r: any) => ({
          type: r.type || "TXT",
          name: r.name || "",
          value: r.value || "",
          verified: r.status === "verified",
        }));
        if (user?.id) {
          await upsertEmailSettings({
            id: settings?.id,
            user_id: user.id,
            custom_domain: customDomain,
            domain_verified: data.status === "verified",
            dns_records: records,
          });
        }
        toast.success("Domain submitted for verification — add the DNS records below");
      } else {
        toast.error("Failed to verify domain");
      }
    } catch {
      toast.error("Failed to verify domain");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dnsRecords = settings?.dns_records?.length ? settings.dns_records : DEFAULT_DNS_RECORDS;

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
                <Input id="fromName" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="RecurrentX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input id="fromEmail" type="email" value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="noreply@milcrunch.com" />
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
              <Button variant="outline" onClick={handleVerifyDomain}>Verify Domain</Button>
            </div>
            {settings?.domain_verified != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                {settings.domain_verified ? (
                  <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-700"><XCircle className="h-3 w-3 mr-1" /> Pending</Badge>
                )}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-3">Add these DNS records to your domain:</p>
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
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{r.name}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate">{r.value}</TableCell>
                      <TableCell>
                        {r.verified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-amber-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
