//Здесь сосредоточена вся математическая логика: расчет расстояний, поиск пересечений и привязка к сетке.

/**
 * MathDrawingEngine — Геометрический процессор.
 */
const MathDrawingEngine = {
    GRID: 25,       // Шаг сетки
    SNAP_DIST: 15,  // Дистанция притяжения (магнит)

    /** Привязка значения к сетке */
    snap(val) {
        return Math.round(val / this.GRID) * this.GRID;
    },

    /** Расстояние между двумя точками {x, y} */
    getDist(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    },

    /** Расстояние от точки p до отрезка l */
    getDistToLine(p, l, points) {
        const p1 = points.find(pt => pt.id === l.p1id);
        const p2 = points.find(pt => pt.id === l.p2id);
        if (!p1 || !p2) return 999;
        const L2 = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
        if (L2 === 0) return this.getDist(p, p1);
        let t = Math.max(0, Math.min(1, ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / L2));
        return Math.hypot(p.x - (p1.x + t * (p2.x - p1.x)), p.y - (p1.y + t * (p2.y - p1.y)));
    },

    /** Поиск точки пересечения всех существующих линий в заданной позиции */
    findIntersection(pos, elements) {
        const { lines, points } = elements;
        for (let i = 0; i < lines.length; i++) {
            for (let j = i + 1; j < lines.length; j++) {
                const l1 = lines[i], l2 = lines[j];
                const p1 = points.find(p => p.id === l1.p1id);
                const p2 = points.find(p => p.id === l1.p2id);
                const p3 = points.find(p => p.id === l2.p1id);
                const p4 = points.find(p => p.id === l2.p2id);
                if (!p1 || !p2 || !p3 || !p4) continue;

                const den = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
                if (Math.abs(den) < 1) continue;

                const inter = {
                    x: ((p1.x * p2.y - p1.y * p2.x) * (p3.x - p4.x) - (p1.x - p2.x) * (p3.x * p4.y - p3.y * p4.x)) / den,
                    y: ((p1.x * p2.y - p1.y * p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x * p4.y - p3.y * p4.x)) / den
                };

                if (Math.hypot(pos.x - inter.x, pos.y - inter.y) < this.SNAP_DIST) {
                    return { ...inter, parents: [{ lid: l1.id }, { lid: l2.id }] };
                }
            }
        }
        return null;
    }, 
	
	getLabelSize(ctx, text) {
        ctx.font = "italic 13px Arial"; // Тот же шрифт, что в Render
        const m = ctx.measureText(text);
        const padding = 4;
        return { w: m.width + padding * 2, h: 16 };
    },

    /** Проверка пересечения линии и прямоугольника (рамки подписи) */
    lineRectIntersect(p1, p2, rx, ry, rw, rh) {
        const intersect = (a, b, c, d) => {
            const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
            if (det === 0) return false;
            const lambda = ((d.y - c.y) * (d.x - a.x) + (c.x - d.x) * (d.y - a.y)) / det;
            const gamma = ((a.y - b.y) * (d.x - a.x) + (b.x - a.x) * (d.y - a.y)) / det;
            return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
        };
        const edges = [
            {a: {x: rx, y: ry}, b: {x: rx + rw, y: ry}},
            {a: {x: rx + rw, y: ry}, b: {x: rx + rw, y: ry + rh}},
            {a: {x: rx + rw, y: ry + rh}, b: {x: rx, y: ry + rh}},
            {a: {x: rx, y: ry + rh}, b: {x: rx, y: ry}}
        ];
        return edges.some(edge => intersect(p1, p2, edge.a, edge.b));
    },

    /** Поиск лучшей позиции для подписи */
    calculateSmartPos(ctx, owner, text, elements) {
        const size = this.getLabelSize(ctx, text);
        const MAX_DRAG = 70;

        // Определяем базовую точку (центр линии или координаты точки)
        let base = owner.p1id 
            ? { 
                x: (elements.points.find(p=>p.id===owner.p1id).x + elements.points.find(p=>p.id===owner.p2id).x)/2, 
                y: (elements.points.find(p=>p.id===owner.p1id).y + elements.points.find(p=>p.id===owner.p2id).y)/2 
              }
            : { x: owner.x, y: owner.y };

        // Если есть ручное смещение
        if (!owner.labelOff) owner.labelOff = { dx: 12, dy: -20 };
        
        let tx = base.x + owner.labelOff.dx;
        let ty = base.y + owner.labelOff.dy;

        // Если не в ручном режиме — проверяем коллизии и ищем замену
        if (!owner.isManual) {
            const isBlocked = (x, y) => {
                const hitP = elements.points.some(p => (p.x > x && p.x < x + size.w && p.y > y && p.y < y + size.h));
                const hitL = elements.lines.some(l => {
                    const p1 = elements.points.find(pt => pt.id === l.p1id);
                    const p2 = elements.points.find(pt => pt.id === l.p2id);
                    return this.lineRectIntersect(p1, p2, x, y, size.w, size.h);
                });
                return hitP || hitL;
            };

            if (isBlocked(tx, ty)) {
                const dirs = [
                    {dx: 12, dy: -20}, {dx: -size.w-12, dy: -20}, 
                    {dx: 12, dy: 10}, {dx: -size.w-12, dy: 10},
                    {dx: -size.w/2, dy: 15}
                ];
                for (let d of dirs) {
                    if (!isBlocked(base.x + d.dx, base.y + d.dy)) {
                        tx = base.x + d.dx; ty = base.y + d.dy;
                        owner.labelOff = d; // Запоминаем удачный авто-отскок
                        break;
                    }
                }
            }
        }

        return { x: tx, y: ty, w: size.w, h: size.h };
    },
	
	/** Поиск любого объекта (точки или линии) под курсором */
    findTarget(pos, elements) {
        // 1. Сначала ищем точки (у них приоритет)
        const point = elements.points.find(p => this.getDist(pos, p) < this.SNAP_DIST);
        if (point) return point;

        // 2. Если точка не найдена, ищем линии
        const line = elements.lines.find(l => this.getDistToLine(pos, l, elements.points) < 10);
        if (line) return line;

        // 3. Ищем углы (если есть)
        if (elements.angles) {
            const angle = elements.angles.find(a => {
                const p2 = elements.points.find(pt => pt.id === a.p2);
                return p2 && this.getDist(pos, p2) < 20; // Клик рядом с вершиной угла
            });
            if (angle) return angle;
        }

        return null;
    }
	
	
};