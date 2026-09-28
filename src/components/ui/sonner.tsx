import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return <Sonner richColors closeButton position="bottom-right" {...props} />;
}
