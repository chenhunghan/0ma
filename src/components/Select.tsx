import React from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
  className = "",
  wrapperClassName = "",
  children,
  ...props
}) => {
  return (
    <div className={`relative group flex items-center transition-colors ${wrapperClassName}`}>
      <select
        className={`appearance-none w-full bg-transparent focus:outline-none cursor-pointer pr-9 ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none group-hover:text-zinc-300 transition-colors" />
    </div>
  );
};
