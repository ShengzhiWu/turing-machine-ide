// ── Turing Machine core: parsing, running, tape utils ──────────────────────

// Symbol constants (used by parseProgramCode and run_turing_machine)

const NOT_VALID = Symbol('not valid');
const N = Symbol('N');
const OTHER = Symbol('other');


function parseProgramCode(code) { // 解析新格式代码
    const result = {};
    code.split("\n").forEach((rawLine, lineIndex) => {  // 遍历行
        // 去掉注释
        const trimmed = rawLine.split("//")[0].trim();

        if (trimmed.length == 0)
            return;
        
        const parts = trimmed.split(",").map(part => part.trim());

        const state = parts[0];
        let input = parts[1];
        if (input == 'other')
            input = OTHER;
        else {
            if (input == undefined || !input.startsWith('"') || !input.endsWith('"'))
                input = NOT_VALID;  // 无效值
            else
                input = input.slice(1, -1);  // 去掉引号
        }
        let output = parts[2];
        if (output == 'N')
            output = N;
        else {
            if (output == undefined || !output.startsWith('"') || !output.endsWith('"'))
                output = NOT_VALID;  // 无效值
            else
                output = output.slice(1, -1);  // 去掉引号
        }
        let direction = parts[3];
        if (direction != 'L' && direction != 'R' && direction != 'N')
            direction = NOT_VALID;
        let nextState = parts[4];
        if (nextState == undefined)
            nextState = state;

        if (result[state] == undefined)
            result[state] = {};
        // 存规则值，同时附带行号和去注释后的行内容，供图跳转使用
        result[state][input] = [output, direction, nextState, { lineIndex, lineContent: trimmed }];
    });

    return result;
}

function _splitTopLevel(str) {  // 根据逗号分割（无视括号中的逗号）
    const parts = [];
    let depth = 0, cur = '';
    for (const c of str) {
        if      (c === '(')           { depth++; cur += c; }
        else if (c === ')')           { depth--; cur += c; }
        else if (c === ',' && !depth) { parts.push(cur.trim()); cur = ''; }
        else                          { cur += c; }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
}

function parseStyleCode(code) {  // 解析风格代码
    // 创建一个临时元素
    const div = document.createElement('div');
    const result = {};
    code.split("\n").forEach(line => {  // 遍历行
        // 去掉注释
        line = line.split("//")[0].trim();

        if (line.length == 0)
            return;
        
        // 根据逗号分割（无视括号中的逗号）
        const parts = _splitTopLevel(line);

        result[parts[0]] = {};

        div.style.color = '';
        div.style.color = parts[1];
        if (div.style.color !== '')
            result[parts[0]]['foreground'] = parts[1];

        div.style.color = '';
        div.style.color = parts[2];
        if (div.style.color !== '')
            result[parts[0]]['background'] = parts[2];
    });

    return result;
}

function run_turing_machine(code, tape, max_steps, detailed_output, start_position) {  // 运行图灵机
    var step = 0;
    var position = start_position || 0;
    var state = "start";
    const history = [[step, position, undefined, state, [...tape]]];  // 步数, 位置, 上一个状态, 当前状态, 纸带

    tape = [...tape];  // Clone the tape, to avoid changing the original tape.
    while(state != "end" && state != "error") {
        var need_record = detailed_output;
        step ++;
        if(step > max_steps)
            break;

        const state_0 = state;
        var actionDict = code[state];
        if(actionDict == undefined) {
            state = "error";
            break;
        }

        if (position >= tape.length)
            tape.push('');  // Infinite tape to the right
        var action = actionDict[tape[position]];
        if (action == undefined)
            action = actionDict[OTHER];
        if (action == undefined) {
            state = "error";
            break;
        }
        state = action[2];
        if (action[0] == NOT_VALID) {
            state = "error";
            break;
        }
        if (action[0] != N) {
            tape[position] = action[0];
            need_record = true;
        }

        if(need_record) {
            history.push([step, position, state_0, state, [...tape]]);
        }

        if (action[1] == NOT_VALID) {
            state = "error";
            break;
        }
        if(action[1]=="R")
            position ++;
        else if (action[1]=="L") {
            position --;
            if (position < 0) {  // 向左移出了纸带，在左边加一格
                position++;
                tape.unshift('');
                history.forEach(record => {
                    record[1]++;
                    record[4].unshift('');  // 在历史记录的每个纸带前面加一个空格
                });
            }
        }
    }

    // 将纸带补到每次记录一样长
    const tapeLength = history[history.length - 1][4].length;
    history.forEach(record => {
        while (record[4].length < tapeLength)
            record[4].push('');
    });

    return history;
}

// 保持纸带右侧有适当数量的空格，方便编辑
function normalizeTape(t) {
    while (t.length < 3 || t[t.length-1] !== '' || t[t.length-2] !== '' || t[t.length-3] !== '')
        t.push('');
    while (t[t.length-1] === '' && t[t.length-2] === '' && t[t.length-3] === '' && t[t.length-4] === '')
        t.pop();
    return t;
}
