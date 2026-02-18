import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { unsubscribeContact } from "@/lib/email-db";

const EmailUnsubscribe = () => {
  const { contactId } = useParams();
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUnsubscribe = async () => {
    if (!contactId) return;
    setLoading(true);
    await unsubscribeContact(contactId);
    setDone(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg text-center">
        {done ? (
          <>
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You've been unsubscribed</h1>
            <p className="text-gray-500">You will no longer receive emails from this list. If this was a mistake, you can re-subscribe at any time.</p>
          </>
        ) : (
          <>
            <Mail className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Unsubscribe</h1>
            <p className="text-gray-500 mb-6">Are you sure you want to unsubscribe? You will stop receiving emails from this list.</p>
            <Button onClick={handleUnsubscribe} disabled={loading} variant="destructive" className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Yes, Unsubscribe Me
            </Button>
          </>
        )}
        <p className="text-xs text-gray-400 mt-6">Powered by RecurrentX</p>
      </div>
    </div>
  );
};

export default EmailUnsubscribe;
