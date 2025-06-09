
import { InteractiveOrb } from '@/components/interactive-orb';

export default function AiOrbPage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden font-body">
      {/* The next/image component previously here for background has been removed */}
      <div className="absolute top-4 left-4 text-foreground">
        hello
      </div>
      <InteractiveOrb />
    </main>
  );
}
