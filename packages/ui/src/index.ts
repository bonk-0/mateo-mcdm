/**
 * @mateo/ui — shared UI components, design tokens and styles.
 *
 * Components follow the shadcn/ui pattern: Radix primitives styled with Tailwind
 * classes that resolve to the design tokens in `styles.css`.
 */
export { cn } from './lib/cn';
export { DURATION, EASE_EMPHASIZED, EASE_STANDARD } from './lib/motion';
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/alert-dialog';
export { Badge, type BadgeProps } from './components/badge';
export { Button, buttonVariants, type ButtonProps } from './components/button';
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/card';
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/dropdown-menu';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './components/dialog';
export { Kbd } from './components/kbd';
export {
  Popover,
  PopoverAnchor,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from './components/popover';
export { RadioCard, RadioCards } from './components/radio-cards';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/select';
export { Separator } from './components/separator';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './components/tabs';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/tooltip';
