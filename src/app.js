// ── App: history table, run_program, event listeners ───────────────────────

function generate_history_table_row(record) {
    var s = "";

    s += '<td style="border:none; padding-right:1em; text-align:right">'+record[0]+'</td>';

    position = 0;
    record[4].forEach(e => {
        var style = "border:1px solid black;";

        style_list = result_table_style[e];
        if(style_list) {
            if(style_list['background'])
                style += "background-color: " + style_list['background'] + "; ";
            if(style_list['foreground'])
                style += "color: " + style_list['foreground'] + "; ";
        }

        if(position==record[1])
            style += "border-top: 4px solid black; ";

        s += "<td" + (style=="" ? "": ' style="' + style + '"') + ">" + e + "</td>";

        position ++;
    });
    return "<tr>" + s + "</tr>";
}

// 用户编辑纸带初值完成回调函数
function finishEditingTapeCallback(data) {
    if (data.value !== tape[data.cellIndex]) {  // 有变化
        tape[data.cellIndex] = data.value;  // 更新纸带数据

        // 如果纸带最后三格有内容，往后延续。也移除左侧的多余空格（但会保持机头和纸带的相对位置不变）。这是为了让用户总可以往后编辑
        tape = normalizeTape(tape);
        console.log(start_position, tape);

        run_program();  // 重新运行程序
    }
}

function refresh_history_table(history_table, history) {
    if (!result_table_style)
        return;

    // 极简模式下跳过表格渲染
    const minimalCb = document.getElementById('minimal-mode-checkbox');
    if (minimalCb && minimalCb.checked)
        return;

    var s = "";

    history.forEach(e=>{
        s += generate_history_table_row(e);
    });

    history_table.innerHTML = s;
    
    // 让第一行所有单元格可编辑
    const firstRowCells = history_table.rows[0].cells;  // 获取表格第一行的所有单元格
    for (let i = 0; i < firstRowCells.length; i++) {
        if (i == 0)
            continue;  // 跳过第一列（步数）
        const cell = firstRowCells[i];
        
        // 设置单元格为可编辑
        cell.contentEditable = true;
        
        // 添加失去焦点事件监听
        cell.addEventListener('blur', function(event) {
            finishEditingTapeCallback({
                cellIndex: i - 1,
                value: cell.textContent
            });
        });
        
        // 添加键盘事件监听（按下回车）
        cell.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();  // 防止回车产生新行
                cell.blur();  // 主动失去焦点。这会触发上面的blur事件
            }
        });
        
        // 保存原始内容，用于对比变化
        cell.setAttribute('data-original-content', cell.textContent);
    }

    // 鼠标悬停显示状态转移
    const rows = history_table.querySelectorAll('tr');
    rows.forEach((row, i) => {
        const record = history[i];
        row.title = `state: ${(record[2] != undefined ? record[2] + " → " : "")}${(record[3] != undefined ? record[3] : "")}`;
    });
}

refresh_history_table(history_table, result);

function refresh_graph_embedding() {  // 根据代码重建有向图（这个函数不用每帧执行，只在图架构有变化时才需要执行）
    // TODO: real-time compile
    code = parseProgramCode(code_editor_value);  // 解析代码文本
    graph = construct_directed_graph_with_code(code);
    build_graph_dom(graph);  // 图结构变了，重建 DOM
}

function run_program() {
    code = parseProgramCode(code_editor_value);  // 解析代码文本
    tape = normalizeTape(tape);  // 确保纸带右侧有适当数量的空格，方便编辑。也去除左侧多余的空格（但会保持机头和纸带的相对位置不变）
    result = run_turing_machine(code, tape, max_steps_input.value, output_filter, start_position);
    tape = result[0][4];  // 因为运行过程中使用的部分可能逐渐变长，为了用户正确地编辑纸带，把最终的纸带状态覆盖回 tape 变量
    start_position = result[0][1];
    refresh_history_table(history_table, result);
    // 极简模式下同步更新位图
    const minimalCb = document.getElementById('minimal-mode-checkbox');
    if (minimalCb && minimalCb.checked) renderBitmap(result);
}

// ── 事件监听 ─────────────────────────────────────────────────────────────────

// 下拉列表：结果过滤器
document.getElementById('result-filter-select').addEventListener('change', function() {
    output_filter = this.value;
    run_program();
});

// 复选框：极简模式
document.getElementById('minimal-mode-checkbox').addEventListener('change', function() {
    refreshDisplayMode();
});

// 横向缩放输入：实时重绘位图
document.getElementById('pixel-scale-x-input').addEventListener('input', function() {
    const minimalCb = document.getElementById('minimal-mode-checkbox');
    if (minimalCb && minimalCb.checked) renderBitmap(result);
});

// 纵向缩放输入：实时重绘位图
document.getElementById('pixel-scale-y-input').addEventListener('input', function() {
    const minimalCb = document.getElementById('minimal-mode-checkbox');
    if (minimalCb && minimalCb.checked) renderBitmap(result);
});

code_editor.addEventListener('tm-refresh-graph', e => {  // 按 F4 刷新图
    refresh_graph_embedding();
});

code_editor.addEventListener('tm-run', e => {  // 按 F5 运行程序
    run_program();
});

code_editor.addEventListener('tm-change', e => {  // 代码编辑器内容变化监听器
    const {
        value,  // 新的完整代码
        errorCount,  // 错误计数
        changedLines  // 变化的行的列表。当用户键入换行符时，这一行以及下面所有的行都会被判定为发生了变化
    } = e.detail;
    code_editor_value = value;  // 更新代码文本
    codeModified = true;  // 标记用户已修改代码
    
    // 遍历变化的行，更新高亮的节点
    changedLines.forEach(line => {
        if (line['line'] == editing_line) {  // 如果变化的行包含光标所在行
            let content = line['content'];
            content = content.split("//")[0].trim();  // 去掉注释
            if (content.length > 0) {
                const state_name = content.split(",")[0].trim();  // 获取状态名称
                highlighted_vertex_name = state_name;  // 更新高亮的节点名称
            }
            else
                highlighted_vertex_name = undefined;  // 没有状态名称，取消高亮
        }
    });
});

code_editor.addEventListener('tm-cursor-line-change', e => {  // 代码编辑器光标移动到新行监听器
    let { line, content } = e.detail;  // 行号（第一行为0）以及该行的内容
    editing_line = line;

    content = content.split("//")[0].trim();  // 去掉注释

    // 更新高亮的节点
    if (content.length > 0) {
        const state_name = content.split(",")[0].trim();  // 获取状态名称
        highlighted_vertex_name = state_name;
    }
    else {
        highlighted_vertex_name = undefined;
    }
});

// code_editor.addEventListener('tm-errors', e => {  // 代码编辑器语法错误监听器
//     const { errorCount } = e.detail;
//     addLog(`[tm-errors] 错误数量变为 ${errorCount}`);
// });

style_editor.addEventListener('cm-change', e => {  // 风格编辑器内容变化监听器
    const result_table_style_text = style_editor.value;
    result_table_style = parseStyleCode(result_table_style_text);
    const minimalCb = document.getElementById('minimal-mode-checkbox');
    if (minimalCb && minimalCb.checked) {
        renderBitmap(result);
    } else {
        refresh_history_table(history_table, result);
    }
    styleModified = true;  // 标记用户已修改样式代码
});

// style_textarea.addEventListener('cm-errors', e => {  // 风格编辑器语法错误监听器
//     console.log('errors:', e.detail.errors);
// });

graph_view.addEventListener("mousedown", e => {  // 鼠标中键拖动图
    if(e.button == 1) {
        var last_position = [e.offsetX, e.offsetY];
        graph_view.style.cursor = "grabbing";
        var on_mouse_move = e => {
            const new_position = [e.offsetX, e.offsetY];
            frame.x += new_position[0] - last_position[0];
            frame.y += new_position[1] - last_position[1];
            last_position = new_position;
        };
        var on_mouse_up = e => {
            window.removeEventListener("mousemove", on_mouse_move);  // Remove listeners after dragging is done
            window.removeEventListener("mouseup", on_mouse_up);
            graph_view.style.cursor = "default";
        };
        window.addEventListener("mousemove", on_mouse_move);
        window.addEventListener("mouseup", on_mouse_up);
    }
});

graph_view.addEventListener("wheel", e => {  // 滚轮缩放图
    const zoom_factor = 1.1;
    if(e.deltaY < 0) {  // Zoom in
        frame.factor *= zoom_factor;
        frame.x = e.offsetX + zoom_factor * (frame.x - e.offsetX);
        frame.y = e.offsetY + zoom_factor * (frame.y - e.offsetY);
    }
    else {  // Zoom out
        frame.factor /= zoom_factor;
        frame.x = e.offsetX + (1 / zoom_factor) * (frame.x - e.offsetX);
        frame.y = e.offsetY + (1 / zoom_factor) * (frame.y - e.offsetY);
    }
});

// ── 极简模式：切换显示 ───────────────────────────────────────────────────────

/**
 * 切换普通表格 / 位图显示模式。
 * 注意：显示时必须明确设置 display='flex'，不能用 display=''，
 * 因为 CSS 里没有为这些元素声明 display 值（避免与 inline style 冲突）。
 */
function refreshDisplayMode() {
    const minimal = document.getElementById('minimal-mode-checkbox').checked;

    document.getElementById('table-container').style.display     = minimal ? 'none' : 'flex';
    document.getElementById('bitmap-container').style.display    = minimal ? 'flex' : 'none';
    document.getElementById('pixel-scale-wrapper').style.display = minimal ? 'flex' : 'none';

    if (minimal) {
        renderBitmap(result);
    } else {
        refresh_history_table(history_table, result);
    }
}

// ── 极简模式：位图渲染 ───────────────────────────────────────────────────────

/**
 * 根据 history（运行历史数组）渲染位图到 #bitmap-canvas。
 * 每行对应一个历史步骤，每列对应纸带上的一格。
 * 颜色取自 result_table_style[symbol].background，无样式则用白色。
 * scaleX / scaleY 分别控制每个逻辑像素在水平/垂直方向对应的屏幕像素数。
 */
function renderBitmap(history) {
    if (!result_table_style || !history || history.length === 0) return;

    const canvas = document.getElementById('bitmap-canvas');
    if (!canvas) return;

    const scaleX = Math.max(1, parseInt(document.getElementById('pixel-scale-x-input').value) || 1);
    const scaleY = Math.max(1, parseInt(document.getElementById('pixel-scale-y-input').value) || 1);

    // 计算逻辑尺寸
    const rows = history.length;
    const cols = Math.max(...history.map(record => record[4].length));

    canvas.width  = cols * scaleX;
    canvas.height = rows * scaleY;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let r = 0; r < rows; r++) {
        const tape_row = history[r][4];
        for (let c = 0; c < cols; c++) {
            const symbol = (c < tape_row.length) ? tape_row[c] : '';
            const styleEntry = result_table_style[symbol];
            const color = (styleEntry && styleEntry['background']) ? styleEntry['background'] : '#ffffff';
            ctx.fillStyle = color;
            ctx.fillRect(c * scaleX, r * scaleY, scaleX, scaleY);
        }
    }
}

// ── 保存功能 ─────────────────────────────────────────────────────────────────

/**
 * 保存表格数据为 CSV。
 * 格式：每行为"步数,纸带格0,纸带格1,..."
 */
function saveTableData() {
    if (!result || result.length === 0) return;

    const lines = result.map(record => {
        return [record[0], ...record[4]].join(',');
    });
    const csv = lines.join('\n');

    _downloadBlob(new Blob([csv], { type: 'text/csv' }), 'table.csv');
}

/**
 * 极简模式下保存位图 PNG；普通模式下将表格绘制到离屏 canvas 后保存为 PNG。
 */
function saveAsImage() {
    const minimal = document.getElementById('minimal-mode-checkbox').checked;

    if (minimal) {
        // 直接导出位图 canvas
        const canvas = document.getElementById('bitmap-canvas');
        if (!canvas || canvas.width === 0) return;
        canvas.toBlob(blob => _downloadBlob(blob, 'bitmap.png'));
    } else {
        // 根据 result 和 result_table_style 在离屏 canvas 上重绘表格后导出
        if (!result || result.length === 0 || !result_table_style) return;

        const rows = result.length;
        const cols = Math.max(...result.map(record => record[4].length)) + 1;  // +1 为步数列

        const cellW = 20, cellH = 16;
        const offCanvas = document.createElement('canvas');
        offCanvas.width  = cols * cellW;
        offCanvas.height = rows * cellH;
        const ctx = offCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.font = `${Math.floor(cellH * 0.65)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        for (let r = 0; r < rows; r++) {
            const record = result[r];

            // 步数列（浅灰背景）
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, r * cellH, cellW, cellH);
            ctx.fillStyle = '#000000';
            ctx.fillText(String(record[0]), cellW / 2, r * cellH + cellH / 2);

            // 纸带格
            const tape_row = record[4];
            for (let c = 0; c < cols - 1; c++) {
                const symbol = (c < tape_row.length) ? tape_row[c] : '';
                const styleEntry = result_table_style[symbol];
                const bg = (styleEntry && styleEntry['background']) ? styleEntry['background'] : '#ffffff';
                const fg = (styleEntry && styleEntry['foreground']) ? styleEntry['foreground'] : '#000000';

                const x = (c + 1) * cellW;
                const y = r * cellH;

                ctx.fillStyle = bg;
                ctx.fillRect(x, y, cellW, cellH);

                // 机头位置：加粗上边框
                if (c === record[1]) {
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(x, y + 1.5);
                    ctx.lineTo(x + cellW, y + 1.5);
                    ctx.stroke();
                }

                // 单元格细边框
                ctx.strokeStyle = '#bbbbbb';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x + 0.25, y + 0.25, cellW - 0.5, cellH - 0.5);

                ctx.fillStyle = fg;
                ctx.fillText(symbol, x + cellW / 2, y + cellH / 2);
            }
        }

        offCanvas.toBlob(blob => _downloadBlob(blob, 'table.png'));
    }
}

/**
 * 通用下载辅助函数：优先走 Electron IPC，否则用浏览器 <a> 下载。
 */
function _downloadBlob(blob, defaultName) {
    // Electron IPC 路径
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.saveFile) {
        const reader = new FileReader();
        reader.onload = () => {
            window.electronAPI.saveFile({
                defaultName,
                contentBase64: reader.result.split(',')[1],
                binary: true
            });
        };
        reader.readAsDataURL(blob);
        return;
    }
    // 浏览器回退
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
}
