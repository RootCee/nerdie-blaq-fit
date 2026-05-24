interface ShareProgressInput {
  fitScore: number | null;
}

export function generateShareProgressText({ fitScore }: ShareProgressInput) {
  const scoreText = typeof fitScore === "number" ? ` Fit Score: ${fitScore}.` : "";

  return `I'm building consistency with Nerdie Blaq Fit.${scoreText} Training smart, adjusting daily.`;
}
