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
    result = run_turing_machine(code, tape, max_steps_input.value, detailed_output, start_position);
    tape = result[0][4];  // 因为运行过程中使用的部分可能逐渐变长，为了用户正确地编辑纸带，把最终的纸带状态覆盖回 tape 变量
    start_position = result[0][1];
    refresh_history_table(history_table, result);
}

// Add event listeners

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
    refresh_history_table(history_table, result);
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
