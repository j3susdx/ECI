"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const courses = [
  {
    value: "big-data",
    label: "Big Data - Análisis de Grandes Volúmenes de Datos",
  },
  {
    value: "telecomunicaciones",
    label: "Telecomunicaciones - Sistemas de Comunicación",
  },
  {
    value: "computacion-nube",
    label: "Computación en la Nube - Cloud Computing",
  },
  {
    value: "etica-profesionalismo",
    label: "Ética y Profesionalismo - Valores Profesionales",
  },
  {
    value: "inteligencia-negocios",
    label: "Inteligencia de Negocios - Business Intelligence",
  },
  {
    value: "metodologias-agiles",
    label: "Metodologías Ágiles - Desarrollo de Software",
  },
];

interface CourseSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CourseSelector({ value, onChange }: CourseSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal bg-transparent"
        >
          {value
            ? courses.find((course) => course.value === value)?.label
            : "Seleccionar curso/clase..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar curso..." />
          <CommandList>
            <CommandEmpty>No se encontraron cursos.</CommandEmpty>
            <CommandGroup>
              {courses.map((course) => (
                <CommandItem
                  key={course.value}
                  value={course.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === course.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {course.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
