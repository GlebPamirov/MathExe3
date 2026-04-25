//Управляет интерфейсом: переключением режимов, модальными окнами и контекстным меню.

/**
 * MathDrawingUI — Модуль интерфейса.
 */
const MathDrawingUI = {
    currentMode: null,
    menuTarget: null,
    greeks: ["α", "β", "γ", "δ", "φ"],

    /** Переключение режима (Угол, Ластик, Окружность и т.д.) */
    setMode(mode) {
        this.currentMode = (this.currentMode === mode) ? null : mode; // Позволяет отжимать кнопки вручную 
        MathDrawingEvents.selectedForAngle = []; // Сброс выбора при смене режима
		
        document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
        if (this.currentMode) {
            const btn = document.getElementById(mode + '-mode-btn');
			
            if (btn) btn.classList.add('active');
				numbers_of_circles_2 = MathDrawingCore.elements.circles.length;
        }
		
    },
	

    /** Открытие контекстного меню объекта */
    openMenu(obj, pos, type) {
        this.menuTarget = obj;
        const menu = document.getElementById('master-menu');
        const content = document.getElementById('menu-content');
        content.innerHTML = '';

        if (type === 'point') {
            content.innerHTML = `
                <div class="menu-row"> 
					<label> 
						Обозначение 
					</label>
					<input type="text" value="${obj.name}" class="menu-input" oninput="MathDrawingUI.menuTarget.name=this.value">
				</div>
                <div class="menu-row">
					<button class="btn-sm" onclick="MathDrawingUI.menuTarget.isHollow=!MathDrawingUI.menuTarget.isHollow;MathDrawingCore.save();">
						<label> 
							Выколоть / Закрасить 
						</label>
					</button>
				</div>
				<div class="menu-row">
					<button class="btn-sm" onclick="MathDrawingEngine.splitLineAtPoint()">
						Разделить отрезок
					</button>
				</div>`;
        } 
		
		if (type === 'angle') {
			content.innerHTML = `
                <div class="menu-row">
                    <label>Греч. символ:</label>
                    <div class="symbol-grid">
                        ${this.greeks.map(g => `
                            <button class="btn-sm ${obj.greek === g ? 'active' : ''}" 
                                onclick="MathDrawingUI.setAngleLabel('greek', '${g}')">${g}</button>
                        `).join('')}
                    </div>
                </div>
                <div class="menu-row">
                    <label>Номер угла:</label>
                    <div class="symbol-grid">
                        <button class="btn-sm" onclick="MathDrawingUI.setAngleLabel('digit', '1')">1</button>
						<button class="btn-sm" onclick="MathDrawingUI.setAngleLabel('digit', '2')">2</button>
						<button class="btn-sm" onclick="MathDrawingUI.setAngleLabel('digit', '3')">3</button>
						<button class="btn-sm" onclick="MathDrawingUI.setAngleLabel('digit', '4')">4</button>
                    </div>
                </div>
                <div class="menu-row">
                    <label>Градусы:</label>
                    <input type="number" placeholder="°" class="menu-input" style="width:60px"
                        onchange="MathDrawingUI.setAngleLabel('degree', this.value)">
                </div>
                <div class="menu-row">
                    <label>Радианы:</label>
                    <button class="btn-sm" onclick="MathDrawingUI.setAngleLabel('greek', 'π')"> π </button>
                </div>
                <div class="menu-row">
					Дуги: 
					<button class="btn-sm" onclick="MathDrawingUI.menuTarget.arcCount=1;MathDrawingCore.save();"> 1 </button>
					<button class="btn-sm" onclick="MathDrawingUI.menuTarget.arcCount=2;MathDrawingCore.save();"> 2 </button>
					<button class="btn-sm" onclick="MathDrawingUI.menuTarget.arcCount=3;MathDrawingCore.save();"> 3 </button>
				</div>`;
        } 
		
		if (type === 'line') {
            content.innerHTML = `
                <div class="menu-row"> 
					<label> Обозначение </label>
					<input type="text" value="${obj.name}" class="menu-input" oninput="MathDrawingUI.menuTarget.name=this.value">
				</div>
                <div class="menu-row">
					<button class="btn-sm" onclick="MathDrawingUI.menuTarget.isDashed=!MathDrawingUI.menuTarget.isDashed;MathDrawingCore.save();">
						Пунктир 
					</button>
					<button class="btn-sm" onclick="MathDrawingUI.menuTarget.isBold=!MathDrawingUI.menuTarget.isBold;MathDrawingCore.save();">
						Жирная 
					</button>
					<button class="btn-sm" onclick="MathDrawingEngine.addMidpoint()">
						Пополам
					</button>
				</div>
                <div class="menu-row">
					Засечки: 
					<button class="btn-sm" onclick="MathDrawingUI.setTick('I')">I</button>
					<button class="btn-sm" onclick="MathDrawingUI.setTick('II')">II</button>
					<button class="btn-sm" onclick="MathDrawingUI.setTick('III')">III</button>
				</div>`;
        }
		
        menu.style.display = 'flex'; 
        menu.style.left = Math.min(pos.x, 220) + 'px';
        menu.style.top = Math.min(pos.y, 180) + 'px';
		
		
    },

    setTick(t) {
        this.menuTarget.tick = (this.menuTarget.tick === t) ? null : t;
        MathDrawingCore.save();
    },

    closeMenu() {
        document.getElementById('master-menu').style.display = 'none';
        this.menuTarget = null;
    },

	/** Удаление объекта через меню или ластик */
    deleteTarget(clickPos) {
		const target = this.menuTarget;
		if (!target) return;

		const el = MathDrawingCore.elements;
		// Используем переданные координаты от ластика или позицию последнего клика
		const pos = clickPos || MathDrawingEvents.lastPos;

		// 1. Логика для УГЛА
		if (target.p1 && target.p2 && target.p3) {
			const hitLabel = target.lastBox && 
				pos.x >= target.lastBox.x && pos.x <= target.lastBox.x + target.lastBox.w &&
				pos.y >= target.lastBox.y && pos.y <= target.lastBox.y + target.lastBox.h;

			if (hitLabel) {
				target.greek = null;
				target.degree = null;
			} else {
				MathDrawingCore.elements.angles = el.angles.filter(a => a.id !== target.id);
			}
		} 
		// 2. Логика для ТОЧКИ (важно: else if теперь на своем месте)
		else if (target.x !== undefined && target.y !== undefined) {
			MathDrawingCore.elements.points = el.points.filter(p => p.id !== target.id);
			MathDrawingCore.elements.lines = el.lines.filter(l => l.p1id !== target.id && l.p2id !== target.id);
			MathDrawingCore.elements.angles = el.angles.filter(a => a.p1 !== target.id && a.p2 !== target.id && a.p3 !== target.id);
		}
		// 3. Логика для ЛИНИИ
		else if (target.p1id) {
			MathDrawingCore.elements.lines = el.lines.filter(l => l.id !== target.id);
		}

		MathDrawingCore.save();
		this.closeMenu();
	},
	
	/** Универсальный метод для установки подписи угла */
    setAngleLabel(type, value) {
        if (!this.menuTarget) return;
        
        if (type === 'greek') {
            // Если нажали на ту же кнопку, снимаем подпись, иначе ставим новую
            this.menuTarget.greek = (this.menuTarget.greek === value) ? null : value;
        } 
        else if (type === 'degree') {
            // Автоматически добавляем знак градуса, если введено число
            this.menuTarget.greek = value ? value + '°' : null;
        }
		
		else if (type === 'digit') {
            // Просто нумирация углов. Здесь greek - это просто строчный символ
            this.menuTarget.greek = (this.menuTarget.greek === value) ? null : value;
        }

        MathDrawingCore.save();
        this.closeMenu(); // Закрываем меню для подтверждения
    },
	
};