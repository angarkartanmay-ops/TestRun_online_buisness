import { isDemo } from "@/lib/config";

export function DemoBanner() {
  if (!isDemo) return null;
  return (
    <div className="bg-ink text-paper">
      <p className="label mx-auto max-w-[1320px] px-4 sm:px-8 py-2 flex flex-wrap gap-x-3 gap-y-1 items-center">
        <span className="text-stamp">Preview</span>
        <span className="sm:hidden">Nobody pays · practice mode</span>
        <span className="hidden sm:inline">Practice mode — payments aren&apos;t switched on yet, so nobody pays for anything on this site.</span>
      </p>
    </div>
  );
}
