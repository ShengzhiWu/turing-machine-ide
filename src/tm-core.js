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

// history_filter 取值：
//   "all"              — 记录每一步
//   "only-changes"     — 仅记录纸带有变化的步（默认）
//   "every-100"        — 每 10² 步记录一次
//   "every-1000"       — 每 10³ 步记录一次
//   "every-10000"      — 每 10⁴ 步记录一次
//   "every-100000"     — 每 10⁵ 步记录一次
//   "every-1000000"    — 每 10⁶ 步记录一次
//   "every-10000000"   — 每 10⁷ 步记录一次
//   "every-100000000"  — 每 10⁸ 步记录一次
//   "every-1000000000" — 每 10⁹ 步记录一次
//   "head-tail"        — 仅记录开头和结尾
//
// tail_steps: 末尾保留步数。无论过滤器如何，最后 tail_steps 步始终保留在历史中。
function run_turing_machine(
    code,  // 代码
    tape,  // 纸带
    start_position,  // 起始位置
    start_state,  // 起始状态
    max_steps,  // 最大步数
    history_filter,  // 结果过滤器，取值："all", "only-changes", "every-100", "every-1000", "every-10000", "every-100000", "every-1000000", "every-10000000", "every-100000000", "every-1000000000", "head-tail"
    tail_steps  // 末尾保留步数
) {  // 运行图灵机
    let t0 = performance.now();
    var step = 0;
    var position = start_position || 0;
    var state = start_state;
    let history = [[step, position, undefined, state, [...tape]]];  // 步数, 位置, 上一个状态, 当前状态, 纸带

    while (tape[start_position] === undefined)  // 确保起始位置有格子
        tape.push('');  // 在末尾加一个空格

    tape = [...tape];  // Clone the tape, to avoid changing the original tape.

    // 预计算过滤器参数，避免在热循环中重复判断字符串
    const filterAll         = history_filter === "all";
    const filterOnlyChanges = history_filter === "only-changes" || !history_filter;
    const filterHeadTail    = history_filter === "head-tail";
    if (filterAll)
        tail_steps = 0;  // 将 tail_steps 设成 0 有助于提升性能
    if (filterHeadTail && tail_steps == 1)
        tail_steps = 0;  // 将 tail_steps 设成 0 有助于提升性能
    // 周期过滤器：提取步长，0 表示非周期过滤器
    let filterInterval = 0;
    if (!filterAll && !filterOnlyChanges && !filterHeadTail) {
        const m = (history_filter || '').match(/^every-(\d+)$/);
        if (m) filterInterval = parseInt(m[1]);
    }

    // 用于实现末尾步数保留的快照环形缓冲区
    // 第二遍扫描至多跑 tail_steps + SNAPSHOT_INTERVAL 步
    const SNAPSHOT_INTERVAL = 1000;  // 每这么多步存一次快照
    const SNAP_BUF = tail_steps > 0 ? (Math.ceil(tail_steps / SNAPSHOT_INTERVAL) + 1) : 0;  // 缓冲区大小
    // 每个快照：[step, position, state, tape_clone]
    const snapRing = SNAP_BUF > 0 ? new Array(SNAP_BUF) : null;
    let snapHead  = 0;
    let snapCount = 0;
    let sameStateTapeExtendStreak = 0;  // 连续满足“延长纸带且状态不变”的步数，用于自动停机判断

    // 第 0 步作为初始快照，确保总步数 < SNAPSHOT_INTERVAL 时也有可用起跑点
    if (snapRing) {
        snapRing[snapHead] = [0, position, state, [...tape]];
        snapHead = (snapHead + 1) % SNAP_BUF;
        snapCount++;
    }

    while(state != "end" && state != "error") {  // 主循环
        step ++;
        if(step > max_steps)
            break;

        const state_0 = state;
        let tapeExtended = false;
        var actionDict = code[state];
        if(actionDict == undefined) {
            state = "error";
            break;
        }

        if (position >= tape.length) {
            tape.push('');  // Infinite tape to the right
            tapeExtended = true;
        }
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

        // 判断纸带是否有变化（供 only-changes 和 all 模式使用）
        var tapeChanged = false;
        if (action[0] != N && action[0] != tape[position]) {
            tape[position] = action[0];
            tapeChanged = true;
        }

        // 根据过滤器决定是否记录本步
        var need_record;
        if (filterAll) {
            need_record = true;
        } else if (filterOnlyChanges) {
            need_record = tapeChanged;
        } else if (filterInterval > 0) {
            need_record = (step % filterInterval === 0);
        } else {
            need_record = false;
        }

        if (need_record) {
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
                tapeExtended = true;
                history.forEach(record => {
                    record[1]++;
                    record[4].unshift('');  // 在历史记录的每个纸带前面加一个空格
                });
                // 快照缓冲区里的记录也要同步修正
                if (snapRing) {
                    for (let i = 0; i < snapCount; i++) {
                        const snap = snapRing[(snapHead - snapCount + i + SNAP_BUF) % SNAP_BUF];
                        snap[1]++;
                        snap[3].unshift('');
                    }
                }
            }
        }

        // 连续两步都延长纸带且状态不变的情况下自动停机
        if (tapeExtended && state === state_0)
            sameStateTapeExtendStreak++;
        else
            sameStateTapeExtendStreak = 0;
        if (sameStateTapeExtendStreak >= 2)
            break;

        // 每隔 SNAPSHOT_INTERVAL 步存一次快照
        if (snapRing && step % SNAPSHOT_INTERVAL === 0) {
            snapRing[snapHead] = [step, position, state, [...tape]];
            snapHead  = (snapHead + 1) % SNAP_BUF;
            if (snapCount < SNAP_BUF) snapCount++;
        }
    }

    console.log(performance.now() - t0, "ms");
    t0 = performance.now();

    // head-tail 模式下补充最终状态
    if (filterHeadTail && step > 0) {
        history.push([step, position, history[history.length - 1][3], state, [...tape]]);
    }

    // 末尾保留：从最近快照递归重跑，用 subHistory 的尾部替换原 history 的尾部
    if (snapRing) {
        const finalStep = step;
        const targetFrom = finalStep - tail_steps;

        let bestSnap = null;
        for (let i = 0; i < snapCount; i++) {
            const snap = snapRing[(snapHead - snapCount + i + SNAP_BUF) % SNAP_BUF];
            if (snap[0] <= targetFrom) {
                if (bestSnap === null || snap[0] > bestSnap[0]) bestSnap = snap;
            }
        }
        if (bestSnap === null)
            bestSnap = [0, history[0][1], history[0][3], [...history[0][4]]];

        const subHistory = run_turing_machine(  // 从快照开始再把最后的若干步跑一遍
            code,
            [...bestSnap[3]],
            bestSnap[1],
            bestSnap[2],
            finalStep - bestSnap[0],
            "all",
            0
        );
        const snap0 = bestSnap[0];
        for (let i = 0; i < subHistory.length; i++)  // 步号偏移
            subHistory[i][0] += snap0;

        // 合并历史记录
        const head = history.filter(r => r[0] <= targetFrom);
        const tail = subHistory.filter(r => r[0] > targetFrom);
        history = [...head, ...tail];
    }

    // 将纸带补到每次记录一样长
    const tapeLength = history[history.length - 1][4].length;
    history.forEach(record => {
        while (record[4].length < tapeLength)
            record[4].push('');
    });
    
    console.log(performance.now() - t0, "ms");

    return history;
}

// 保持纸带右侧有适当数量的空格，方便编辑。这个函数在机头初始位置左侧有很多空格的情况下也会修改机头初始位置
function normalizeTape(t) {
    while (start_position > 0 && t[0] === '') {
        t.shift();  // 删除第一个元素
        start_position--;
    }
    while (t.length < 3 || t[t.length-1] !== '' || t[t.length-2] !== '' || t[t.length-3] !== '')
        t.push('');
    while (t[t.length-1] === '' && t[t.length-2] === '' && t[t.length-3] === '' && t[t.length-4] === '')
        t.pop();
    return t;
}
