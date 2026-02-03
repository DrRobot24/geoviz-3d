
import React, { useState, Suspense, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei';
import { Box, Eye, EyeOff, Maximize2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ExcavationModel } from './components/ExcavationModel';
import { Sidebar } from './components/Sidebar';
import { ExcavationDimensions, SurfaceColors, SurfaceData } from './types';

// Centrally handled JSX augmentation in types.ts fixes the 'ambientLight', 'mesh', etc. errors.

const App: React.FC = () => {
  // Stato per le dimensioni dello scavo
  const [dimensions, setDimensions] = useState<ExcavationDimensions>({
    length: 4,
    width: 3,
    depth: 2.5
  });

  // Stato per i colori personalizzati
  const [colors, setColors] = useState<SurfaceColors>({
    bottom: '#3b82f6',
    sides_long: '#ef4444',
    sides_short: '#10b981'
  });

  const [isExploded, setIsExploded] = useState(false);

  // Calcolo dinamico delle superfici basato sugli input
  const surfaces = useMemo((): SurfaceData[] => [
    { 
      id: 'bottom', 
      label: 'Superficie Inferiore (Base)', 
      area: dimensions.length * dimensions.width, 
      color: colors.bottom,
      dimensions: `${dimensions.length.toFixed(2)} x ${dimensions.width.toFixed(2)} m` 
    },
    { 
      id: 'sides_long', 
      label: 'Pareti Laterali Lunghe (x2)', 
      area: dimensions.length * dimensions.depth, 
      color: colors.sides_long,
      dimensions: `${dimensions.length.toFixed(2)} x ${dimensions.depth.toFixed(2)} m` 
    },
    { 
      id: 'sides_short', 
      label: 'Pareti Laterali Corte (x2)', 
      area: dimensions.width * dimensions.depth, 
      color: colors.sides_short,
      dimensions: `${dimensions.width.toFixed(2)} x ${dimensions.depth.toFixed(2)} m` 
    }
  ], [dimensions, colors]);

  // Calcola area totale
  const totalArea = useMemo(() => {
    return surfaces.reduce((acc, s) => {
      if (s.id === 'bottom') return acc + s.area;
      return acc + (s.area * 2);
    }, 0);
  }, [surfaces]);

  // Funzione per generare il PDF con vista 2D srotolata
  const handleExportPDF = useCallback(async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Header
    pdf.setFillColor(79, 70, 229); // indigo-600
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GeoViz Dynamic', margin, 18);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Configuratore Scavo 3D - Report Tecnico', margin, 28);
    
    // Data e ora
    const now = new Date();
    pdf.setFontSize(9);
    pdf.text(`Data: ${now.toLocaleDateString('it-IT')} - Ora: ${now.toLocaleTimeString('it-IT')}`, pageWidth - margin - 55, 28);

    yPos = 50;

    // Titolo sezione disegno
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Vista Sviluppata delle Superfici TNT', margin, yPos);
    yPos += 8;

    // ========== DISEGNO 2D SROTOLATO ==========
    // Calcola scala per adattare il disegno alla pagina
    const drawAreaWidth = pageWidth - margin * 2;
    const maxDrawHeight = 120; // Altezza massima per il disegno
    
    // Calcola le dimensioni proporzionali
    const { length, width, depth } = dimensions;
    
    // Layout: Base al centro, pareti lunghe sopra/sotto, pareti corte ai lati
    // Larghezza totale = parete corta + base + parete corta = depth + length + depth
    // Altezza totale = parete lunga + base + parete lunga = depth + width + depth
    const totalLayoutWidth = depth + length + depth;
    const totalLayoutHeight = depth + width + depth;
    
    // Scala per adattare al PDF
    const scaleX = drawAreaWidth / totalLayoutWidth;
    const scaleY = maxDrawHeight / totalLayoutHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% per margini interni
    
    // Dimensioni scalate
    const sLength = length * scale;
    const sWidth = width * scale;
    const sDepth = depth * scale;
    
    // Centro del disegno
    const centerX = pageWidth / 2;
    const startY = yPos + 5;
    
    // Funzione helper per disegnare un rettangolo con etichette
    const drawSurface = (
      x: number, y: number, w: number, h: number, 
      color: string, label: string, area: number, dims: string
    ) => {
      // Colore di riempimento
      pdf.setFillColor(
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16)
      );
      pdf.rect(x, y, w, h, 'F');
      
      // Bordo
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.5);
      pdf.rect(x, y, w, h, 'S');
      
      // Testo centrato
      const textX = x + w / 2;
      const textY = y + h / 2;
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      
      // Adatta dimensione font alla superficie
      const fontSize = Math.min(10, Math.max(6, Math.min(w, h) / 4));
      pdf.setFontSize(fontSize);
      pdf.text(label, textX, textY - fontSize * 0.4, { align: 'center' });
      
      pdf.setFontSize(fontSize * 1.3);
      pdf.text(`${area.toFixed(2)} m²`, textX, textY + fontSize * 0.5, { align: 'center' });
      
      pdf.setFontSize(fontSize * 0.7);
      pdf.setFont('helvetica', 'normal');
      pdf.text(dims, textX, textY + fontSize * 1.2, { align: 'center' });
    };

    // Colori dalle superfici
    const bottomColor = colors.bottom;
    const sideLongColor = colors.sides_long;
    const sideShortColor = colors.sides_short;
    
    // Aree
    const bottomArea = length * width;
    const sideLongArea = length * depth;
    const sideShortArea = width * depth;

    // 1. BASE (centro)
    const baseX = centerX - sLength / 2;
    const baseY = startY + sDepth;
    drawSurface(baseX, baseY, sLength, sWidth, bottomColor, 'BASE', bottomArea, `${length.toFixed(1)}m × ${width.toFixed(1)}m`);

    // 2. PARETE LUNGA 1 (sopra la base)
    const longWall1X = centerX - sLength / 2;
    const longWall1Y = startY;
    drawSurface(longWall1X, longWall1Y, sLength, sDepth, sideLongColor, 'PARETE LUNGA 1', sideLongArea, `${length.toFixed(1)}m × ${depth.toFixed(1)}m`);

    // 3. PARETE LUNGA 2 (sotto la base)
    const longWall2X = centerX - sLength / 2;
    const longWall2Y = startY + sDepth + sWidth;
    drawSurface(longWall2X, longWall2Y, sLength, sDepth, sideLongColor, 'PARETE LUNGA 2', sideLongArea, `${length.toFixed(1)}m × ${depth.toFixed(1)}m`);

    // 4. PARETE CORTA 1 (sinistra della base)
    const shortWall1X = centerX - sLength / 2 - sDepth;
    const shortWall1Y = startY + sDepth;
    drawSurface(shortWall1X, shortWall1Y, sDepth, sWidth, sideShortColor, 'PARETE CORTA 1', sideShortArea, `${depth.toFixed(1)}m × ${width.toFixed(1)}m`);

    // 5. PARETE CORTA 2 (destra della base)
    const shortWall2X = centerX + sLength / 2;
    const shortWall2Y = startY + sDepth;
    drawSurface(shortWall2X, shortWall2Y, sDepth, sWidth, sideShortColor, 'PARETE CORTA 2', sideShortArea, `${depth.toFixed(1)}m × ${width.toFixed(1)}m`);

    // Linee di piegatura tratteggiate
    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([2, 2], 0);
    
    // Linea tra parete lunga 1 e base
    pdf.line(baseX, baseY, baseX + sLength, baseY);
    // Linea tra base e parete lunga 2
    pdf.line(baseX, baseY + sWidth, baseX + sLength, baseY + sWidth);
    // Linea tra parete corta 1 e base
    pdf.line(baseX, baseY, baseX, baseY + sWidth);
    // Linea tra base e parete corta 2
    pdf.line(baseX + sLength, baseY, baseX + sLength, baseY + sWidth);
    
    pdf.setLineDashPattern([], 0); // Reset dash

    yPos = startY + sDepth * 2 + sWidth + 15;

    // ========== LEGENDA E RIEPILOGO ==========
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Dimensioni Scavo', margin, yPos);
    yPos += 7;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    pdf.text(`Lunghezza (L): ${dimensions.length.toFixed(2)} m   |   Larghezza (W): ${dimensions.width.toFixed(2)} m   |   Profondità (D): ${dimensions.depth.toFixed(2)} m`, margin, yPos);
    yPos += 12;

    // Tabella riepilogo superfici
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Riepilogo Superfici TNT', margin, yPos);
    yPos += 8;

    // Header tabella
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos - 4, pageWidth - margin * 2, 7, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text('Colore', margin + 3, yPos);
    pdf.text('Superficie', margin + 20, yPos);
    pdf.text('Dimensioni', margin + 75, yPos);
    pdf.text('Area unitaria', margin + 115, yPos);
    pdf.text('Qtà', margin + 150, yPos);
    pdf.text('Totale', margin + 165, yPos);
    yPos += 8;

    // Righe tabella
    pdf.setFont('helvetica', 'normal');
    const surfaceData = [
      { color: bottomColor, name: 'Base', dims: `${length.toFixed(1)} × ${width.toFixed(1)} m`, area: bottomArea, qty: 1 },
      { color: sideLongColor, name: 'Pareti Lunghe', dims: `${length.toFixed(1)} × ${depth.toFixed(1)} m`, area: sideLongArea, qty: 2 },
      { color: sideShortColor, name: 'Pareti Corte', dims: `${width.toFixed(1)} × ${depth.toFixed(1)} m`, area: sideShortArea, qty: 2 },
    ];

    surfaceData.forEach((s) => {
      pdf.setFillColor(
        parseInt(s.color.slice(1, 3), 16),
        parseInt(s.color.slice(3, 5), 16),
        parseInt(s.color.slice(5, 7), 16)
      );
      pdf.rect(margin + 3, yPos - 3, 10, 5, 'F');
      
      pdf.setTextColor(71, 85, 105);
      pdf.text(s.name, margin + 20, yPos);
      pdf.text(s.dims, margin + 75, yPos);
      pdf.text(`${s.area.toFixed(2)} m²`, margin + 115, yPos);
      pdf.text(`×${s.qty}`, margin + 150, yPos);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${(s.area * s.qty).toFixed(2)} m²`, margin + 165, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 7;
    });

    yPos += 5;

    // Box Totale
    pdf.setFillColor(30, 41, 59);
    pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 2, 2, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('TOTALE FORNITURA TNT', margin + 8, yPos + 8);
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${totalArea.toFixed(2)} m²`, margin + 8, yPos + 16);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(148, 163, 184);
    pdf.text('* Calcolo: 1 base + 2 pareti lunghe + 2 pareti corte', pageWidth - margin - 65, yPos + 16);

    // Footer pagina 1
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Pagina 1/2 - Vista Sviluppata', pageWidth / 2, pageHeight - 8, { align: 'center' });

    // ========== PAGINA 2: VISTA 3D ==========
    pdf.addPage();
    yPos = margin;

    // Header pagina 2
    pdf.setFillColor(79, 70, 229);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GeoViz Dynamic', margin, 18);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Vista 3D Isometrica con Quote', margin, 28);
    
    pdf.setFontSize(9);
    pdf.text(`Data: ${now.toLocaleDateString('it-IT')}`, pageWidth - margin - 35, 28);

    yPos = 50;

    // ========== DISEGNO ISOMETRICO 3D CON FRECCE ==========
    // Costanti isometriche (angolo 30°)
    const isoAngle = Math.PI / 6; // 30 gradi
    const cos30 = Math.cos(isoAngle);
    const sin30 = Math.sin(isoAngle);
    
    // Scala per adattare al PDF
    const isoScale = 12;
    const sL = length * isoScale; // Lunghezza scalata
    const sW = width * isoScale;  // Larghezza scalata
    const sD = depth * isoScale;  // Profondità/altezza scalata
    
    // Centro del disegno isometrico
    const isoCenterX = pageWidth / 2;
    const isoCenterY = yPos + 70;
    
    // Funzione per convertire coordinate 3D in 2D isometrico
    const toIso = (x: number, y: number, z: number): [number, number] => {
      const isoX = isoCenterX + (x - z) * cos30;
      const isoY = isoCenterY - y + (x + z) * sin30;
      return [isoX, isoY];
    };
    
    // Vertici dello scavo (cubo aperto sopra)
    // Base: y = 0, Top: y = sD
    const vertices = {
      // Base inferiore
      A: toIso(-sL/2, 0, -sW/2),      // Retro sinistra basso
      B: toIso(sL/2, 0, -sW/2),       // Retro destra basso
      C: toIso(sL/2, 0, sW/2),        // Fronte destra basso
      D: toIso(-sL/2, 0, sW/2),       // Fronte sinistra basso
      // Top (bocca aperta)
      E: toIso(-sL/2, sD, -sW/2),     // Retro sinistra alto
      F: toIso(sL/2, sD, -sW/2),      // Retro destra alto
      G: toIso(sL/2, sD, sW/2),       // Fronte destra alto
      H: toIso(-sL/2, sD, sW/2),      // Fronte sinistra alto
    };
    
    // Helper per disegnare una superficie colorata
    const drawFace = (points: [number, number][], color: string) => {
      pdf.setFillColor(
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16)
      );
      
      // Crea il path del poligono
      const path = points.map((p, i) => {
        if (i === 0) return `${p[0]} ${p[1]} m`;
        return `${p[0]} ${p[1]} l`;
      }).join(' ') + ' h';
      
      // Disegna usando linee
      pdf.setLineWidth(0.3);
      pdf.setDrawColor(255, 255, 255);
      
      // Riempi il poligono manualmente
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        pdf.line(p1[0], p1[1], p2[0], p2[1]);
      }
    };
    
    // Disegna le facce visibili (ordine: retro prima, poi lati, poi fronte)
    
    // 1. PARETE POSTERIORE (parete lunga - retro)
    pdf.setFillColor(
      parseInt(sideLongColor.slice(1, 3), 16),
      parseInt(sideLongColor.slice(3, 5), 16),
      parseInt(sideLongColor.slice(5, 7), 16)
    );
    const backWall = [vertices.A, vertices.B, vertices.F, vertices.E];
    pdf.moveTo(backWall[0][0], backWall[0][1]);
    backWall.forEach(v => pdf.lineTo(v[0], v[1]));
    pdf.fill();
    
    // 2. PARETE SINISTRA (parete corta)
    pdf.setFillColor(
      parseInt(sideShortColor.slice(1, 3), 16),
      parseInt(sideShortColor.slice(3, 5), 16),
      parseInt(sideShortColor.slice(5, 7), 16)
    );
    const leftWall = [vertices.A, vertices.D, vertices.H, vertices.E];
    pdf.moveTo(leftWall[0][0], leftWall[0][1]);
    leftWall.forEach(v => pdf.lineTo(v[0], v[1]));
    pdf.fill();
    
    // 3. BASE (superficie inferiore)
    pdf.setFillColor(
      parseInt(bottomColor.slice(1, 3), 16),
      parseInt(bottomColor.slice(3, 5), 16),
      parseInt(bottomColor.slice(5, 7), 16)
    );
    const baseFace = [vertices.A, vertices.B, vertices.C, vertices.D];
    pdf.moveTo(baseFace[0][0], baseFace[0][1]);
    baseFace.forEach(v => pdf.lineTo(v[0], v[1]));
    pdf.fill();
    
    // 4. PARETE DESTRA (parete corta - visibile parzialmente)
    pdf.setFillColor(
      Math.min(255, parseInt(sideShortColor.slice(1, 3), 16) + 30),
      Math.min(255, parseInt(sideShortColor.slice(3, 5), 16) + 30),
      Math.min(255, parseInt(sideShortColor.slice(5, 7), 16) + 30)
    );
    const rightWall = [vertices.B, vertices.C, vertices.G, vertices.F];
    pdf.moveTo(rightWall[0][0], rightWall[0][1]);
    rightWall.forEach(v => pdf.lineTo(v[0], v[1]));
    pdf.fill();
    
    // 5. PARETE FRONTALE (parete lunga - fronte)
    pdf.setFillColor(
      Math.min(255, parseInt(sideLongColor.slice(1, 3), 16) + 20),
      Math.min(255, parseInt(sideLongColor.slice(3, 5), 16) + 20),
      Math.min(255, parseInt(sideLongColor.slice(5, 7), 16) + 20)
    );
    const frontWall = [vertices.D, vertices.C, vertices.G, vertices.H];
    pdf.moveTo(frontWall[0][0], frontWall[0][1]);
    frontWall.forEach(v => pdf.lineTo(v[0], v[1]));
    pdf.fill();
    
    // Bordi dello scavo
    pdf.setDrawColor(50, 50, 50);
    pdf.setLineWidth(0.5);
    
    // Bordi base
    pdf.line(vertices.A[0], vertices.A[1], vertices.B[0], vertices.B[1]);
    pdf.line(vertices.B[0], vertices.B[1], vertices.C[0], vertices.C[1]);
    pdf.line(vertices.C[0], vertices.C[1], vertices.D[0], vertices.D[1]);
    pdf.line(vertices.D[0], vertices.D[1], vertices.A[0], vertices.A[1]);
    
    // Bordi verticali
    pdf.line(vertices.A[0], vertices.A[1], vertices.E[0], vertices.E[1]);
    pdf.line(vertices.B[0], vertices.B[1], vertices.F[0], vertices.F[1]);
    pdf.line(vertices.C[0], vertices.C[1], vertices.G[0], vertices.G[1]);
    pdf.line(vertices.D[0], vertices.D[1], vertices.H[0], vertices.H[1]);
    
    // Bordi top (bocca aperta - tratteggiato)
    pdf.setLineDashPattern([2, 1], 0);
    pdf.setDrawColor(100, 100, 100);
    pdf.line(vertices.E[0], vertices.E[1], vertices.F[0], vertices.F[1]);
    pdf.line(vertices.F[0], vertices.F[1], vertices.G[0], vertices.G[1]);
    pdf.line(vertices.G[0], vertices.G[1], vertices.H[0], vertices.H[1]);
    pdf.line(vertices.H[0], vertices.H[1], vertices.E[0], vertices.E[1]);
    pdf.setLineDashPattern([], 0);
    
    // ========== FRECCE E ANNOTAZIONI ==========
    pdf.setDrawColor(59, 130, 246); // Blu
    pdf.setLineWidth(0.6);
    
    // Funzione per disegnare freccia con etichetta
    const drawArrow = (
      fromX: number, fromY: number, 
      toX: number, toY: number, 
      label: string, 
      labelOffsetX: number = 0, 
      labelOffsetY: number = 0
    ) => {
      // Linea
      pdf.line(fromX, fromY, toX, toY);
      
      // Punta freccia
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const arrowSize = 2;
      pdf.line(toX, toY, 
        toX - arrowSize * Math.cos(angle - Math.PI/6), 
        toY - arrowSize * Math.sin(angle - Math.PI/6));
      pdf.line(toX, toY, 
        toX - arrowSize * Math.cos(angle + Math.PI/6), 
        toY - arrowSize * Math.sin(angle + Math.PI/6));
      
      // Etichetta
      pdf.setTextColor(59, 130, 246);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, fromX + labelOffsetX, fromY + labelOffsetY);
    };
    
    // Centro delle facce per le frecce
    const baseCenter = toIso(0, 0, 0);
    const backCenter = toIso(0, sD/2, -sW/2);
    const frontCenter = toIso(0, sD/2, sW/2);
    const leftCenter = toIso(-sL/2, sD/2, 0);
    const rightCenter = toIso(sL/2, sD/2, 0);
    
    // FRECCIA 1: Parete Lunga (retro) - in alto a sinistra
    drawArrow(margin + 10, yPos + 10, backCenter[0] - 15, backCenter[1] - 5, 
      `${sideLongArea.toFixed(2)} m²`, -5, -3);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Parete Lunga', margin + 5, yPos + 17);
    
    // FRECCIA 2: Parete Corta (sinistra) - a sinistra
    drawArrow(margin + 5, isoCenterY + 20, leftCenter[0] - 5, leftCenter[1], 
      `${sideShortArea.toFixed(2)} m²`, -5, -3);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Parete Corta', margin, isoCenterY + 27);
    
    // FRECCIA 3: Base - in basso
    drawArrow(isoCenterX, isoCenterY + sD/2 + 35, baseCenter[0], baseCenter[1] + 10, 
      `${bottomArea.toFixed(2)} m²`, -12, 12);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Base', isoCenterX - 5, isoCenterY + sD/2 + 48);
    
    // FRECCIA 4: Parete Corta (destra) - a destra
    drawArrow(pageWidth - margin - 5, isoCenterY - 10, rightCenter[0] + 10, rightCenter[1], 
      `${sideShortArea.toFixed(2)} m²`, -25, -3);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Parete Corta', pageWidth - margin - 22, isoCenterY - 3);
    
    // FRECCIA 5: Parete Lunga (fronte) - a destra in basso
    drawArrow(pageWidth - margin - 10, isoCenterY + 45, frontCenter[0] + 15, frontCenter[1] + 5, 
      `${sideLongArea.toFixed(2)} m²`, -30, -3);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Parete Lunga', pageWidth - margin - 25, isoCenterY + 52);
    
    // Etichetta "BOCCA DI SCAVO (APERTA)"
    pdf.setTextColor(100, 116, 139);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    const topCenter = toIso(0, sD, 0);
    pdf.text('BOCCA DI SCAVO (APERTA)', topCenter[0] - 25, topCenter[1] - 8);
    
    yPos = isoCenterY + 80;

    // ========== RIEPILOGO SPECIFICHE ==========
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Specifiche Tecniche', margin, yPos);
    yPos += 8;

    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, yPos - 3, pageWidth - margin * 2, 28, 2, 2, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    
    const specY = yPos + 4;
    
    // Riga 1
    pdf.text(`Dimensioni:`, margin + 5, specY);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${length.toFixed(2)}m × ${width.toFixed(2)}m × ${depth.toFixed(2)}m (L×W×D)`, margin + 30, specY);
    
    const volume = length * width * depth;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Volume:`, margin + 110, specY);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${volume.toFixed(2)} m³`, margin + 128, specY);
    
    // Riga 2
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Superficie TNT Totale:`, margin + 5, specY + 8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(79, 70, 229);
    pdf.text(`${totalArea.toFixed(2)} m²`, margin + 45, specY + 8);
    
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`(1 base + 2 pareti lunghe + 2 pareti corte)`, margin + 65, specY + 8);
    
    // Riga 3 - Legenda colori inline
    yPos = specY + 18;
    pdf.text('Legenda:', margin + 5, yPos);
    
    let legendX = margin + 28;
    const legendItems = [
      { color: bottomColor, name: 'Base' },
      { color: sideLongColor, name: 'Pareti Lunghe' },
      { color: sideShortColor, name: 'Pareti Corte' },
    ];
    
    legendItems.forEach((item) => {
      pdf.setFillColor(
        parseInt(item.color.slice(1, 3), 16),
        parseInt(item.color.slice(3, 5), 16),
        parseInt(item.color.slice(5, 7), 16)
      );
      pdf.rect(legendX, yPos - 3, 8, 4, 'F');
      pdf.setTextColor(71, 85, 105);
      pdf.text(item.name, legendX + 10, yPos);
      legendX += 45;
    });

    // Footer pagina 2
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Pagina 2/2 - Vista 3D Isometrica | Documento generato da GeoViz Dynamic', pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Salva il PDF
    pdf.save(`GeoViz_Scavo_${now.toISOString().slice(0,10)}.pdf`);
  }, [dimensions, colors, totalArea]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-100 overflow-hidden text-slate-900">
      {/* Sidebar con Controlli */}
      <Sidebar 
        surfaces={surfaces} 
        dimensions={dimensions} 
        colors={colors}
        onDimensionsChange={setDimensions}
        onColorsChange={setColors}
        onExportPDF={handleExportPDF}
      />

      {/* Viewport 3D */}
      <div className="flex-1 relative overflow-hidden bg-slate-200">
        
        <div className="absolute top-6 left-6 z-10 space-y-2 pointer-events-none">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2 drop-shadow-sm">
                <Box className="w-7 h-7 text-indigo-600" />
                Configuratore Scavo 3D
            </h1>
            <p className="text-slate-600 max-w-sm glass-panel p-4 rounded-2xl text-xs font-medium shadow-lg pointer-events-auto border border-white/60">
                Inserisci le misure per calcolare mq e visualizzare il telo TNT.
            </p>
        </div>

        <div className="absolute top-6 right-6 z-10 flex gap-3">
            <button 
                onClick={() => setIsExploded(!isExploded)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold transition-all shadow-xl border active:scale-95 ${
                    isExploded 
                    ? 'bg-indigo-600 text-white border-indigo-500' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
            >
                {isExploded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {isExploded ? 'Vista Compatta' : 'Vista Esplosa'}
            </button>
        </div>

        <div className="w-full h-full">
            <Canvas 
                shadows 
                gl={{ antialias: true, alpha: true }}
            >
                <PerspectiveCamera makeDefault position={[8, 8, 8]} fov={35} />
                <OrbitControls 
                    enableDamping 
                    dampingFactor={0.05}
                    minDistance={3}
                    maxDistance={30}
                    maxPolarAngle={Math.PI / 2.1}
                />
                
                {/* Fix: ambientLight and directionalLight now recognized via global augmentation */}
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />

                <Suspense fallback={null}>
                    <Environment preset="city" />
                    <ExcavationModel 
                        dimensions={dimensions} 
                        surfaces={surfaces} 
                        isExploded={isExploded}
                    />
                    
                    {/* Fix: mesh and geometry elements now recognized */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                        <circleGeometry args={[20, 64]} />
                        <meshStandardMaterial color="#cbd5e1" roughness={1} metalness={0} />
                    </mesh>
                </Suspense>

                <ContactShadows position={[0, -0.01, 0]} opacity={0.25} scale={25} blur={3} far={10} />
            </Canvas>
        </div>

        <div className="absolute bottom-6 right-6 text-slate-400 text-[10px] font-black tracking-widest uppercase flex items-center gap-2 glass-panel px-5 py-2.5 rounded-full shadow-lg border border-white/40">
            <Maximize2 className="w-3.5 h-3.5" />
            Controllo 3D: Mouse/Touch
        </div>
      </div>
    </div>
  );
};

export default App;
