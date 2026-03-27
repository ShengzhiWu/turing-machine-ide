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
//   用环形缓冲区实现，主循环里开销为 O(1)，对大步数运行没有性能影响。
function run_turing_machine(code, tape, max_steps, history_filter, start_position, tail_steps) {  // 运行图灵机
    let t0 = performance.now();
    var step = 0;
    var position = start_position || 0;
    var state = "start";
    const history = [[step, position, undefined, state, [...tape]]];  // 步数, 位置, 上一个状态, 当前状态, 纸带

    while (tape[start_position] === undefined)  // 确保起始位置有格子
        tape.push('');  // 在末尾加一个空格

    tape = [...tape];  // Clone the tape, to avoid changing the original tape.

    // 预计算过滤器参数，避免在热循环中重复判断字符串
    const filterAll         = history_filter === "all";
    const filterOnlyChanges = history_filter === "only-changes" || !history_filter;
    const filterHeadTail    = history_filter === "head-tail";
    if (filterHeadTail && tail_steps == 1)
        tail_steps = 0;  // 将 tail_steps 设成0有助于提升性能
    // 周期过滤器：提取步长，0 表示非周期过滤器
    let filterInterval = 0;
    if (!filterAll && !filterOnlyChanges && !filterHeadTail) {
        const m = (history_filter || '').match(/^every-(\d+)$/);
        if (m) filterInterval = parseInt(m[1]);
    }

    // 末尾保留：快照环形缓冲区
    // snapshotInterval 固定为 1000，每 1000 步存一次完整快照。
    // 2亿步只拷贝 20万次，均摊开销极低。
    // 缓冲区大小 = ceil(tailSize / snapshotInterval) + 1，保证最近的快照
    // 距末尾不超过 snapshotInterval 步，从而第二遍扫描至多跑 tailSize + snapshotInterval 步。
    const tailSize = (tail_steps > 0) ? tail_steps : 0;
    const SNAPSHOT_INTERVAL = 1000;
    const SNAP_BUF = tailSize > 0 ? (Math.ceil(tailSize / SNAPSHOT_INTERVAL) + 1) : 0;
    // 每个快照：[step, position, state, tape_clone]
    const snapRing = SNAP_BUF > 0 ? new Array(SNAP_BUF) : null;
    let snapHead  = 0;
    let snapCount = 0;

    // 第 0 步作为初始快照，确保总步数 < SNAPSHOT_INTERVAL 时也有可用起跑点
    if (snapRing) {
        snapRing[snapHead] = [0, position, state, [...tape]];
        snapHead = (snapHead + 1) % SNAP_BUF;
        snapCount++;
    }

    while(state != "end" && state != "error") {
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
            // head-tail：不在循环中记录中间步，结束后补充
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

        // 每隔 SNAPSHOT_INTERVAL 步存一次快照（移动完成后存，含纸带完整拷贝）
        // 快照语义：从此状态出发，下一步执行 step+1
        // 2亿步只触发 20万次，均摊开销极低
        if (snapRing && step % SNAPSHOT_INTERVAL === 0) {
            snapRing[snapHead] = [step, position, state, [...tape]];
            snapHead  = (snapHead + 1) % SNAP_BUF;
            if (snapCount < SNAP_BUF) snapCount++;
        }
    }

    console.log(performance.now() - t0, "ms");
    t0 = performance.now();

    // head-tail 模式：补充最终状态（若与开头不同）
    if (filterHeadTail && step > 0) {
        history.push([step, position, history[history.length - 1][3], state, [...tape]]);
    }

    // 末尾保留：从最近快照重跑，捕获末尾 tailSize 步中不在 history 的条目
    if (snapRing && snapCount > 0 && tailSize > 0) {
        // 找到起跑快照：选步号 <= (finalStep - tailSize) 的最新快照
        // 从该快照出发，最多跑 tailSize + snapshotInterval 步即可覆盖末尾 tailSize 步
        const finalStep = step;
        const targetFrom = finalStep - tailSize;  // 需要覆盖的起始步号

        // 找最合适的快照（步号尽量大但不超过 targetFrom）
        let bestSnap = null;
        for (let i = 0; i < snapCount; i++) {
            const snap = snapRing[(snapHead - snapCount + i + SNAP_BUF) % SNAP_BUF];
            if (snap[0] <= targetFrom) {
                if (bestSnap === null || snap[0] > bestSnap[0]) bestSnap = snap;
            }
        }
        // 若所有快照都在 targetFrom 之后（步数很少），直接用第 0 步作为起点
        if (bestSnap === null) bestSnap = [0, history[0][1], history[0][3], [...history[0][4]]];

        // 建立 history 中已有步号的查找集合
        const inHistory = new Set(history.map(r => r[0]));

        // 从快照出发重跑，收集末尾 tailSize 步中缺失的条目
        let tape2   = [...bestSnap[3]];
        let pos2    = bestSnap[1];
        let state2  = bestSnap[2];
        let step2   = bestSnap[0];
        const captured = [];

        while (step2 < finalStep && state2 != "end" && state2 != "error") {
            step2++;
            const state2_0 = state2;
            const aDict = code[state2];
            if (aDict == undefined) { state2 = "error"; break; }
            if (pos2 >= tape2.length) tape2.push('');
            let act = aDict[tape2[pos2]];
            if (act == undefined) act = aDict[OTHER];
            if (act == undefined) { state2 = "error"; break; }
            state2 = act[2];
            if (act[0] == NOT_VALID) { state2 = "error"; break; }
            if (act[0] != N) tape2[pos2] = act[0];
            if (act[1] == NOT_VALID) { state2 = "error"; break; }

            // 只捕获末尾 tailSize 步范围内、且不在 history 的步
            if (step2 > targetFrom && !inHistory.has(step2)) {
                captured.push([step2, pos2, state2_0, state2, [...tape2]]);
            }

            if (act[1] === "R") {
                pos2++;
            } else if (act[1] === "L") {
                pos2--;
                if (pos2 < 0) {
                    pos2++;
                    tape2.unshift('');
                    captured.forEach(r => { r[1]++; r[4].unshift(''); });
                }
            }
        }

        // 双指针合并 captured 到 history（两者均已升序）
        if (captured.length > 0) {
            let ci = 0, hi = 0;
            const merged = [];
            while (hi < history.length || ci < captured.length) {
                const hStep = hi < history.length  ? history[hi][0]  : Infinity;
                const cStep = ci < captured.length ? captured[ci][0] : Infinity;
                merged.push(hStep <= cStep ? history[hi++] : captured[ci++]);
            }
            history.length = 0;
            for (let i = 0; i < merged.length; i++) history.push(merged[i]);
        }
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
