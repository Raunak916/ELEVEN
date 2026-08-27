"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerPortal = DialogPrimitive.Portal;
const DrawerClose = DialogPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DrawerOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    side?: "left" | "right" | "top" | "bottom";
  }
>(({ side = "right", className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex max-h-[--radix-content-available-height] bg-card/80 dark:bg-black/75 backdrop-blur-2xl border-border shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
        {
          "right-0 top-0 h-full w-[400px] max-w-[90vw] flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.4)] border-l data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right":
            side === "right",
          "left-0 top-0 h-full w-[400px] max-w-[90vw] flex-col shadow-[20px_0_50px_rgba(0,0,0,0.4)] border-r data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left":
            side === "left",
          "top-0 left-0 right-0 h-[300px] max-h-[90vh] flex-col shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-b data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top":
            side === "top",
          "bottom-0 left-0 right-0 h-[300px] max-h-[90vh] flex-col shadow-[0_-20px_50px_rgba(0,0,0,0.4)] border-t data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom":
            side === "bottom",
        },
        className
      )}
      {...props}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <DialogPrimitive.Title className="font-heading text-lg font-semibold">
            {/* Title will be provided by children */}
          </DialogPrimitive.Title>
          <DrawerClose asChild>
            <button
              type="button"
              className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Close drawer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </DrawerClose>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </DialogPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = DialogPrimitive.Content.displayName;

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2", className)}
    {...props}
  />
);
DrawerHeader.displayName = "DrawerHeader";

const DrawerTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";

const DrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "mt-auto flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-2 p-4 border-t",
      className
    )}
    {...props}
  />
);
DrawerFooter.displayName = "DrawerFooter";

export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerClose,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
};