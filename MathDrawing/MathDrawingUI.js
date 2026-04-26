//Управляет интерфейсом: переключением режимов, модальными окнами и контекстным меню.

/**
 * MathDrawingUI — Модуль интерфейса.
 */
 
 // Ссылки на БАЗЫ гугл-таблицу 
 // База геометрических чертежей
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwwhUQfmQ-ab9Y7K5G4BzCwjdU02CA_3Lw8T29QU7Wlh-9xkuya6_gsF5hXiVPLDcyKng/exec";

 
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
	
	
	saveResult() {
        const author = "Ваня Пупкин"; // По умолчанию
        const comment = document.getElementById('user-comment').value || "Без комментария";
        
        // Сериализуем текущие элементы в компактную строку JSON
        // Это и есть наш "код", который можно хранить в одной ячейке таблицы
        const canvasCode = JSON.stringify(MathDrawingCore.elements);

        const result = {
            author: author,
            text: comment,
            code: canvasCode,
            timestamp: new Date().toLocaleString()
        };

        // Вывод для отладки в нижней части экрана
        this.displayDebug(result);
        
        console.log("Данные готовы для Google Таблиц:", result);
        return result;
    },

    displayDebug(data) {
        const container = document.getElementById('debug-content');
        if (container) {
            container.innerHTML = `
                <br><b>Автор:</b> ${data.author}
                <br><b>Текст:</b> ${data.text}
                <br><b>JSON Code:</b> ${data.code}
                <br><b>Время:</b> ${data.timestamp}
            `;
        }
    },
	
	importResult() {
        const codeInput = document.getElementById('import-code').value;
        if (!codeInput) {
            alert("Пожалуйста, вставьте код!");
            return;
        }

        try {
            // Превращаем строку обратно в объект
            const importedData = JSON.parse(codeInput);

            // Простая проверка структуры данных (валидация)
            if (importedData.points && importedData.lines) {
                
                // Передаем данные в ядро
                MathDrawingCore.elements = importedData;
                
                // Сохраняем в историю, чтобы можно было сделать Undo
                MathDrawingCore.save();
                
                // Очищаем поле ввода
                document.getElementById('import-code').value = '';
                
                alert("Чертеж успешно загружен!");
            } else {
                throw new Error("Неверный формат данных");
            }
        } catch (e) {
            console.error("Ошибка импорта:", e);
            alert("Ошибка: Некорректный код чертежа.");
        }
    },
	
	// ФУНКЦИЯ СОХРАНЕНИЯ В ТАБЛИЦУ
    saveToSheets() {
        const data = {
            id: Math.random().toString(36).substr(2, 9),
            author: document.getElementById('user-last-name')?.value|| "Аноним",
            text: document.getElementById('user-comment')?.value || "Безымянный",
            code: JSON.stringify(MathDrawingCore.elements)
        };

        // 1. Создаем/находим невидимый iframe
        let iframe = document.getElementById('hidden_iframe');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'hidden_iframe';
            iframe.name = 'hidden_iframe';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
        }

        // 2. Создаем временную форму
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = SCRIPT_URL;
        form.target = 'hidden_iframe'; // Отправка без перезагрузки страницы
        
        const input = document.createElement('input');
        input.name = 'payload';
        input.value = JSON.stringify(data);
        
        form.appendChild(input);
        document.body.appendChild(form);
        
        form.submit(); // Поехали!
        
        alert("Данные отправлены в таблицу!");
        document.body.removeChild(form);
        
        // Обновляем список через 3 секунды, чтобы Google успел записать
        setTimeout(() => this.loadListFromSheets(), 3000);
    },

    // 1. Загрузка только списка имен при старте
    loadListFromSheets() {
        const oldScript = document.getElementById('jsonp-loader');
        if (oldScript) oldScript.remove();

        window.handleSheetList = (list) => {
            const select = document.getElementById('sheet-load-select');
            if (!select) return;
            select.innerHTML = '<option value="">-- Выберите чертеж --</option>';
            
            // Новые записи будут сверху
            list.reverse().forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.index; // Теперь здесь индекс, а не тяжелый код
                opt.textContent = `${item.author}: ${item.text}`;
                select.appendChild(opt);
            });
        };

        const script = document.createElement('script');
        script.id = 'jsonp-loader';
        script.src = `${SCRIPT_URL}?callback=handleSheetList&t=${Date.now()}`;
        document.body.appendChild(script);
    },

    // 2. Загрузка конкретного чертежа при выборе из списка
    loadSingleDrawing(index) {
        if (index === "") return;

        const oldScript = document.getElementById('jsonp-single-loader');
        if (oldScript) oldScript.remove();

        window.handleSingleDrawing = (data) => {
            if (data && data.code) {
                try {
                    MathDrawingCore.elements = JSON.parse(data.code);
                    MathDrawingCore.save();
                    // Рендер обновится автоматически благодаря вызову save()
                } catch (e) {
                    alert("Ошибка при разборе данных чертежа");
                }
            }
        };

        const script = document.createElement('script');
        script.id = 'jsonp-single-loader';
        script.src = `${SCRIPT_URL}?callback=handleSingleDrawing&index=${index}&t=${Date.now()}`;
        document.body.appendChild(script);
    },
    
    importFromValue(code) {
        if (!code) return;
        try {
            MathDrawingCore.elements = JSON.parse(code);
            MathDrawingCore.save();
            // Рендер автоматически подхватит изменения при save()
        } catch (e) {
            alert("Ошибка при чтении кода");
        }
    },
	
};