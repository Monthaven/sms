/**
 * Simple membership pending page.
 */
export default function AwaitingApproval() {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">Awaiting Approval</h1>
        <p className="text-slate-400">
          Your account is pending approval. Once approved, you will be able to access the portal. If you believe this is a mistake, contact an administrator.
        </p>
      </div>
    </div>
  );
}
