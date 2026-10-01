import { Toaster as Sonner, type ToasterProps } from "sonner";

// Console's toast colour modes: a white card with a carbon.3 border, tinted
// for success / danger / warning.
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      closeButton
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!rounded-lg !border !border-carbon-3 !bg-abyss-0 !text-abyss-9 !shadow-strato !font-[inherit]",
          description: "!text-abyss-5",
          success: "!border-tiaga-2 !bg-tiaga-0 !text-tiaga-9",
          error: "!border-chaparral-2 !bg-chaparral-0 !text-chaparral-8",
          warning: "!border-desert-3 !bg-desert-0 !text-desert-9",
          closeButton: "!border-carbon-3 !bg-abyss-0 !text-abyss-7",
        },
      }}
      {...props}
    />
  );
}
