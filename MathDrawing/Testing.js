drawPoint(ctx, p, selectedForAngle = []) {
        ctx.beginPath();
        // Рисуем "выколотую" точку (кольцо) или обычную
        if (p.isHollow) {
            ctx.arc(p.x, p.y, this.POINT_RADIUS, 0, Math.PI * 2);
            ctx.strokeStyle = selectedForAngle.includes(p.id) ? '#ff7675' : '#0984e3';
            ctx.lineWidth = 2;
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.arc(p.x, p.y, this.POINT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = selectedForAngle.includes(p.id) ? '#ff7675' : '#0984e3';
            ctx.fill();
        }

        // Отрисовка имени (если есть)
        if (p.name && !p.hideLabel) {
            ctx.fillStyle = '#2d3436';
            ctx.font = 'bold 14px Arial';
            const off = p.labelOff || { dx: 10, dy: -10 };
            ctx.fillText(p.name, p.x + off.dx, p.y + off.dy);
        }
    },