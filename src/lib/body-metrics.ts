export interface BmiSummary {
  value: number;
  category: "Underweight" | "Healthy range" | "Above healthy range" | "Higher range";
  message: string;
}

export function parseWeightInPounds(weight: string) {
  const numericWeight = Number.parseFloat(weight.replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
    return null;
  }

  const normalized = weight.toLowerCase();

  if (normalized.includes("kg")) {
    return numericWeight * 2.20462;
  }

  return numericWeight;
}

export function parseWeightInKilograms(weight: string) {
  const pounds = parseWeightInPounds(weight);
  return pounds ? pounds / 2.20462 : null;
}

export function parseHeightInMeters(height: string) {
  const normalized = height.trim().toLowerCase();
  const feetInchesMatch = normalized.match(/(\d+)\s*'\s*(\d+)?/);

  if (feetInchesMatch) {
    const feet = Number.parseInt(feetInchesMatch[1], 10);
    const inches = Number.parseInt(feetInchesMatch[2] ?? "0", 10);
    const totalInches = feet * 12 + inches;
    return totalInches * 0.0254;
  }

  const cmMatch = normalized.match(/(\d+(?:\.\d+)?)\s*cm/);
  if (cmMatch) {
    return Number.parseFloat(cmMatch[1]) / 100;
  }

  const mMatch = normalized.match(/(\d+(?:\.\d+)?)\s*m/);
  if (mMatch) {
    return Number.parseFloat(mMatch[1]);
  }

  const plainNumber = Number.parseFloat(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(plainNumber) || plainNumber <= 0) {
    return null;
  }

  return plainNumber > 3 ? plainNumber / 100 : null;
}

export function calculateBmi(height: string, weight: string): BmiSummary | null {
  const meters = parseHeightInMeters(height);
  const kilograms = parseWeightInKilograms(weight);

  if (!meters || !kilograms) {
    return null;
  }

  const value = Number((kilograms / (meters * meters)).toFixed(1));

  if (value < 18.5) {
    return {
      value,
      category: "Underweight",
      message: "Use this as context, not a label. Strength, energy, and recovery still matter most.",
    };
  }

  if (value < 25) {
    return {
      value,
      category: "Healthy range",
      message: "This is one quick reference point. Your goals, performance, and consistency still lead the plan.",
    };
  }

  if (value < 30) {
    return {
      value,
      category: "Above healthy range",
      message: "Treat this as background context only. Your plan still follows your goals, pace, and training reality.",
    };
  }

  return {
    value,
    category: "Higher range",
    message: "This is informational only. Your plan should still be guided by sustainable progress, not one single number.",
  };
}
