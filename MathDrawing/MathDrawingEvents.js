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
	draggingLabel: null,
	

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
		
		// Подгружаем список задач из таблицы геометрических чертежей сразу после загрузки редактора
		MathDrawingUI.loadListFromSheets();
    },

    getPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const c = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
        return { x: c.clientX - rect.left, y: c.clientY - rect.top };
    },

    handleStart(e) {
        const rawPos = this.getPos(e);
		const pos = MathDrawingEngine.getSmartPos(rawPos, MathDrawingCore.elements);
        this.startPos = this.lastPos = pos;
        const el = MathDrawingCore.elements;
		
		//Координаты новой точки проходят через движок, чтобы просчитать проекции для примагничивания
		const smartPos = MathDrawingEngine.getSmartPos(rawPos, MathDrawingCore.elements);

		const target = MathDrawingEngine.findTarget(pos, el); // Выбор угла по трем точкам
		
		const newPoint = {
			id: Math.random(),
			x: smartPos.x,
			y: smartPos.y,
			name: this.generateName()
		};
		
		// 1. Проверяем попадание в рамки подписей (у них должен быть сохранен lastBox)
        const all = [...el.points, ...el.lines];
        const hit = all.find(obj => obj.lastBox && 
            pos.x > obj.lastBox.x && pos.x < obj.lastBox.x + obj.lastBox.w &&
            pos.y > obj.lastBox.y && pos.y < obj.lastBox.y + obj.lastBox.h);

        if (hit) {
            this.draggingLabel = hit;
            this.activePoint = null; // Защита: не трогаем точку, если схватили подпись
            return; 
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

        // Режим ластика для точки, линии и угла
		if (MathDrawingUI.currentMode === 'eraser') {
			const el = MathDrawingCore.elements;

			// 1. Проверка ТОЧЕК
			const pointTarget = el.points.find(p => MathDrawingEngine.getDist(pos, p) < 15);
			if (pointTarget) {
				MathDrawingUI.menuTarget = pointTarget;
				MathDrawingUI.deleteTarget(pos);
				return;
			}

			// 2. Проверка УГЛОВ (подпись или дуги)
			const angleTarget = el.angles.find(ang => {
				const hitLabel = ang.lastBox && 
					pos.x >= ang.lastBox.x && pos.x <= ang.lastBox.x + ang.lastBox.w &&
					pos.y >= ang.lastBox.y && pos.y <= ang.lastBox.y + ang.lastBox.h;
				
				const vertex = el.points.find(p => p.id === ang.p2);
				const hitArcs = vertex && MathDrawingEngine.getDist(pos, vertex) < 45;
				return hitLabel || hitArcs;
			});
			if (angleTarget) {
				MathDrawingUI.menuTarget = angleTarget;
				MathDrawingUI.deleteTarget(pos);
				return;
			}

			// 3. Проверка ЛИНИЙ
			const lineTarget = el.lines.find(l => MathDrawingEngine.getDistToLine(pos, l, el.points) < 12);
			if (lineTarget) {
				MathDrawingUI.menuTarget = lineTarget;
				MathDrawingUI.deleteTarget(pos);
				return;
			}
			return;
			
			MathDrawingUI.setMode(null);
		}
		
			// Логика режима "Угол" по трем точкам
		if (MathDrawingUI.currentMode === 'angle') {
			if (target && !target.p1id) { // Проверяем, что это точка (у линий есть p1id)
				// Добавляем точку в список выбора, если её там еще нет
				if (!this.selectedForAngle.includes(target.id)) {
					this.selectedForAngle.push(target.id);
				}

				// Если выбрано 3 точки — создаем угол
				if (this.selectedForAngle.length === 3) {
					const newAngle = {
						id: Math.random(),
						p1: this.selectedForAngle[0],
						p2: this.selectedForAngle[1], // Вершина
						p3: this.selectedForAngle[2],
						arcCount: 1,
						arcName: "α",
						isRight: false
					};
					el.angles.push(newAngle);
					MathDrawingCore.save();
					
					this.selectedForAngle = []; // Сброс выбора
					MathDrawingUI.setMode(null); // Выход из режима после создания
				}
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
		
		
		const angleTarget = el.angles.find(ang => {
		// 1. Проверка попадания в бокс подписи
			if (ang.lastBox) {
				const box = ang.lastBox;
				const inBox = pos.x >= box.x && 
							  pos.x <= box.x + box.w && 
							  pos.y >= box.y && 
							  pos.y <= box.y + box.h;
				if (inBox) return true;
			}

			// 2. Проверка попадания в "активную зону" вершины (40 пикселей)
			const vertex = el.points.find(p => p.id === ang.p2);
			if (vertex) {
				const distToVertex = MathDrawingEngine.getDist(pos, vertex);
				if (distToVertex < 40) return true;
			}
			return false;
		});

		if (angleTarget) {
			MathDrawingUI.openMenu(angleTarget, pos, 'angle');
			return;
		}
		MathDrawingRender.draw(this.ctx, this.canvas, el, this);
    },

    generateName() {
        return this.alphabet[MathDrawingCore.elements.points.length % this.alphabet.length];
    },

    handleMove(e) {
		const rawPos = this.getPos(e);
        const pos = MathDrawingEngine.getSmartPos(rawPos, MathDrawingCore.elements);
        this.lastPos = pos;
        if (Math.hypot(pos.x - this.startPos.x, pos.y - this.startPos.y) > 10) clearTimeout(this.tapTimer);
		
		if (this.draggingLabel) {
            const obj = this.draggingLabel;
            const el = MathDrawingCore.elements;
			
			// Вычисляем базу (точку, от которой считается смещение подписи)
            let base = obj.p1id 
                ? { 
                    x: (el.points.find(p=>p.id===obj.p1id).x + el.points.find(p=>p.id===obj.p2id).x)/2, 
                    y: (el.points.find(p=>p.id===obj.p1id).y + el.points.find(p=>p.id===obj.p2id).y)/2 
                  }
                : { x: obj.x, y: obj.y };
				
			// Новое смещение относительно базы
            let dx = pos.x - base.x;
            let dy = pos.y - base.y;
			
			//this.activePoint.x = pos.x;
			//this.activePoint.y = pos.y;

            // Ограничение дистанции "поводка" подписи
            const dist = Math.hypot(dx, dy);
            if (dist > 70) {
                dx *= 70/dist; dy *= 70/dist;
            }

            obj.labelOff = { dx, dy };
            obj.isManual = false; // Фиксируем ручной режим
			
			MathDrawingEngine.updateBoundPoints(MathDrawingCore.elements);
			
            return;
        }

        // Привязка и отвязка точки от линии
        // 2. Перемещение активной точки
        if (this.activePoint && this.isDragging) {
            const el = MathDrawingCore.elements;
            
            // ИСПРАВЛЕНИЕ: Ищем линии для привязки, ИСКЛЮЧАЯ те, где эта точка — вершина
            const potentialLines = el.lines.filter(l => 
                l.p1id !== this.activePoint.id && l.p2id !== this.activePoint.id
            );

            // Теперь проверяем привязку только к "чужим" линиям
            const lineSnap = MathDrawingEngine.getLineSnap(pos, potentialLines, el.points, 3);

            if (lineSnap) {
                // Магнит к чужой линии
                this.activePoint.x = lineSnap.x;
                this.activePoint.y = lineSnap.y;
                this.activePoint.boundLineId = lineSnap.lineId;
                this.activePoint.t = lineSnap.t;
            } else if (this.activePoint.boundLineId) {
                // Если точка уже была привязана, проверяем отрыв или скольжение
                const currentLine = el.lines.find(l => l.id === this.activePoint.boundLineId);
                const distToLine = currentLine ? MathDrawingEngine.getDistToLine(pos, currentLine, el.points) : 999;

                if (distToLine > 5) {
                    this.activePoint.boundLineId = null;
                    this.activePoint.t = null;
                    this.activePoint.x = MathDrawingEngine.smartSnap(pos.x);
                    this.activePoint.y = MathDrawingEngine.smartSnap(pos.y);
                } else {
                    const slideSnap = MathDrawingEngine.getLineSnap(pos, [currentLine], el.points, 20);
                    if (slideSnap) {
                        this.activePoint.x = slideSnap.x;
                        this.activePoint.y = slideSnap.y;
                        this.activePoint.t = slideSnap.t;
                    }
                }
            } else {
                // Обычное свободное движение
                this.activePoint.x = MathDrawingEngine.smartSnap(pos.x);
                this.activePoint.y = MathDrawingEngine.smartSnap(pos.y);
            }

            // Обновляем только те точки, которые реально зависят от движения этой вершины
            const affectedLineIds = el.lines
                .filter(l => l.p1id === this.activePoint.id || l.p2id === this.activePoint.id)
                .map(l => l.id);

            if (affectedLineIds.length > 0) {
                el.points.forEach(p => {
                    if (p.boundLineId && affectedLineIds.includes(p.boundLineId)) {
                        MathDrawingEngine.updateConstrainedPoint(p, el.points, el.lines);
                    }
                });
            }
			
			// Находим все линии, связанные с этой точкой
			const relatedLines = el.lines.filter(l => 
				l.p1id === this.activePoint.id || l.p2id === this.activePoint.id
			);

			relatedLines.forEach(l => {
				// Если у линии есть засечка, и точка привязана к "середине"
				if (l.tick) {
					// Проверяем, находится ли точка всё еще в математическом центре
					const p1 = el.points.find(p => p.id === l.p1id);
					const p2 = el.points.find(p => p.id === l.p2id);
					
					// Если точка (любой конец линии) ушла от изначального "центрального" состояния
					// Или если мы хотим удалять засечки при ЛЮБОМ ручном изменении геометрии:
					l.tick = null;
				}
			});
			
        }		
		
    },

    handleEnd() {
        clearTimeout(this.tapTimer);
        const el = MathDrawingCore.elements;
		const now = Date.now();
		const lineSnap = MathDrawingEngine.getLineSnap(this.lastPos, el.lines, el.points); // Привязка точки к существующей линии
		const pos = this.lastPos;
		const mode = MathDrawingUI.currentMode; // для окружности
		const target = MathDrawingEngine.findTarget(pos, el)

        if (target && this.activePoint) {
            
            // ДОБАВЛЯЕМ ПРОВЕРКУ ДЛЯ ОКРУЖНОСТИ
            if (MathDrawingUI.currentMode === 'circle') {
                if (target.id !== this.activePoint.id) {
                    const alreadyExists = el.circles.find(c => 
                        c.centerId === this.activePoint.id && c.radiusId === target.id
                    );

                    if (!alreadyExists) {
                        el.circles.push({
                            id: Math.random(),
                            centerId: this.activePoint.id,
                            radiusId: target.id
                        });
                        MathDrawingCore.save();
                    }
                }
                // Прекращаем выполнение, чтобы не создалась линия поверх окружности
                this.isDragging = false;
                this.activePoint = null;
                return; 
            }
		
		
			if (this.isDragging && this.activePoint) {
				// Ищем точку, на которую мы "наступили" (кроме самой себя)
				const targetPoint = el.points.find(p => 
					p.id !== this.activePoint.id && 
					MathDrawingEngine.getDist(pos, p) < 15
				);

				if (targetPoint) {
					const oldId = this.activePoint.id;
					const newId = targetPoint.id;

					// 1. Перекидываем линии на оставшуюся точку
					el.lines.forEach(l => {
						if (l.p1id === oldId) l.p1id = newId;
						if (l.p2id === oldId) l.p2id = newId;
					});

					// 2. Перекидываем углы
					el.angles.forEach(a => {
						if (a.p1 === oldId) a.p1 = newId;
						if (a.p2 === oldId) a.p2 = newId;
						if (a.p3 === oldId) a.p3 = newId;
					});

					// --- ИСПРАВЛЕНИЕ ДУБЛИКАТОВ ---
					el.lines = el.lines.filter((line, index, self) => {
						// Удаляем петли (линия из точки в саму себя)
						if (line.p1id === line.p2id) return false;

						// Проверяем, нет ли такой же линии раньше в массиве
						const firstIndex = self.findIndex(l => 
							(l.p1id === line.p1id && l.p2id === line.p2id) || 
							(l.p1id === line.p2id && l.p2id === line.p1id)
						);
						return index === firstIndex;
					});

					el.points = el.points.filter(p => p.id !== oldId);
					
					MathDrawingCore.save();
					this.activePoint = null;
					this.isDragging = false;
					return; // Выходим, чтобы не сработала логика создания новой линии ниже
				}
			}
		
		// ИСПРАВЛЕНИЕ БАГА ПОДПИСИ: Очищаем draggingLabel всегда при отпускании
        if (this.draggingLabel) {
            MathDrawingCore.save();
            this.draggingLabel = null;
        }
		
		// С привязкой точки к линии
		if (this.activePoint && !this.isDragging && Math.hypot(this.lastPos.x - this.startPos.x, this.lastPos.y - this.startPos.y) > 20) {
			const el = MathDrawingCore.elements;
			
			
			// 1. ПРИОРИТЕТ: Ищем существующую точку в радиусе 15px
			let target = el.points.find(p => Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y) < 15);

			if (!target) {
				// 2. ВТОРОЙ ПРИОРИТЕТ: Ищем привязку к линии (3 пикселя)
				const lineSnap = MathDrawingEngine.getLineSnap(this.lastPos, el.lines, el.points);
				
				if (lineSnap) {
					target = { 
						id: Math.random(), 
						x: lineSnap.x, 
						y: lineSnap.y, 
						name: this.generateName(),
						parents: [],
						boundLineId: lineSnap.lineId, // Сохраняем ID линии для привязки
						t: lineSnap.t                 // Сохраняем пропорцию
					};
				} else {
					// 3. ПОСЛЕДНИЙ ВАРИАНТ: Привязка к сетке
					target = { 
						id: Math.random(), 
						x: MathDrawingEngine.snap(this.lastPos.x), 
						y: MathDrawingEngine.snap(this.lastPos.y), 
						name: this.generateName(),
						parents: []
					};
				}
				el.points.push(target);
			}
			
			// Создание линии (код дубликатов, который мы чинили ранее)
			if (target.id !== this.activePoint.id) {
				const alreadyExists = el.lines.find(l => 
					(l.p1id === this.activePoint.id && l.p2id === target.id) || 
					(l.p1id === target.id && l.p2id === this.activePoint.id)
				);

				if (!alreadyExists) {
					el.lines.push({ 
						id: Math.random(), p1id: this.activePoint.id, p2id: target.id, 
						tick: null, isDashed: false, isBold: false, name: '' 
					});
					MathDrawingCore.save();
				}
			}
			
			if (this.draggingLabel && this.draggingLabel.type === 'angle') {
				const ang = this.draggingLabel.obj;
				const dx = this.lastPos.x - this.startPos.x;
				const dy = this.lastPos.y - this.startPos.y;

				// Ограничение в 70 пикселей от начальной точки
				if (Math.hypot(dx, dy) < 70) {
					ang.labelOffset = { x: dx, y: dy };
				}
			}
		}
		
		}
		// Проверка на двойной клик (интервал менее 300мс)
        if (now - this.lastTapTime < 300) {
            const target = MathDrawingEngine.findTarget(this.lastPos, el);
            if (target) {
                // Определяем тип объекта для сообщения
                let typeName = "point";
                if (target.p1id) typeName = "line";
                if (target.arcCount) typeName = "angle";
                
                MathDrawingUI.openMenu(target, this.lastPos, typeName);
                
                this.activePoint = null;
                this.isDragging = false;
                return;
            }
        }
		
        this.lastTapTime = now;

        // Логика завершения создания линии (тянем-бросаем)
        if (this.activePoint && !this.isDragging && Math.hypot(this.lastPos.x - this.startPos.x, this.lastPos.y - this.startPos.y) > 20) {
            const el = MathDrawingCore.elements;
            
            // 1. Ищем существующую точку в радиусе 15px
            let target = el.points.find(p => Math.hypot(p.x - this.lastPos.x, p.y - this.lastPos.y) < 15);

            if (!target) {
                // 2. Если точки нет, ищем привязку к линии (3 пикселя)
                const lineSnap = MathDrawingEngine.getLineSnap(this.lastPos, el.lines, el.points);
                
                if (lineSnap) {
                    target = { 
                        x: lineSnap.x, 
                        y: lineSnap.y, 
                        id: Math.random(), 
                        parents: [], 
                        name: this.generateName(),
                        boundLineId: lineSnap.lineId, 
                        t: lineSnap.t 
                    };
                } else {
                    // 3. Если и линии нет, просто привязываемся к сетке
                    target = { 
                        x: MathDrawingEngine.snap(this.lastPos.x), 
                        y: MathDrawingEngine.snap(this.lastPos.y), 
                        id: Math.random(), 
                        parents: [], 
                        name: this.generateName() 
                    };
                } 
                el.points.push(target);
            }
            
            // Создание линии между активной и целевой точкой
            if (target.id !== this.activePoint.id) {
                const alreadyExists = el.lines.find(l => 
                    (l.p1id === this.activePoint.id && l.p2id === target.id) || 
                    (l.p1id === target.id && l.p2id === this.activePoint.id)
                );

                if (!alreadyExists) {
                    el.lines.push({ 
                        id: Math.random(), 
                        p1id: this.activePoint.id, 
                        p2id: target.id, 
                        tick: null, 
                        isDashed: false, 
                        isBold: false, 
                        name: '' 
                    });
                    MathDrawingCore.save();
                } 
            }
        }
		
		if (target && this.activePoint && target.id !== this.activePoint.id) {
			const mode = MathDrawingUI.currentMode;
			const el = MathDrawingCore.elements;

			// РЕЖИМ ОКРУЖНОСТИ
			if (mode === 'circle') {
				const alreadyExists = el.circles?.find(c => 
					c.centerId === this.activePoint.id && 
					c.radiusId === target.id
				);
				
				if (!alreadyExists) {
					el.circles.push({
						id: Math.random(),
						centerId: this.activePoint.id,
						radiusId: target.id
					});
					MathDrawingCore.save();
				}
				
				MathDrawingUI.setMode(null);
			} 
			
			// ОБЫЧНЫЙ РЕЖИМ (ЛИНИЯ)
			else if (!mode) {
				const alreadyExists = el.lines.find(l => 
					(l.p1id === this.activePoint.id && l.p2id === target.id) || 
					(l.p1id === target.id && l.p2id === this.activePoint.id)
				);

				if (!alreadyExists) {
					el.lines.push({ 
						id: Math.random(), 
						p1id: this.activePoint.id, 
						p2id: target.id, 
						// ... остальные поля линии
					});
					MathDrawingCore.save();
				}
			}
		}
		
		
       
        this.isDragging = false;
        this.activePoint = null;
		this.draggingLabel = null; // Дублирующая защита
		
		},	

		renderLoop(){
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