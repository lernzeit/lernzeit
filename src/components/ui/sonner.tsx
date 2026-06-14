import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"
import { useSafeAreaInsets } from "@/hooks/useSafeAreaInsets"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const insets = useSafeAreaInsets()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      duration={5000}
      closeButton
      offset={Math.max(16, insets.top + 8)}
      style={{
        // Sonner liest CSS-Variablen für seitliche Insets
        ['--sonner-margin' as string]: `${Math.max(16, insets.left, insets.right)}px`,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:pointer-events-auto",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
