/**
 * Generates high-contrast procedural dark fantasy anime artwork on HTML5 Canvas.
 * Generates unique, prompt-specific compositions (swordsman, colossal gate, face close-up, winged beast)
 * so every scene receives its own distinct artwork.
 */
export function generateProceduralAnimeImage(
  prompt: string,
  sceneNumber: number,
  width = 1280,
  height = 720
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const pLower = (prompt || '').toLowerCase();
  const isCloseUp = pLower.includes('face') || pLower.includes('eye') || pLower.includes('close') || pLower.includes('gaze') || sceneNumber === 3;
  const isGate = pLower.includes('gate') || pLower.includes('portal') || pLower.includes('fissure') || pLower.includes('crack') || sceneNumber === 2;
  const isBeast = pLower.includes('beast') || pLower.includes('monster') || pLower.includes('dragon') || pLower.includes('cathedral') || sceneNumber === 4;

  // 1. Atmospheric dark gradient background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (isCloseUp) {
    bgGrad.addColorStop(0, '#0c0618');
    bgGrad.addColorStop(0.5, '#1e0d36');
    bgGrad.addColorStop(1, '#07030e');
  } else if (isGate) {
    bgGrad.addColorStop(0, '#04020a');
    bgGrad.addColorStop(0.5, '#1b0928');
    bgGrad.addColorStop(1, '#090414');
  } else if (isBeast) {
    bgGrad.addColorStop(0, '#020108');
    bgGrad.addColorStop(0.5, '#240838');
    bgGrad.addColorStop(1, '#080212');
  } else {
    bgGrad.addColorStop(0, '#05030a');
    bgGrad.addColorStop(0.4, '#120924');
    bgGrad.addColorStop(0.75, '#261245');
    bgGrad.addColorStop(1, '#0c0717');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Giant Eclipse Moon & Atmospheric Glow
  const moonX = isCloseUp ? width * 0.8 : isGate ? width * 0.5 : width * 0.72;
  const moonY = isCloseUp ? height * 0.25 : isGate ? height * 0.2 : height * 0.32;
  const moonRadius = height * 0.22;

  const auraGrad = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.3, moonX, moonY, moonRadius * 2.2);
  auraGrad.addColorStop(0, isCloseUp ? 'rgba(244, 63, 94, 0.4)' : 'rgba(168, 85, 247, 0.45)');
  auraGrad.addColorStop(0.5, 'rgba(124, 58, 237, 0.2)');
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f081d';
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 12;
  ctx.strokeStyle = isCloseUp ? '#fb7185' : '#c084fc';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, Math.PI * 0.75, Math.PI * 1.8);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 3. Scene-Specific Focal Artwork
  if (isCloseUp) {
    // Face Close-Up: Detailed anime face with intense glowing eyes and shadow
    const faceCX = width * 0.5;
    const faceCY = height * 0.55;

    // Jawline & Face base
    ctx.fillStyle = '#110b24';
    ctx.beginPath();
    ctx.moveTo(faceCX - 180, faceCY - 80);
    ctx.lineTo(faceCX - 120, faceCY + 180);
    ctx.lineTo(faceCX, faceCY + 260);
    ctx.lineTo(faceCX + 120, faceCY + 180);
    ctx.lineTo(faceCX + 180, faceCY - 80);
    ctx.closePath();
    ctx.fill();

    // Cheekbone chiaroscuro shadow
    ctx.fillStyle = '#080312';
    ctx.beginPath();
    ctx.moveTo(faceCX - 180, faceCY - 80);
    ctx.lineTo(faceCX - 120, faceCY + 180);
    ctx.lineTo(faceCX, faceCY + 260);
    ctx.lineTo(faceCX, faceCY - 80);
    ctx.closePath();
    ctx.fill();

    // Eyes base (dark sclera)
    ctx.fillStyle = '#050208';
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    // Left eye
    ctx.beginPath();
    ctx.ellipse(faceCX - 75, faceCY, 38, 16, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Right eye
    ctx.beginPath();
    ctx.ellipse(faceCX + 75, faceCY, 38, 16, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Glowing Crimson-Violet Irises
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(faceCX - 70, faceCY, 14, 0, Math.PI * 2);
    ctx.arc(faceCX + 70, faceCY, 14, 0, Math.PI * 2);
    ctx.fill();

    // Pupil and specular highlight
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(faceCX - 68, faceCY - 2, 5, 0, Math.PI * 2);
    ctx.arc(faceCX + 72, faceCY - 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Sharp eyelashes & eye contour
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(faceCX - 110, faceCY - 2);
    ctx.quadraticCurveTo(faceCX - 75, faceCY - 16, faceCX - 40, faceCY);
    ctx.moveTo(faceCX + 40, faceCY);
    ctx.quadraticCurveTo(faceCX + 75, faceCY - 16, faceCX + 110, faceCY - 2);
    ctx.stroke();

    // Hair strands across forehead
    ctx.fillStyle = '#06020c';
    ctx.beginPath();
    ctx.moveTo(faceCX - 150, 0);
    ctx.lineTo(faceCX - 80, faceCY - 20);
    ctx.lineTo(faceCX - 50, 0);
    ctx.lineTo(faceCX, faceCY - 35);
    ctx.lineTo(faceCX + 50, 0);
    ctx.lineTo(faceCX + 90, faceCY - 10);
    ctx.lineTo(faceCX + 160, 0);
    ctx.closePath();
    ctx.fill();

  } else if (isGate) {
    // Colossal Demonic Gate splitting open with purple fissures
    const gateCX = width * 0.5;
    const gateCY = height * 0.6;

    // Stone Pillars
    ctx.fillStyle = '#0c0717';
    ctx.fillRect(gateCX - 280, height * 0.18, 160, height * 0.82);
    ctx.fillRect(gateCX + 120, height * 0.18, 160, height * 0.82);
    ctx.fillRect(gateCX - 320, height * 0.12, 640, 70);

    // Inner Void Portal
    ctx.fillStyle = '#040108';
    ctx.fillRect(gateCX - 120, height * 0.22, 240, height * 0.78);

    // Glowing Rune Fissure down the center
    ctx.strokeStyle = '#c084fc';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 25;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(gateCX, height * 0.22);
    ctx.lineTo(gateCX - 20, height * 0.45);
    ctx.lineTo(gateCX + 25, height * 0.65);
    ctx.lineTo(gateCX - 10, height * 0.82);
    ctx.lineTo(gateCX, height);
    ctx.stroke();

    // White core line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Ancient circular runes on gate pillars
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(gateCX - 200, height * 0.45, 35, 0, Math.PI * 2);
    ctx.arc(gateCX + 200, height * 0.45, 35, 0, Math.PI * 2);
    ctx.stroke();

  } else if (isBeast) {
    // Titanic Winged Shadow Demon Beast & Cathedral Spires
    const bCX = width * 0.5;
    const bCY = height * 0.38;

    // Spires
    ctx.fillStyle = '#080312';
    ctx.beginPath();
    ctx.moveTo(width * 0.1, height);
    ctx.lineTo(width * 0.18, height * 0.5);
    ctx.lineTo(width * 0.26, height);
    ctx.moveTo(width * 0.74, height);
    ctx.lineTo(width * 0.82, height * 0.5);
    ctx.lineTo(width * 0.9, height);
    ctx.fill();

    // Massive Demon Wings
    ctx.fillStyle = '#040108';
    ctx.beginPath();
    ctx.moveTo(bCX, bCY);
    ctx.quadraticCurveTo(bCX - 250, bCY - 160, bCX - 420, bCY - 50);
    ctx.quadraticCurveTo(bCX - 280, bCY + 40, bCX, bCY + 40);
    ctx.quadraticCurveTo(bCX + 280, bCY + 40, bCX + 420, bCY - 50);
    ctx.quadraticCurveTo(bCX + 250, bCY - 160, bCX, bCY);
    ctx.fill();

    // Wing glowing edges
    ctx.strokeStyle = '#a855f7';
    ctx.shadowColor = '#9333ea';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bCX, bCY);
    ctx.quadraticCurveTo(bCX - 250, bCY - 160, bCX - 420, bCY - 50);
    ctx.moveTo(bCX, bCY);
    ctx.quadraticCurveTo(bCX + 250, bCY - 160, bCX + 420, bCY - 50);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Horned Skull
    ctx.fillStyle = '#020005';
    ctx.beginPath();
    ctx.arc(bCX, bCY - 30, 24, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.strokeStyle = '#020005';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(bCX - 15, bCY - 40);
    ctx.quadraticCurveTo(bCX - 70, bCY - 80, bCX - 60, bCY - 120);
    ctx.moveTo(bCX + 15, bCY - 40);
    ctx.quadraticCurveTo(bCX + 70, bCY - 80, bCX + 60, bCY - 120);
    ctx.stroke();

    // Crimson Eyes
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(bCX - 10, bCY - 30, 4, 0, Math.PI * 2);
    ctx.arc(bCX + 10, bCY - 30, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

  } else {
    // Swordsman on Cliff Edge
    // Distant jagged mountains
    ctx.fillStyle = '#100a1c';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    ctx.lineTo(width * 0.15, height * 0.58);
    ctx.lineTo(width * 0.28, height * 0.65);
    ctx.lineTo(width * 0.45, height * 0.5);
    ctx.lineTo(width * 0.6, height * 0.68);
    ctx.lineTo(width * 0.8, height * 0.54);
    ctx.lineTo(width, height * 0.7);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Forefront Cliff
    ctx.fillStyle = '#07040b';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.85);
    ctx.lineTo(width * 0.48, height * 0.72);
    ctx.lineTo(width * 0.55, height * 0.88);
    ctx.lineTo(width, height * 0.82);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Swordsman
    const heroX = width * 0.36;
    const heroY = height * 0.72;

    ctx.fillStyle = '#050208';
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(heroX - 25, heroY);
    ctx.quadraticCurveTo(heroX - 85, heroY - 40, heroX - 110, heroY - 10);
    ctx.quadraticCurveTo(heroX - 60, heroY - 80, heroX - 15, heroY - 95);
    ctx.fill();

    ctx.fillRect(heroX - 14, heroY - 95, 28, 95);
    ctx.beginPath();
    ctx.arc(heroX, heroY - 115, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(heroX - 16, heroY - 120);
    ctx.lineTo(heroX - 35, heroY - 138);
    ctx.lineTo(heroX - 10, heroY - 130);
    ctx.lineTo(heroX, heroY - 150);
    ctx.lineTo(heroX + 15, heroY - 132);
    ctx.lineTo(heroX + 32, heroY - 140);
    ctx.lineTo(heroX + 16, heroY - 118);
    ctx.fill();

    // Katana with Purple Aura
    ctx.strokeStyle = '#050208';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(heroX + 12, heroY - 80);
    ctx.lineTo(heroX + 75, heroY - 170);
    ctx.stroke();

    ctx.strokeStyle = '#c084fc';
    ctx.shadowColor = '#9333ea';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(heroX + 18, heroY - 86);
    ctx.lineTo(heroX + 75, heroY - 170);
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#e11d48';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(heroX - 4, heroY - 116, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Floating Magical Embers
  ctx.fillStyle = '#e9d5ff';
  for (let i = 0; i < 45; i++) {
    const px = (Math.sin(i * 32.5 + sceneNumber) * 0.5 + 0.5) * width;
    const py = (Math.cos(i * 47.2 + sceneNumber) * 0.5 + 0.5) * height;
    const radius = Math.random() * 2.2 + 1;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // 5. Manga Vignette
  const vigGrad = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.7);
  vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vigGrad.addColorStop(1, 'rgba(3, 2, 7, 0.85)');
  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, width, height);

  // 6. Watermark Badge
  ctx.fillStyle = 'rgba(15, 10, 28, 0.85)';
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.fillRect(36, 36, 180, 42);
  ctx.strokeRect(36, 36, 180, 42);

  ctx.fillStyle = '#e9d5ff';
  ctx.font = 'bold 18px "Cinzel", Georgia, serif';
  ctx.fillText(`SCENE 0${sceneNumber}`, 56, 63);

  return canvas.toDataURL('image/jpeg', 0.92);
}
