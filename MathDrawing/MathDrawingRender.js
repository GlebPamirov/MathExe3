/**
 * MathDrawingRender — Модуль отрисовки.
 */
const MathDrawingRender = {
    POINT_RADIUS: 4,

    /** Главный цикл отрисовки */
    draw(ctx, canvas, elements, state) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawGrid(ctx, canvas.width, canvas.height);
        
        // Порядок важен: сначала углы, потом линии, в конце точки
        elements.angles.forEach(ang => this.drawAngle(ctx, ang, elements.points));
        elements.lines.forEach(l => this.drawLine(ctx, l, elements.points));
        elements.points.forEach(p => this.drawPoint(ctx, p, state.selectedForAngle));

        // Отрисовка "резиновой нити" при создании линии
        if (state.activePoint && !state.isDragging) {
            this.drawTempLine(ctx, state.activePoint, state.lastPos);
        }
    },

	drawGrid(ctx, w, h) {
        ctx.save();
        ctx.beginPath(); 
        ctx.strokeStyle = '#e2e2e2'; 
        ctx.lineWidth = 0.5;
        ctx.setLineDash([]); 
        
        // Используем прямое число 25, если модуль Engine еще не подтянулся
        const step = (typeof MathDrawingEngine !== 'undefined') ? MathDrawingEngine.GRID : 25;
        
        for (let i = 0; i <= w; i += step) {
            ctx.moveTo(i, 0); 
            ctx.lineTo(i, h);
        }
        for (let i = 0; i <= h; i += step) {
            ctx.moveTo(0, i); 
            ctx.lineTo(w, i);
        }
        
        ctx.stroke(); // ОБЯЗАТЕЛЬНО: без этого линии не появятся
        ctx.restore();
    },

    drawPoint(ctx, p, selectedIds) {
        if (!p) return;

        // Расчет и отрисовка подписи
        const box = MathDrawingEngine.calculateSmartPos(ctx, p, p.name, MathDrawingCore.elements);
        p.lastBox = box; 
        this.drawLabelBox(ctx, box, p.name, '#2d3436');
        
        ctx.beginPath(); 
        ctx.arc(p.x, p.y, this.POINT_RADIUS, 0, Math.PI * 2);

        // Определяем цвет (розовый если выбрана, иначе темно-серый)
        const mainColor = selectedIds.includes(p.id) ? '#ff7675' : '#2d3436';

        if (p.isHollow) {
            // Выколотая точка: белый центр и цветная обводка
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 2; // Делаем ободок чуть заметнее
            ctx.strokeStyle = mainColor;
            ctx.stroke();
        } else {
            // Обычная закрашенная точка
            ctx.fillStyle = mainColor;
            ctx.fill();
        }
    },

    drawLine(ctx, l, points) {
        const p1 = points.find(p => p.id === l.p1id);
        const p2 = points.find(p => p.id === l.p2id);
        if (!p1 || !p2) return;
		
		// включить подпись линии по умолчанию для отладки
		//l.name = 'line';

        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = '#2d3436'; 
        ctx.lineWidth = l.isBold ? 4 : 1.5;
        if (l.isDashed) ctx.setLineDash([5, 5]); else ctx.setLineDash([]);
        ctx.stroke();
        ctx.setLineDash([]);

        
        // Отрисовка засечек (ticks)
        if (l.tick) this.drawTicks(ctx, p1, p2, l.tick);
		
		if (l.name) {
            const box = MathDrawingEngine.calculateSmartPos(ctx, l, l.name, MathDrawingCore.elements);
            l.lastBox = box;
            this.drawLabelBox(ctx, box, l.name, '#636e72');
        };
    },

    drawTicks(ctx, p1, p2, type) {
        const m = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
        const offs = type === 'I' ? [0] : (type === 'II' ? [-3, 3] : [-4, 0, 4]);
        
        ctx.beginPath();
        offs.forEach(o => {
            const ox = Math.cos(ang - Math.PI / 2) * o, oy = Math.sin(ang - Math.PI / 2) * o;
            ctx.moveTo(m.x + ox - Math.cos(ang) * 6, m.y + oy - Math.sin(ang) * 6);
            ctx.lineTo(m.x + ox + Math.cos(ang) * 6, m.y + oy + Math.sin(ang) * 6);
        });
        ctx.stroke();
    },

    drawAngle(ctx, ang, points) {
        const p1 = points.find(p => p.id === ang.p1);
        const p2 = points.find(p => p.id === ang.p2);
        const p3 = points.find(p => p.id === ang.p3);
        if (!p1 || !p2 || !p3) return;

        let a1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        let a3 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        let diff = (a3 - a1 + Math.PI * 2) % (Math.PI * 2);
        if (diff > Math.PI) { [a1, a3] = [a3, a1]; diff = Math.PI * 2 - diff; }
        
        ctx.strokeStyle = '#0984e3'; ctx.lineWidth = 1.5;
        
        // Прямой угол или дуги
        if (Math.abs(diff - Math.PI / 2) < 0.1) {
            const d = 15;
            ctx.beginPath();
            ctx.moveTo(p2.x + Math.cos(a1) * d, p2.y + Math.sin(a1) * d);
            ctx.lineTo(p2.x + Math.cos(a1) * d + Math.cos(a3) * d, p2.y + Math.sin(a1) * d + Math.sin(a3) * d);
            ctx.lineTo(p2.x + Math.cos(a3) * d, p2.y + Math.sin(a3) * d);
            ctx.stroke();
        } else {
            for (let n = 0; n < ang.arcCount; n++) {
                ctx.beginPath(); ctx.arc(p2.x, p2.y, 18 + n * 4, a1, a3, false); ctx.stroke();
            }
        }

        if (ang.greek) {
            const midA = a1 + diff / 2;
            ctx.fillStyle = '#0984e3'; ctx.font = '16px serif';
            ctx.fillText(ang.greek, p2.x + Math.cos(midA) * 38 - 4, p2.y + Math.sin(midA) * 38 + 5);
        }
    },

    drawTempLine(ctx, from, to) {
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = '#0984e3'; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
    }, 
	
	drawLabelBox(ctx, box, text, color) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(box.x, box.y, box.w, box.h);
        ctx.fillStyle = color;
        ctx.font = "italic 13px Arial";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(text, box.x + 4, box.y + 2);
    }
};