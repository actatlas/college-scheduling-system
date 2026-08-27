import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeTone?: "blue" | "amber" | "emerald" | "purple" | "slate" | "danger";
  searchKeywords?: string[];
  disabled?: boolean;
}

export interface SearchableSelectProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  emptyText?: string;
  ariaLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  searchPlaceholder = "Type to search...",
  disabled = false,
  clearable = false,
  emptyText = "No matching options found",
  ariaLabel,
  className = "",
  style,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value) || null;
  }, [options, value]);

  // Filter options based on search query across label, sublabel, badge, and searchKeywords
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchSub = opt.sublabel ? opt.sublabel.toLowerCase().includes(q) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
      const matchVal = opt.value.toLowerCase().includes(q);
      const matchKeywords = opt.searchKeywords
        ? opt.searchKeywords.some((k) => k.toLowerCase().includes(q))
        : false;

      return matchLabel || matchSub || matchBadge || matchVal || matchKeywords;
    });
  }, [options, searchQuery]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  const getBadgeStyle = (tone?: SearchableOption["badgeTone"]) => {
    switch (tone) {
      case "amber":
        return { background: "#fef3c7", color: "#b45309", border: "1px solid rgba(180, 83, 9, 0.2)" };
      case "emerald":
        return { background: "#dcfce7", color: "#15803d", border: "1px solid rgba(21, 128, 61, 0.2)" };
      case "purple":
        return { background: "#f3e8ff", color: "#7e22ce", border: "1px solid rgba(126, 34, 206, 0.2)" };
      case "danger":
        return { background: "#fee2e2", color: "#b91c1c", border: "1px solid rgba(185, 28, 28, 0.2)" };
      case "slate":
        return { background: "#f1f5f9", color: "#475569", border: "1px solid rgba(71, 85, 105, 0.2)" };
      case "blue":
      default:
        return { background: "#e0f2fe", color: "#0369a1", border: "1px solid rgba(3, 105, 161, 0.2)" };
    }
  };

  return (
    <div
      ref={containerRef}
      className={`searchable-select-root ${className}`}
      style={{ position: "relative", width: "100%", ...style }}
    >
      {/* Hidden native input for form compatibility & accessibility */}
      <input
        type="hidden"
        id={id}
        name={id}
        value={value}
        aria-label={ariaLabel || placeholder}
      />

      {/* Trigger Button */}
      <button
        type="button"
        className={`searchable-select-trigger ${isOpen ? "is-open" : ""} ${disabled ? "is-disabled" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || (selectedOption ? selectedOption.label : placeholder)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "9px 12px",
          borderRadius: "8px",
          border: isOpen ? "1px solid var(--srcb-navy, #0d5499)" : "1px solid var(--srcb-border, #cbd5e1)",
          background: disabled ? "var(--srcb-surface-alt, #f8fafc)" : "var(--srcb-surface-elevated, #ffffff)",
          color: selectedOption ? "var(--srcb-text, #1e293b)" : "var(--srcb-text-muted, #94a3b8)",
          boxShadow: isOpen ? "0 0 0 3px rgba(13, 84, 153, 0.12)" : "none",
          cursor: disabled ? "not-allowed" : "pointer",
          textAlign: "left",
          transition: "all 0.15s ease",
          fontSize: "0.88rem",
          minHeight: "40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", flex: 1 }}>
          {selectedOption ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: 600, color: "var(--srcb-text, #0f172a)", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "999px",
                    flexShrink: 0,
                    ...getBadgeStyle(selectedOption.badgeTone),
                  }}
                >
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: "var(--srcb-text-muted, #94a3b8)", fontStyle: "normal" }}>
              {placeholder}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {clearable && selectedOption && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === "Enter" && handleClear(e as any)}
              title="Clear selection"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2px",
                borderRadius: "4px",
                color: "var(--srcb-text-muted, #94a3b8)",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            style={{
              color: "var(--srcb-text-muted, #64748b)",
              transition: "transform 0.2s ease",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="searchable-select-popover"
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 5px)",
            left: 0,
            right: 0,
            zIndex: 999,
            background: "var(--srcb-surface-elevated, #ffffff)",
            border: "1px solid var(--srcb-border, #cbd5e1)",
            borderRadius: "10px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "300px",
            animation: "fadeInSelect 0.15s ease-out",
          }}
        >
          {/* Search Header */}
          <div
            style={{
              padding: "8px 10px",
              borderBottom: "1px solid var(--srcb-border, #e2e8f0)",
              background: "var(--srcb-surface-alt, #f8fafc)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Search size={15} style={{ color: "var(--srcb-text-muted, #64748b)", flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              className="searchable-select-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Filter options"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "0.84rem",
                color: "var(--srcb-text, #1e293b)",
                padding: "2px 0",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear filter"
                style={{
                  background: "none",
                  border: "none",
                  padding: "2px",
                  cursor: "pointer",
                  color: "var(--srcb-text-muted, #64748b)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={13} />
              </button>
            )}
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--srcb-text-muted, #64748b)",
                background: "var(--srcb-surface, #e2e8f0)",
                padding: "2px 6px",
                borderRadius: "6px",
                flexShrink: 0,
              }}
            >
              {filteredOptions.length} of {options.length}
            </span>
          </div>

          {/* Options List */}
          <div
            style={{
              overflowY: "auto",
              flex: 1,
              padding: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: "20px 14px",
                  textAlign: "center",
                  color: "var(--srcb-text-muted, #64748b)",
                  fontSize: "0.82rem",
                }}
              >
                <p style={{ margin: 0, fontWeight: 600 }}>{emptyText}</p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      marginTop: "6px",
                      background: "none",
                      border: "none",
                      color: "var(--srcb-blue-strong, #0d5499)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Clear search query
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={`searchable-select-item ${isSelected ? "is-selected" : ""} ${opt.disabled ? "is-disabled" : ""}`}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      cursor: opt.disabled ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      background: isSelected ? "rgba(13, 84, 153, 0.08)" : "transparent",
                      borderLeft: isSelected ? "3px solid var(--srcb-blue-strong, #0d5499)" : "3px solid transparent",
                      transition: "background 0.12s ease",
                      opacity: opt.disabled ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected && !opt.disabled) {
                        e.currentTarget.style.background = "var(--srcb-surface-alt, #f1f5f9)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected && !opt.disabled) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontSize: "0.86rem",
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? "var(--srcb-navy, #163269)" : "var(--srcb-text, #1e293b)",
                          }}
                        >
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              padding: "1px 5px",
                              borderRadius: "999px",
                              ...getBadgeStyle(opt.badgeTone),
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--srcb-text-muted, #64748b)",
                            lineHeight: 1.2,
                          }}
                        >
                          {opt.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={16} style={{ color: "var(--srcb-blue-strong, #0d5499)", flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
