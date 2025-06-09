import Image from 'next/image';
import { InteractiveOrb } from '@/components/interactive-orb';

export default function AiOrbPage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden font-body">
      <Image
        src="https://placehold.co/1920x1080.png"
        alt="Background image"
        layout="fill"
        objectFit="cover"
        className="-z-10"
        data-ai-hint="goddess music"
      />
      <div className="absolute top-4 left-4 text-foreground">
        hello
      </div>
      <InteractiveOrb />
    </main>
  );
}
