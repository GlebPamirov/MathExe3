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
    }
};