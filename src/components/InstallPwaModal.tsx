import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Share, PlusSquare } from "lucide-react";

interface InstallPwaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InstallPwaModal({ open, onOpenChange }: InstallPwaModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Install App</DialogTitle>
                    <DialogDescription>
                        Install this application on your home screen for quick and easy access.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                            <Share className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">1. Tap the Share button</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Found at the bottom or top of your screen.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">
                            <PlusSquare className="h-6 w-6 text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                                2. Select "Add to Home Screen"
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Scroll down in the share menu to find it.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
