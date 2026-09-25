import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    // Die leere Spur ist `bg-muted`, nicht `bg-secondary`. In diesem Projekt
    // ist `secondary` ein kraeftiges Gruen — damit sah ein LEERER Balken voll
    // aus, und der blaue Fuellstand schob sich darueber. Bei Frage 1 von 5
    // stand ein ganz gruener Balken da, und in der Lernanalyse wirkte eine
    // Erfolgsquote von 20 % fast vollstaendig gruen. Aufgefallen am
    // 25.09.2026 bei der Aufnahme des Demo-Videos.
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-muted",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
