//Этот модуль отвечает за состояние: хранение данных, историю действий (Undo/Redo) и управление жизненным циклом элементов./**

const MathDrawingCore = {
    // Основные массивы данных чертежа
    elements: { 
        points: [], 
        lines: [], 
        angles: [], 
		circles: [],
    },
    
    // Система истории для Undo/Redo
    history: [],
    hStep: -1,

    /** Инициализация начального состояния */
    init() {
        this.save();
    },

    /** Сохранение текущего снимка элементов в историю */
    save() {
        // Если мы сделали Undo и начали рисовать заново, отсекаем "забытое" будущее
        if (this.hStep < this.history.length - 1) {
            this.history = this.history.slice(0, this.hStep + 1);
        }
        this.history.push(JSON.stringify(this.elements));
        this.hStep++;
        
        // Ограничение глубины истории для оптимизации памяти
        if (this.history.length > 50) {
            this.history.shift();
            this.hStep--;
        }
    },

    /** Отмена последнего действия */
    undo() {
        if (this.hStep > 0) {
            this.hStep--;
            this.elements = JSON.parse(this.history[this.hStep]);
            MathDrawingUI.closeMenu();
        }
    },

    /** Повтор отмененного действия */
    redo() {
        if (this.hStep < this.history.length - 1) {
            this.hStep++;
            this.elements = JSON.parse(this.history[this.hStep]);
            MathDrawingUI.closeMenu();
        }
    },

    /** Полная очистка холста */
    /** Полная очистка холста и данных */
    clearAll() {
        if (confirm("Вы уверены, что хотите полностью очистить чертеж?")) {
            // МЫ НЕ УДАЛЯЕМ ОБЪЕКТ, А ОБНУЛЯЕМ ЕГО СВОЙСТВА
            this.elements = {
                points: [],
                lines: [],
                angles: [],
                circles: [] // Обязательно добавляем сюда!
            };
            
            // Сбрасываем историю, чтобы нельзя было сделать Undo к ошибке
            this.history = [];
            this.hStep = -1;
            
            // Сохраняем чистое состояние как начальную точку
            this.save();
            
            // Если у вас есть вызов отрисовки или закрытия меню:
            if (typeof MathDrawingUI !== 'undefined') MathDrawingUI.closeMenu();
            
            console.log("Чертеж очищен, структура данных восстановлена.");
        }
    },
};

