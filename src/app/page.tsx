import { InteractiveOrb } from '@/components/interactive-orb';

export default function AiOrbPage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-background font-body">
      <div className="absolute top-4 left-4 text-foreground">
        hello
      </div>
      <InteractiveOrb />
    </main>
  );
}
