import { DialPad } from "@/components/sms/DialPad";

export default function DialPage({ params }: any) {
  return (
    <div className="p-6">
      <DialPad leadId={params.leadId} />
    </div>
  );
}
