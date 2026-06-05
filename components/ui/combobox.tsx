"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type ComboboxContextValue = {
  open: boolean
  query: string
  items: string[]
  filteredItems: string[]
  setQuery: (value: string) => void
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  selectItem: (value: string) => void
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null)

interface ComboboxProps {
  items: string[]
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

function Combobox({
  items,
  value,
  onValueChange,
  className,
  children,
}: ComboboxProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [internalValue, setInternalValue] = React.useState("")
  const [open, setOpen] = React.useState(false)

  const query = value ?? internalValue

  const filteredItems = React.useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) {
      return items
    }

    return items.filter((item) => item.toLowerCase().includes(search))
  }, [items, query])

  React.useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const setQuery = React.useCallback(
    (next: string) => {
      if (onValueChange) {
        onValueChange(next)
      } else {
        setInternalValue(next)
      }
    },
    [onValueChange]
  )

  const selectItem = React.useCallback(
    (item: string) => {
      setQuery(item)
      setOpen(false)
    },
    [setQuery]
  )

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <ComboboxContext.Provider
        value={{
          open,
          query,
          items,
          filteredItems,
          setQuery,
          setOpen,
          selectItem,
        }}
      >
        {children}
      </ComboboxContext.Provider>
    </div>
  )
}

function ComboboxInput(
  props: React.ComponentProps<typeof Input>
) {
  const context = React.useContext(ComboboxContext)
  if (!context) {
    throw new Error("ComboboxInput must be used within a Combobox")
  }

  const { query, items, setQuery, setOpen } = context

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
    setOpen(true)
    props.onChange?.(event)
  }

  const handleBlur = () => {
    const isExactMatch = items.some(
      (item) => item.trim().toLowerCase() === query.trim().toLowerCase()
    )

    if (!isExactMatch) {
      setQuery("")
    }
    setOpen(false)
  }

  return (
    <Input
      autoComplete="off"
      value={props.value ?? query}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={() => setOpen(true)}
      {...props}
    />
  )
}

function ComboboxContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(ComboboxContext)
  if (!context?.open) {
    return null
  }

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-input bg-popover text-popover-foreground shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function ComboboxEmpty({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(ComboboxContext)
  if (!context || context.filteredItems.length > 0) {
    return null
  }

  return (
    <div
      className={cn("px-3 py-2 text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface ComboboxListProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: (item: string) => React.ReactNode
  className?: string
}

function ComboboxList({
  children,
  className,
  ...props
}: ComboboxListProps) {
  const context = React.useContext(ComboboxContext)
  if (!context) {
    throw new Error("ComboboxList must be used within a Combobox")
  }

  return (
    <div className={cn("space-y-1 py-1", className)} {...props}>
      {context.filteredItems.map((item) => children?.(item))}
    </div>
  )
}

function ComboboxItem(
  { value, className, children, ...props }:
  { value: string; className?: string; children: React.ReactNode } &
  React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const context = React.useContext(ComboboxContext)
  if (!context) {
    throw new Error("ComboboxItem must be used within a Combobox")
  }

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-foreground hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => context.selectItem(value)}
      {...props}
    >
      {children}
    </button>
  )
}

export {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
}
