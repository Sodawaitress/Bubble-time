export const FLAG_PALETTES = {
  Asexual: ['#000000','#A3A3A3','#FFFFFF','#800080'],       // Black, gray, white, purple
  Transgender: ['#55CDFC','#F7A8B8','#FFFFFF','#F7A8B8','#55CDFC'],
  Lesbian: ['#D62900','#FF9B55','#FFFFFF','#D461A6','#A50062'],
  Nonbinary: ['#FCF434','#FFFFFF','#9C59D1','#000000'],
  Genderqueer: ['#B77FDD','#FFFFFF','#4A8123'],
  Bisexual: ['#D70071','#8A2BE2','#003D8F']
} as const

export const FLAG_DEFAULT = 'Asexual'

// For event color we pick the first band (or average), here we take the middle-ish color for contrast
export function colorFromFlag(name: keyof typeof FLAG_PALETTES | string): string {
  const pal = (FLAG_PALETTES as any)[name] || FLAG_PALETTES[FLAG_DEFAULT]
  const idx = Math.floor(pal.length/2)
  return pal[idx]
}
