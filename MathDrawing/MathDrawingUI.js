//Управляет интерфейсом: переключением режимов, модальными окнами и контекстным меню.

/**
 * MathDrawingUI — Модуль интерфейса.
 */
const MathDrawingUI = {
    currentMode: null,
    menuTarget: null,
    greeks: ["α", "β", "γ", "δ", "φ"],

    /** Переключение режима (Угол, Ластик и т.д.) */
    toggleMode(mode) {
        this.currentMode = (this.currentMode === mode) ? null : mode;
        MathDrawingEvents.selectedForAngle = []; // Сброс выбора при смене режима
        
        document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        if (this.currentMode) {
            const btn = document.getElementById(mode + '-mode-btn');
            if (btn) btn.classList.add('active');
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
                <div class="menu-row">Имя: <input type="text" value="${obj.name}" class="menu-input" oninput="MathDrawingUI.menuTarget.name=this.value"></div>
                <div class="menu-row"><button class="btn-sm" onclick="MathDrawingUI.menuTarget.isHollow=!MathDrawingUI.menuTarget.isHollow;MathDrawingCore.save();">Выколоть</button></div>`;
        } else if (type === 'angle') {
            content.innerHTML = `
                <div class="menu-row">Буква: ${this.greeks.map(g => `<button class="btn-sm" onclick="MathDrawingUI.menuTarget.greek='${g}';MathDrawingCore.save();">${g}</button>`).join('')}</div>
                <div class="menu-row">Дуги: <button class="btn-sm" onclick="MathDrawingUI.menuTarget.arcCount=1;MathDrawingCore.save();">1</button><button class="btn-sm" onclick="MathDrawingUI.menuTarget.arcCount=2;MathDrawingCore.save();">2</button><button class="btn-sm" onclick="MathDrawingUI.menuTarget.arcCount=3;MathDrawingCore.save();">3</button></div>`;
        } else if (type === 'line') {
            content.innerHTML = `
                <div class="menu-row">Имя: <input type="text" value="${obj.name || ''}" class="menu-input" oninput="MathDrawingUI.menuTarget.name=this.value"></div>
                <div class="menu-row"><button class="btn-sm" onclick="MathDrawingUI.menuTarget.isDashed=!MathDrawingUI.menuTarget.isDashed;MathDrawingCore.save();">Пунктир</button><button class="btn-sm" onclick="MathDrawingUI.menuTarget.isBold=!MathDrawingUI.menuTarget.isBold;MathDrawingCore.save();">Жирная</button></div>
                <div class="menu-row">Засечки: <button class="btn-sm" onclick="MathDrawingUI.setTick('I')">I</button><button class="btn-sm" onclick="MathDrawingUI.setTick('II')">II</button><button class="btn-sm" onclick="MathDrawingUI.setTick('Z')">Z</button></div>`;
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
    deleteTarget() {
        const target = this.menuTarget;
        if (!target) return;

        const el = MathDrawingCore.elements;
        
        // 1. Если это точка — удаляем саму точку и все связанные с ней линии и углы
        el.points = el.points.filter(p => p.id !== target.id);
        el.lines = el.lines.filter(l => l.p1id !== target.id && l.p2id !== target.id);
        el.angles = el.angles.filter(a => a.p1 !== target.id && a.p2 !== target.id && a.p3 !== target.id);

        // 2. Если это линия (target имеет p1id)
        if (target.p1id) {
            el.lines = el.lines.filter(l => l.id !== target.id);
        }

        // 3. Если это угол (target имеет p1, p2, p3)
        if (target.p2) {
            el.angles = el.angles.filter(a => a.id !== target.id);
        }

        MathDrawingCore.save();
        this.closeMenu();
    },
};