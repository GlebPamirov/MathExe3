// app.js — Глобальный контроллер приложения
const App = {
    session: {
        userName: '',
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        hintsUsed: 0,
        currentQIndex: 0,
        activeTopic: null,
        
        // Настройки баллов
        POINTS_CORRECT: 1,
        POINTS_HINT_PENALTY: 0.5,
		
		answersLog: [], // Сюда будем записывать результат каждого вопроса
    },

    init() {
        this.bindEvents();
        this.initMenu();
    },

    bindEvents() {
        // Логин
        document.getElementById('login-btn').addEventListener('click', () => this.handleLogin());
        
        // Каскадные списки
        document.getElementById('select-subject').addEventListener('change', (e) => this.updateGrades(e.target.value));
        document.getElementById('select-grade').addEventListener('change', (e) => this.updateTopics(e.target.value));
        
        // Старт
        document.getElementById('start-btn').addEventListener('click', () => this.startSession());
        
        // Навигация и подсказки
        document.getElementById('next-q-btn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('hint-trigger').addEventListener('click', () => this.useHint());
    },

    initMenu() {
        const subSelect = document.getElementById('select-subject');
        const subjects = [...new Set(window.AppRegistry.map(item => item.subject))];
        
        subSelect.innerHTML = '<option value="">-- Предмет --</option>';
        subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = s;
            subSelect.appendChild(opt);
        });
    },

    updateGrades(subject) {
        const gradeSelect = document.getElementById('select-grade');
        gradeSelect.disabled = !subject;
        gradeSelect.innerHTML = '<option value="">-- Класс --</option>';
        
        if (!subject) return;

        const grades = [...new Set(window.AppRegistry
            .filter(i => i.subject === subject)
            .map(i => i.grade))].sort((a, b) => a - b);

        grades.forEach(g => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = g;
            gradeSelect.appendChild(opt);
        });
    },

    updateTopics(grade) {
        const topicSelect = document.getElementById('select-topic');
        const subject = document.getElementById('select-subject').value;
        topicSelect.disabled = !grade;
        topicSelect.innerHTML = '<option value="">-- Тема --</option>';

        const topics = window.AppRegistry.filter(i => i.subject === subject && i.grade === grade);
        topics.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.topic_id;
            opt.textContent = t.topic_name;
            topicSelect.appendChild(opt);
        });
    },

    handleLogin() {
        const f = document.getElementById('user-first-name').value.trim();
        const l = document.getElementById('user-last-name').value.trim();
        if (!f || !l) return alert("Введите имя и фамилию");

        this.session.userName = `${l} ${f}`;
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('menu-section').classList.remove('hidden');
    },

    startSession() {
        const topicId = document.getElementById('select-topic').value;
        this.session.activeTopic = window.AppRegistry.find(t => t.topic_id === topicId);
        
        if (!this.session.activeTopic) return alert("Выберите тему");

        document.getElementById('menu-section').classList.add('hidden');
        document.getElementById('game-section').classList.remove('hidden');
        document.getElementById('player-display').textContent = this.session.userName;
		
		// ДУБЛИРУЕМ Открытие Графического редактора
		document.getElementById('open-editor-btn').addEventListener('click', () => {
			window.open('MathDrawing/MathDrawing.html', '_blank');
		});
        
        this.renderCurrentQuestion();
    },

    renderCurrentQuestion() {
        const q = this.session.activeTopic.questions[this.session.currentQIndex];
        const total = this.session.activeTopic.questions.length;

		const question = this.session.activeTopic.questions[this.session.currentQIndex];
    
		// Если в задаче указана фигура, рисуем её
		if (question.figure) {
			GraphModule.render('graph-container', question.figure);
		} else {
			document.getElementById('graph-container').innerHTML = ''; // Очистка, если фигуры нет
		}


        // Сброс UI перед новым вопросом
        document.getElementById('feedback-container').classList.add('hidden');
        document.getElementById('next-q-btn').style.display = 'none';
        document.getElementById('progress-bar').style.width = `${(this.session.currentQIndex / total) * 100}%`;
        document.getElementById('progress-text').textContent = `Вопрос ${this.session.currentQIndex + 1} из ${total}`;

        // Вызов модуля single_choice.js
        SingleChoiceModule.render(q, this.session.currentQIndex, total);
    },

    onAnswerSubmitted(isCorrect) {
		
		const hintUsedThisTurn = document.getElementById('hint-trigger').style.display === 'none';
		
		this.session.answersLog.push({
			isCorrect: isCorrect,
			usedHint: hintUsedThisTurn
		});
			
        if (isCorrect) {
            this.session.score += this.session.POINTS_CORRECT;
            this.session.correctCount++;
        } else {
            this.session.wrongCount++;
        }
    },

    useHint() {
        this.session.hintsUsed++;
        this.session.score -= this.session.POINTS_HINT_PENALTY;
        document.getElementById('hint-trigger').style.display = 'none';
        document.getElementById('hint-content').classList.remove('hidden');
    },

    nextQuestion() {
        this.session.currentQIndex++;
        if (this.session.currentQIndex < this.session.activeTopic.questions.length) {
            this.renderCurrentQuestion();
        } else {
            this.finish();
        }
    },

    finish() {
        const total = this.session.activeTopic.questions.length;
        const percent = Math.round((this.session.correctCount / total) * 100);
        
		// 1. Исправляем получение оценки (теперь это просто число/строка)
		const markInfo = ReportGenerator.getMark(percent);
		
        // Определение оценки
        //let mark = percent >= 91 ? "5" : percent >= 71 ? "4" : percent >= 51 ? "3" : "2";
        
        const reportData = {
            ...this.session,
            topicName: this.session.activeTopic.topic_name,
            grade: this.session.activeTopic.grade,
            subject: this.session.activeTopic.subject,
            mark: markInfo.mark // ваш метод расчета оценки
        };

        // Отправка в БД через модуль db_connector.js
        DBConnector.sendReport(reportData);

        // Финальный экран (заменяем содержимое карточки)
		ReportGenerator.render('main-container', reportData);
    }
	
	
	
};

// Открытие Графического редактора
document.getElementById('open-editor-btn').addEventListener('click', () => {
	window.open('MathDrawing/MathDrawing.html', '_blank');
});

// Запуск при загрузке
window.addEventListener('DOMContentLoaded', () => App.init());
// Проброс App в глобальное пространство для связи с модулями
window.App = App;