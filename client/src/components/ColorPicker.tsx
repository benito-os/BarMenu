import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ColorPickerProps {
  label: string;
  value: string | undefined | null;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

export function ColorPicker({ label, value, onChange, placeholder = "#ffffff" }: ColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleSwatchClick = () => {
    colorInputRef.current?.click();
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      onChange(undefined);
    } else {
      onChange(val);
    }
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const displayValue = value || "";
  const swatchColor = value || placeholder;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSwatchClick}
          className="w-10 h-10 rounded-md border border-input shrink-0 cursor-pointer hover-elevate"
          style={{ backgroundColor: swatchColor }}
          data-testid={`swatch-${label.toLowerCase().replace(/\s+/g, "-")}`}
          aria-label={`Pick ${label}`}
        />
        <input
          ref={colorInputRef}
          type="color"
          value={swatchColor}
          onChange={handleColorChange}
          className="sr-only"
          data-testid={`picker-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        <Input
          type="text"
          value={displayValue}
          onChange={handleTextChange}
          placeholder={placeholder}
          className="flex-1 font-mono text-sm"
          data-testid={`input-${label.toLowerCase().replace(/\s+/g, "-")}`}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            data-testid={`clear-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
