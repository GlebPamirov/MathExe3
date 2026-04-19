/**
 * MathDrawingEvents — Слушатель событий мыши и касаний.
 */
const MathDrawingEvents = {
    canvas: null,
    ctx: null,
    isDragging: false,
    activePoint: null,
    startPos: { x: 0, y: 0 },
    lastPos: { x: 0, y: 0 },
    tapTimer: null,
    lastTapTime: 0,
    selectedForAngle: [],
    alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
	draggingLabel: null, // Новое состояние

	init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        // Устанавливаем физический размер холста
        this.canvas.width = 400;
        this.canvas.height = 300;

        // Биндим контекст, чтобы события не теряли доступ к this.ctx
        this.handleStart = this.handleStart.bind(this);
        this.handleMove = this.handleMove.bind(this);
        this.handleEnd = this.handleEnd.bind(this);

        this.canvas.addEventListener('mousedown', this.handleStart);
        window.addEventListener('mousemove', this.handleMove);
        window.addEventListener('mouseup', this.handleEnd);

        // Для мобильных устройств
        this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleStart(e); }, { passive: false });
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.handleMove(e); }, { passive: false });
        this.canvas.addEventListener('touchend', this.handleEnd);

        console.log("Events initialized. Starting loop...");
        this.renderLoop(); 
    },

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const c = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
        return { x: c.clientX - rect.left, y: c.clientY - rect.top };
    },

    handleStart(e) {
        const pos = this.getPos(e);
        this.startPos = this.lastPos = pos;
        const el = MathDrawingCore.elements;
		
		// 1. Проверяем попадание в рамки подписей (у них должен быть сохранен lastBox)
        const all = [...el.points, ...el.lines];
        const hit = all.find(obj => obj.lastBox && 
            pos.x > obj.lastBox.x && pos.x < obj.lastBox.x + obj.lastBox.w &&
            pos.y > obj.lastBox.y && pos.y < obj.lastBox.y + obj.lastBox.h);

        if (hit) {
            this.draggingLabel = hit;
            return; // Прерываем, чтобы не начать рисовать линию
        }

        // Закрываем меню при новом клике
        MathDrawingUI.closeMenu();
		
		// Ищем точку под курсором
        const hitP = el.points.find(p => Math.hypot(p.x - pos.x, p.y - pos.y) < 15);
		
		// Если точку не нашли, ищем ближайшую линию (используем Engine)
		let hitL = null;
        if (!hitP) {
            hitL = el.lines.find(l => MathDrawingEngine.getDistToLine(pos, l, el.points) < 10);
        }
		
        this.activePoint = hitP;

        // Режим ластика для точки и линии
        if (MathDrawingUI.currentMode === 'eraser') {
            if (hitP) {
                MathDrawingUI.menuTarget = hitP;
                MathDrawingUI.deleteTarget();
            } else if (hitL) {
                MathDrawingUI.menuTarget = hitL;
                MathDrawingUI.deleteTarget();
            }
            return;
        }

        // Логика создания точки/линии
        this.tapTimer = setTimeout(() => {
            // Если мы не сдвинулись далеко — это либо клик (создание), либо начало перетаскивания
            if (Math.hypot(this.lastPos.x - this.startPos.x, this.lastPos.y - this.startPos.y) < 10) {
                if (!this.activePoint) {
                    // Создаем новую точку
                    const newPoint = { 
                        x: MathDrawingEngine.snap(this.startPos.x), 
                        y: MathDrawingEngine.snap(this.startPos.y), 
                        id: Math.random(), 
                        parents: [], 
                        name: this.generateName(),
                        isHollow: false
                    };
                    el.points.push(newPoint);
                    this.activePoint = newPoint;
                    MathDrawingCore.save();
                } else {
                    this.isDragging = true;
                }
            }
        }, 200); // Уменьшил задержку для отзывчивости
		
    },

    generateName() {
        return this.alphabet[MathDrawingCore.elements.points.length % this.alphabet.length];
    },

    handleMove(e) {
        const pos = this.getPos(e);
        this.lastPos = pos;
        if (Math.hypot(pos.x - this.startPos.x, pos.y - this.startPos.y) > 10) clearTimeout(this.tapTimer);
		
		if (this.draggingLabel) {
            const obj = this.draggingLabel;
            const el = MathDrawingCore.elements;
            let base = obj.p1id 
                ? { 
                    x: (el.points.find(p=>p.id===obj.p1id).x + el.points.find(p=>p.id===obj.p2id).x)/2, 
                    y: (el.points.find(p=>p.id===obj.p1id).y + el.points.find(p=>p.id===obj.p2id).y)/2 
                  }
                : { x: obj.x, y: obj.y };

            let dx = pos.x - base.x;
            let dy = pos.y - base.y;

            // Лимит 70px
            const dist = Math.hypot(dx, dy);
            if (dist > 70) {
                dx *= 70/dist; dy *= 70/dist;
            }

            obj.labelOff = { dx, dy };
            obj.isManual = false; // Фиксируем ручной режим
            return;
        }

        if (this.isDragging && this.activePoint) {
            this.activePoint.x = pos.x;
            this.activePoint.y = pos.y;
            
            // Динамическое обновление зависимых точек (пересечений)
            MathDrawingCore.elements.points.forEach(p => {
                if (p.parents && p.parents.length === 2) {
                    const l1 = MathDrawingCore.elements.lines.find(l => l.id === p.parents[0].lid);
                    const l2 = MathDrawingCore.elements.lines.find(l => l.id === p.parents[1].lid);
                    if (l1 && l2) {
                        const inter = MathDrawingEngine.getLinesIntersection(l1, l2, MathDrawingCore.elements.points);
                        if (inter) { p.x = inter.x; p.y = inter.y; }
                    }
                }
            });
        }
    },

    handleEnd() {
        clearTimeout(this.tapTimer);
        const el = MathDrawingCore.elements;
		
		if (this.draggingLabel) {
            MathDrawingCore.save();
            this.draggingLabel = null;
        }

        if (this.isDragging && this.activePoint) {
            // "Слипание" точек при завершении перетаскивания
            const target = el.points.find(p => p.id !== this.activePoint.id && Math.hypot(p.x - this.activePoint.x, p.y - this.activePoint.y) < 15);
            if (target) {
                el.lines.forEach(l => { if (l.p1id === this.activePoint.id) l.p1id = target.id; if (l.p2id === this.activePoint.id) l.p2id = target.id; });
                el.angles.forEach(a => { if (a.p1 === this.activePoint.id) a.p1 = target.id; if (a.p2 === this.activePoint.id) a.p2 = target.id; if (a.p3 === this.activePoint.id) a.p3 = target.id; });
                el.points = el.points.filter(p => p.id !== this.activePoint.id);
            }
            MathDrawingCore.save();
        } 
        // Создание линии, если мы "вытянули" её из точки
        else if (this.activePoint && !this.isDragging && Math.hypot(this.lastPos.x - this.startPos.x, this.lastPos.y - this.startPos.y) > 20) {
            const inter = MathDrawingEngine.findIntersection(this.lastPos, el);
            let target = inter ? { ...inter, id: Math.random(), name: this.generateName() } : { x: MathDrawingEngine.snap(this.lastPos.x), y: MathDrawingEngine.snap(this.lastPos.y), id: Math.random(), parents: [], name: this.generateName() };
            
            const existing = el.points.find(p => Math.hypot(p.x - target.x, p.y - target.y) < 15);
            if (existing) target = existing; else el.points.push(target);
            
            if (target.id !== this.activePoint.id) {
                el.lines.push({ id: Math.random(), p1id: this.activePoint.id, p2id: target.id, tick: null, isDashed: false, isBold: false, name: '' });
                MathDrawingCore.save();
            }
        }
        
        this.isDragging = false;
        this.activePoint = null;
    },

	renderLoop() {
        if (!this.ctx) return;
        
        try {
            MathDrawingRender.draw(this.ctx, this.canvas, MathDrawingCore.elements, {
                isDragging: this.isDragging,
                activePoint: this.activePoint,
                lastPos: this.lastPos,
                selectedForAngle: this.selectedForAngle || []
            });
        } catch (err) {
            console.error("Ошибка отрисовки:", err);
        }
        
        requestAnimationFrame(() => this.renderLoop());
    },
};