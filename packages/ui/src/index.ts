/**
 * @mateo/ui — shared UI components, design tokens and styles.
 *
 * Components follow the shadcn/ui pattern: Radix primitives styled with Tailwind
 * classes that resolve to the design tokens in `styles.css`.
 */
export { cn } from './lib/cn';
export { DURATION, EASE_EMPHASIZED, EASE_STANDARD } from './lib/motion';
export { Badge, type BadgeProps } from './components/badge';
export { Button, buttonVariants, type ButtonProps } from './components/button';
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/card';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './components/dropdown-menu';
export { Kbd } from './components/kbd';
export { RadioCard, RadioCards } from './components/radio-cards';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/select';
export { Separator } from './components/separator';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/tooltip';
