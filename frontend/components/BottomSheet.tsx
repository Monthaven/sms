/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { Fragment, ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** Height: 'auto' | 'half' | 'full' */
  height?: "auto" | "half" | "full";
  /** Show drag handle indicator */
  showHandle?: boolean;
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  height = "auto",
  showHandle = true,
}: BottomSheetProps) {
  const heightClasses = {
    auto: "max-h-[85vh]",
    half: "h-[50vh]",
    full: "h-[90vh]",
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* Sheet container */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="flex min-h-full items-end justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="translate-y-full opacity-0"
              enterTo="translate-y-0 opacity-100"
              leave="ease-in duration-200"
              leaveFrom="translate-y-0 opacity-100"
              leaveTo="translate-y-full opacity-0"
            >
              <Dialog.Panel
                className={clsx(
                  "w-full transform overflow-hidden rounded-t-2xl bg-zinc-900 shadow-xl transition-all",
                  heightClasses[height]
                )}
              >
                {/* Drag handle */}
                {showHandle && (
                  <div className="flex justify-center pt-3 pb-2">
                    <div className="h-1.5 w-12 rounded-full bg-zinc-600" />
                  </div>
                )}

                {/* Header */}
                {title && (
                  <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-3">
                    <Dialog.Title className="text-lg font-semibold text-white">
                      {title}
                    </Dialog.Title>
                    <button
                      type="button"
                      className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                      onClick={onClose}
                      aria-label="Close dialog"
                      title="Close"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto p-4 max-h-[calc(100%-80px)]">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
