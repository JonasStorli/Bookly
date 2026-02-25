import { useState } from "react";

interface Props {
  value?: number;
  onChange?: (val: number) => void;
  readOnly?: boolean;
}

export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
}: Props) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`star ${n <= display ? "filled" : ""} ${readOnly ? "readonly" : ""}`}
          onClick={() => !readOnly && onChange?.(n)}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onMouseLeave={() => !readOnly && setHovered(0)}
        >
          ★
        </span>
      ))}
    </span>
  );
}
