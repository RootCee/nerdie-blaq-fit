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

export function parseHeightInInches(height: string) {
  const normalized = height.trim().toLowerCase();
  const feetInchesMatch = normalized.match(/(\d+)\s*(?:'|ft|feet)\s*(\d+)?\s*(?:"|in|inch|inches)?/);

  if (feetInchesMatch) {
    const feet = Number.parseInt(feetInchesMatch[1], 10);
    const inches = Number.parseInt(feetInchesMatch[2] ?? "0", 10);
    return feet * 12 + inches;
  }

  const spacedFeetInchesMatch = normalized.match(/^(\d+)\s+(\d{1,2})$/);
  if (spacedFeetInchesMatch) {
    const feet = Number.parseInt(spacedFeetInchesMatch[1], 10);
    const inches = Number.parseInt(spacedFeetInchesMatch[2], 10);

    if (feet > 0 && feet <= 8 && inches >= 0 && inches < 12) {
      return feet * 12 + inches;
    }
  }

  const commaFeetInchesMatch = normalized.match(/^(\d+)\s*,\s*(\d{1,2})$/);
  if (commaFeetInchesMatch) {
    const feet = Number.parseInt(commaFeetInchesMatch[1], 10);
    const inches = Number.parseInt(commaFeetInchesMatch[2], 10);

    if (feet > 0 && feet <= 8 && inches >= 0 && inches < 12) {
      return feet * 12 + inches;
    }
  }

  const inchesMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:in|inch|inches)\b/);
  if (inchesMatch) {
    return Number.parseFloat(inchesMatch[1]);
  }

  const cmMatch = normalized.match(/(\d+(?:\.\d+)?)\s*cm/);
  if (cmMatch) {
    return Number.parseFloat(cmMatch[1]) / 2.54;
  }

  const mMatch = normalized.match(/(\d+(?:\.\d+)?)\s*m/);
  if (mMatch) {
    return Number.parseFloat(mMatch[1]) * 39.3701;
  }

  const plainNumber = Number.parseFloat(normalized.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(plainNumber) || plainNumber <= 0) {
    return null;
  }

  if (plainNumber > 100) {
    return plainNumber / 2.54;
  }

  if (plainNumber >= 36 && plainNumber <= 96) {
    return plainNumber;
  }

  if (plainNumber > 0 && plainNumber <= 3) {
    return plainNumber * 39.3701;
  }

  return null;
}

export function parseHeightInMeters(height: string) {
  const inches = parseHeightInInches(height);
  return inches ? inches * 0.0254 : null;
}

export function calculateBmi(height: string, weight: string): BmiSummary | null {
  const heightInches = parseHeightInInches(height);
  const weightPounds = parseWeightInPounds(weight);

  if (!heightInches || !weightPounds) {
    return null;
  }

  const value = Number(((weightPounds / (heightInches * heightInches)) * 703).toFixed(1));

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
