
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
    length: 0,
    width: 0,
    depth: 0,
    sfido: 0
  });

  // Stato per i colori personalizzati
  const [colors, setColors] = useState<SurfaceColors>({
    bottom: '#3b82f6',
    sides_long: '#ef4444',
    sides_short: '#10b981',
    sfido: '#f59e0b' // Colore ambra per lo sfido
  });

  const [isExploded, setIsExploded] = useState(false);

  // Calcolo dinamico delle superfici basato sugli input
  const surfaces = useMemo((): SurfaceData[] => {
    const { length, width, depth } = dimensions;
    
    return [
      { 
        id: 'bottom', 
        label: 'Superficie Inferiore (Base)', 
        area: length * width,
        color: colors.bottom,
        dimensions: `${length.toFixed(2)} x ${width.toFixed(2)} m`
      },
      { 
        id: 'sides_long', 
        label: 'Pareti Laterali Lunghe (x2)', 
        area: length * depth,
        color: colors.sides_long,
        dimensions: `${length.toFixed(2)} x ${depth.toFixed(2)} m`
      },
      { 
        id: 'sides_short', 
        label: 'Pareti Laterali Corte (x2)', 
        area: width * depth,
        color: colors.sides_short,
        dimensions: `${width.toFixed(2)} x ${depth.toFixed(2)} m`
      }
    ];
  }, [dimensions, colors]);

  // Calcola area totale delle superfici (senza sfido)
  const totalArea = useMemo(() => {
    return surfaces.reduce((acc, s) => {
      if (s.id === 'bottom') return acc + s.area;
      return acc + (s.area * 2);
    }, 0);
  }, [surfaces]);

  // Calcola area SFIDO separatamente (strisce sul bordo superiore)
  const sfidoData = useMemo(() => {
    const { length, width, sfido } = dimensions;
    // Sfido pareti lunghe: lunghezza × sfido × 2 pareti
    const sfidoLunghe = length * sfido * 2;
    // Sfido pareti corte: larghezza × sfido × 2 pareti
    const sfidoCorte = width * sfido * 2;
    // Totale sfido
    const totale = sfidoLunghe + sfidoCorte;
    
    return {
      sfidoLunghe,
      sfidoCorte,
      totale,
      sfido
    };
  }, [dimensions]);

  // Totale generale (superfici + sfido)
  const totalAreaConSfido = useMemo(() => {
    return totalArea + sfidoData.totale;
  }, [totalArea, sfidoData]);

  // Funzione per generare il PDF con vista 2D srotolata
  const handleExportPDF = useCallback(async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    let yPos = margin;

    // Data riferimento
    const now = new Date();
    const { length, width, depth, sfido } = dimensions;
    
    // Colori
    const bottomColor = colors.bottom;
    const sideLongColor = colors.sides_long;
    const sideShortColor = colors.sides_short;
    const sfidoColor = colors.sfido || '#f59e0b';
    
    // Aree
    const bottomArea = length * width;
    const sideLongArea = length * depth;
    const sideShortArea = width * depth;

    // ========== PAGINA 1: VISTA 2D SVILUPPATA ==========
    
    // Titolo compatto
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GeoViz - Vista Sviluppata TNT', margin, yPos + 5);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${now.toLocaleDateString('it-IT')}`, pageWidth - margin - 20, yPos + 5);
    
    yPos = 25;

    // Calcolo scala per il disegno 2D
    // Layout: sfido + parete corta + base + parete corta + sfido (orizzontale)
    //         sfido + parete lunga + base + parete lunga + sfido (verticale)
    const totalLayoutWidth = (sfido * 2) + depth + length + depth + (sfido * 2);
    const totalLayoutHeight = (sfido * 2) + depth + width + depth + (sfido * 2);
    
    const drawAreaWidth = pageWidth - margin * 2;
    const drawAreaHeight = 160; // Area dedicata al disegno
    
    const scaleX = drawAreaWidth / totalLayoutWidth;
    const scaleY = drawAreaHeight / totalLayoutHeight;
    const scale = Math.min(scaleX, scaleY) * 0.85;
    
    // Dimensioni scalate
    const sLength = length * scale;
    const sWidth = width * scale;
    const sDepth = depth * scale;
    const sSfido = sfido * scale;
    
    // Centro del disegno
    const centerX = pageWidth / 2;
    const centerY = yPos + drawAreaHeight / 2;
    
    // Posizioni base (centro della croce)
    const baseX = centerX - sLength / 2;
    const baseY = centerY - sWidth / 2;
    
    // Funzione helper per disegnare superficie
    const drawSurface = (x: number, y: number, w: number, h: number, color: string, label: string, area: number) => {
      pdf.setFillColor(
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16)
      );
      pdf.rect(x, y, w, h, 'F');
      pdf.setDrawColor(255, 255, 255);
      pdf.setLineWidth(0.4);
      pdf.rect(x, y, w, h, 'S');
      
      const fontSize = Math.min(9, Math.max(5, Math.min(w, h) / 5));
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(fontSize);
      pdf.text(label, x + w/2, y + h/2 - 2, { align: 'center' });
      pdf.setFontSize(fontSize * 1.2);
      pdf.text(`${area.toFixed(1)} m²`, x + w/2, y + h/2 + 4, { align: 'center' });
    };

    // Disegna le superfici
    // BASE (centro)
    drawSurface(baseX, baseY, sLength, sWidth, bottomColor, 'BASE', bottomArea);
    
    // PARETE LUNGA 1 (sopra)
    drawSurface(baseX, baseY - sDepth, sLength, sDepth, sideLongColor, 'PARETE LUNGA', sideLongArea);
    
    // PARETE LUNGA 2 (sotto)
    drawSurface(baseX, baseY + sWidth, sLength, sDepth, sideLongColor, 'PARETE LUNGA', sideLongArea);
    
    // PARETE CORTA 1 (sinistra)
    drawSurface(baseX - sDepth, baseY, sDepth, sWidth, sideShortColor, 'P.CORTA', sideShortArea);
    
    // PARETE CORTA 2 (destra)
    drawSurface(baseX + sLength, baseY, sDepth, sWidth, sideShortColor, 'P.CORTA', sideShortArea);
    
    // STRISCE SFIDO
    if (sfido > 0 && sSfido > 2) {
      const sfR = parseInt(sfidoColor.slice(1, 3), 16);
      const sfG = parseInt(sfidoColor.slice(3, 5), 16);
      const sfB = parseInt(sfidoColor.slice(5, 7), 16);
      
      pdf.setFillColor(sfR, sfG, sfB);
      pdf.setDrawColor(sfR - 40, sfG - 40, sfB - 40);
      pdf.setLineWidth(0.3);
      
      // Sfido sopra parete lunga 1
      pdf.rect(baseX, baseY - sDepth - sSfido, sLength, sSfido, 'FD');
      
      // Sfido sotto parete lunga 2
      pdf.rect(baseX, baseY + sWidth + sDepth, sLength, sSfido, 'FD');
      
      // Sfido sinistra parete corta 1
      pdf.rect(baseX - sDepth - sSfido, baseY, sSfido, sWidth, 'FD');
      
      // Sfido destra parete corta 2
      pdf.rect(baseX + sLength + sDepth, baseY, sSfido, sWidth, 'FD');
      
      // Etichette sfido
      pdf.setTextColor(80, 50, 0);
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      if (sSfido > 6) {
        pdf.text('SFIDO', baseX + sLength/2, baseY - sDepth - sSfido/2, { align: 'center' });
        pdf.text('SFIDO', baseX + sLength/2, baseY + sWidth + sDepth + sSfido/2 + 1, { align: 'center' });
      }
    }
    
    // Linee piegatura
    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.3);
    pdf.setLineDashPattern([2, 2], 0);
    pdf.line(baseX, baseY, baseX + sLength, baseY);
    pdf.line(baseX, baseY + sWidth, baseX + sLength, baseY + sWidth);
    pdf.line(baseX, baseY, baseX, baseY + sWidth);
    pdf.line(baseX + sLength, baseY, baseX + sLength, baseY + sWidth);
    pdf.setLineDashPattern([], 0);

    // Sposta yPos dopo il disegno
    yPos = centerY + drawAreaHeight/2 + 10;

    // ========== TABELLA RIEPILOGO ==========
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Riepilogo Superfici', margin, yPos);
    yPos += 6;

    // Header tabella
    pdf.setFillColor(241, 245, 249);
    pdf.rect(margin, yPos - 3, pageWidth - margin * 2, 6, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);
    pdf.text('Superficie', margin + 15, yPos);
    pdf.text('Dimensioni', margin + 55, yPos);
    pdf.text('Area', margin + 100, yPos);
    pdf.text('Qtà', margin + 130, yPos);
    pdf.text('Totale', margin + 150, yPos);
    yPos += 6;

    // Righe
    const rows = [
      { color: bottomColor, name: 'Base', dims: `${length.toFixed(1)}×${width.toFixed(1)}m`, area: bottomArea, qty: 1 },
      { color: sideLongColor, name: 'Pareti Lunghe', dims: `${length.toFixed(1)}×${depth.toFixed(1)}m`, area: sideLongArea, qty: 2 },
      { color: sideShortColor, name: 'Pareti Corte', dims: `${width.toFixed(1)}×${depth.toFixed(1)}m`, area: sideShortArea, qty: 2 },
    ];

    rows.forEach(r => {
      pdf.setFillColor(parseInt(r.color.slice(1,3),16), parseInt(r.color.slice(3,5),16), parseInt(r.color.slice(5,7),16));
      pdf.rect(margin + 3, yPos - 2.5, 8, 4, 'F');
      pdf.setTextColor(71, 85, 105);
      pdf.setFont('helvetica', 'normal');
      pdf.text(r.name, margin + 15, yPos);
      pdf.text(r.dims, margin + 55, yPos);
      pdf.text(`${r.area.toFixed(1)} m²`, margin + 100, yPos);
      pdf.text(`×${r.qty}`, margin + 130, yPos);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${(r.area * r.qty).toFixed(1)} m²`, margin + 150, yPos);
      yPos += 5;
    });

    // Subtotale
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Subtotale superfici:', margin + 55, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${totalArea.toFixed(1)} m²`, margin + 150, yPos);
    yPos += 8;

    // SFIDO
    if (sfido > 0) {
      pdf.setFillColor(254, 243, 199);
      pdf.rect(margin, yPos - 3, pageWidth - margin * 2, 18, 'F');
      pdf.setTextColor(146, 64, 14);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text(`SFIDO (${sfido}m sul bordo superiore)`, margin + 5, yPos + 2);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(`Pareti lunghe: ${length.toFixed(1)}m × ${sfido}m × 2 = ${sfidoData.sfidoLunghe.toFixed(1)} m²`, margin + 5, yPos + 8);
      pdf.text(`Pareti corte: ${width.toFixed(1)}m × ${sfido}m × 2 = ${sfidoData.sfidoCorte.toFixed(1)} m²`, margin + 5, yPos + 13);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Totale sfido: ${sfidoData.totale.toFixed(1)} m²`, margin + 120, yPos + 10);
      yPos += 22;
    }

    // TOTALE FINALE
    pdf.setFillColor(30, 41, 59);
    pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 16, 2, 2, 'F');
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(8);
    pdf.text(`Superfici: ${totalArea.toFixed(1)} m² + Sfido: ${sfidoData.totale.toFixed(1)} m²`, margin + 5, yPos + 6);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('TOTALE TNT:', margin + 5, yPos + 12);
    pdf.setFontSize(16);
    pdf.setTextColor(251, 191, 36);
    pdf.text(`${totalAreaConSfido.toFixed(1)} m²`, margin + 45, yPos + 12);

    // Footer
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(7);
    pdf.text('Pagina 1/2', pageWidth / 2, pageHeight - 5, { align: 'center' });

    // ========== PAGINA 2: VISTA 3D ISOMETRICA ==========
    pdf.addPage();
    yPos = margin;
    
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GeoViz - Vista 3D Isometrica', margin, yPos + 5);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`${now.toLocaleDateString('it-IT')}`, pageWidth - margin - 20, yPos + 5);
    
    yPos = 30;

    // Parametri isometrici
    const isoAngle = Math.PI / 6;
    const cos30 = Math.cos(isoAngle);
    const sin30 = Math.sin(isoAngle);
    const isoScale = 16;
    
    const sL = length * isoScale;
    const sW = width * isoScale;
    const sD = depth * isoScale;
    const sSfidoIso = sfido * isoScale;
    
    const isoCenterX = pageWidth / 2;
    const isoCenterY = 130;
    
    const toIso = (x: number, y: number, z: number): [number, number] => {
      return [isoCenterX + (x - z) * cos30, isoCenterY - y + (x + z) * sin30];
    };
    
    // Vertici scavo
    const v = {
      A: toIso(-sL/2, 0, -sW/2), B: toIso(sL/2, 0, -sW/2),
      C: toIso(sL/2, 0, sW/2), D: toIso(-sL/2, 0, sW/2),
      E: toIso(-sL/2, sD, -sW/2), F: toIso(sL/2, sD, -sW/2),
      G: toIso(sL/2, sD, sW/2), H: toIso(-sL/2, sD, sW/2),
    };
    
    // Disegna pareti
    const fillPoly = (pts: [number, number][], r: number, g: number, b: number) => {
      pdf.setFillColor(r, g, b);
      pdf.moveTo(pts[0][0], pts[0][1]);
      pts.forEach(p => pdf.lineTo(p[0], p[1]));
      pdf.fill();
    };
    
    // Parete retro (lunga)
    const sLR = parseInt(sideLongColor.slice(1,3),16);
    const sLG = parseInt(sideLongColor.slice(3,5),16);
    const sLB = parseInt(sideLongColor.slice(5,7),16);
    fillPoly([v.A, v.B, v.F, v.E], sLR, sLG, sLB);
    
    // Parete sinistra (corta)
    const sSR = parseInt(sideShortColor.slice(1,3),16);
    const sSG = parseInt(sideShortColor.slice(3,5),16);
    const sSB = parseInt(sideShortColor.slice(5,7),16);
    fillPoly([v.A, v.D, v.H, v.E], sSR, sSG, sSB);
    
    // Base
    const bR = parseInt(bottomColor.slice(1,3),16);
    const bG = parseInt(bottomColor.slice(3,5),16);
    const bB = parseInt(bottomColor.slice(5,7),16);
    fillPoly([v.A, v.B, v.C, v.D], bR, bG, bB);
    
    // Parete destra (corta) - più chiara
    fillPoly([v.B, v.C, v.G, v.F], Math.min(255, sSR+30), Math.min(255, sSG+30), Math.min(255, sSB+30));
    
    // Parete frontale (lunga) - più chiara
    fillPoly([v.D, v.C, v.G, v.H], Math.min(255, sLR+20), Math.min(255, sLG+20), Math.min(255, sLB+20));
    
    // SFIDO come prolungamento orizzontale delle pareti
    if (sfido > 0) {
      const sfR = parseInt(sfidoColor.slice(1,3),16);
      const sfG = parseInt(sfidoColor.slice(3,5),16);
      const sfB = parseInt(sfidoColor.slice(5,7),16);
      
      // Vertici sfido (si estendono ORIZZONTALMENTE verso l'esterno dal bordo superiore)
      const sfV = {
        E_out: toIso(-sL/2, sD, -sW/2 - sSfidoIso),
        F_out: toIso(sL/2, sD, -sW/2 - sSfidoIso),
        G_out: toIso(sL/2, sD, sW/2 + sSfidoIso),
        H_out: toIso(-sL/2, sD, sW/2 + sSfidoIso),
        E_side: toIso(-sL/2 - sSfidoIso, sD, -sW/2),
        F_side: toIso(sL/2 + sSfidoIso, sD, -sW/2),
        G_side: toIso(sL/2 + sSfidoIso, sD, sW/2),
        H_side: toIso(-sL/2 - sSfidoIso, sD, sW/2),
      };
      
      // Sfido parete retro (lungo Z negativo) - scuro
      fillPoly([v.E, v.F, sfV.F_out, sfV.E_out], Math.max(0, sfR-30), Math.max(0, sfG-30), Math.max(0, sfB-30));
      
      // Sfido parete sinistra (lungo X negativo)
      fillPoly([v.E, sfV.E_side, sfV.H_side, v.H], Math.max(0, sfR-15), Math.max(0, sfG-15), Math.max(0, sfB-15));
      
      // Sfido parete destra (lungo X positivo) - chiaro
      fillPoly([v.F, v.G, sfV.G_side, sfV.F_side], Math.min(255, sfR+15), Math.min(255, sfG+15), Math.min(255, sfB+15));
      
      // Sfido parete frontale (lungo Z positivo)
      fillPoly([v.H, sfV.H_out, sfV.G_out, v.G], sfR, sfG, sfB);
      
      // Bordi sfido
      pdf.setDrawColor(100, 70, 0);
      pdf.setLineWidth(0.3);
      pdf.line(sfV.E_out[0], sfV.E_out[1], sfV.F_out[0], sfV.F_out[1]);
      pdf.line(sfV.F_side[0], sfV.F_side[1], sfV.G_side[0], sfV.G_side[1]);
      pdf.line(sfV.G_out[0], sfV.G_out[1], sfV.H_out[0], sfV.H_out[1]);
      pdf.line(sfV.H_side[0], sfV.H_side[1], sfV.E_side[0], sfV.E_side[1]);
    }
    
    // Bordi scavo
    pdf.setDrawColor(40, 40, 40);
    pdf.setLineWidth(0.5);
    [[v.A,v.B],[v.B,v.C],[v.C,v.D],[v.D,v.A]].forEach(([a,b]) => pdf.line(a[0],a[1],b[0],b[1]));
    [[v.A,v.E],[v.B,v.F],[v.C,v.G],[v.D,v.H]].forEach(([a,b]) => pdf.line(a[0],a[1],b[0],b[1]));
    
    pdf.setLineDashPattern([2,1],0);
    pdf.setDrawColor(80,80,80);
    [[v.E,v.F],[v.F,v.G],[v.G,v.H],[v.H,v.E]].forEach(([a,b]) => pdf.line(a[0],a[1],b[0],b[1]));
    pdf.setLineDashPattern([],0);
    
    // Legenda
    yPos = 220;
    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Legenda Superfici', margin, yPos);
    yPos += 8;
    
    const legendData = [
      { color: bottomColor, name: 'Base', area: bottomArea, qty: 1 },
      { color: sideLongColor, name: 'Pareti Lunghe', area: sideLongArea, qty: 2 },
      { color: sideShortColor, name: 'Pareti Corte', area: sideShortArea, qty: 2 },
    ];
    if (sfido > 0) {
      legendData.push({ color: sfidoColor, name: 'Sfido (bordo sup.)', area: sfidoData.totale, qty: 1 });
    }
    
    legendData.forEach(item => {
      pdf.setFillColor(parseInt(item.color.slice(1,3),16), parseInt(item.color.slice(3,5),16), parseInt(item.color.slice(5,7),16));
      pdf.rect(margin, yPos - 2.5, 12, 5, 'F');
      pdf.setTextColor(71, 85, 105);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(item.name, margin + 16, yPos);
      pdf.text(`${(item.area * item.qty).toFixed(1)} m²`, margin + 70, yPos);
      yPos += 7;
    });
    
    // Dimensioni
    yPos += 5;
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(margin, yPos, pageWidth - margin * 2, 20, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Dimensioni Scavo:', margin + 5, yPos + 7);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${length.toFixed(1)}m × ${width.toFixed(1)}m × ${depth.toFixed(1)}m (L×W×D)`, margin + 45, yPos + 7);
    pdf.text(`Volume: ${(length*width*depth).toFixed(1)} m³`, margin + 120, yPos + 7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(79, 70, 229);
    pdf.text(`TOTALE TNT: ${totalAreaConSfido.toFixed(1)} m²`, margin + 5, yPos + 14);

    // Footer
    pdf.setTextColor(148, 163, 184);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Pagina 2/2 - GeoViz Dynamic', pageWidth / 2, pageHeight - 5, { align: 'center' });

    pdf.save(`GeoViz_Scavo_${now.toISOString().slice(0,10)}.pdf`);
  }, [dimensions, colors, totalArea, sfidoData, totalAreaConSfido]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-100 overflow-hidden text-slate-900">
      {/* Sidebar con Controlli */}
      <Sidebar 
        surfaces={surfaces} 
        dimensions={dimensions} 
        colors={colors}
        sfidoData={sfidoData}
        totalArea={totalArea}
        totalAreaConSfido={totalAreaConSfido}
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
                        colors={colors}
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
