import { FluidGradient } from "@/components/ui/fluid-gradient";

export default function DemoOne() {
  return (
    <div className="h-svh w-screen flex items-center justify-center relative">
      <FluidGradient/>
      <div className="absolute flex flex-col items-center justify-center gap-6 pointer-events-none">
       <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white whitespace-nowrap">
        Prismatic Tides
        </h1>
        <p className="text-lg md:text-xl text-center text-white max-w-2xl leading-relaxed">
          Ocean waves of light crash against shores of imagination, creating infinite gradients.
        </p>
      </div>
    </div>
  );
} 