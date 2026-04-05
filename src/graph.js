// ── Graph: vector utils, graph construction, DOM rendering, physics ─────────

var global_size_factor = 0.5;
var global_force_factor = 2.5;
var connection_default_length = 0.6 * global_size_factor;  // 0.15
var self_connection_default_length = 0.4 * global_size_factor;  // 0.15
var vertex_prefered_distance = 1.4 * global_size_factor;  //0.8
var vertex_repel_strength = 0.01 * global_force_factor;  // 0.02
var connection_length_preserve_strength = 0.01 * global_force_factor;  // 0.02

function nodeIsPinnedForPhysics(node) {
    return !!(node && node._pinned);
}

// ── 框选与视觉分组（仅展示；保存见 file.js graph-groups）────────────────
var graphMarqueeSelected = new Set();  // 框选/点选中的节点 id（node[0]）
var graphVisualGroups = [];  // 视觉分组：{ id, members:Set, hue, name, … }
var _graphMarqueeDom = null;  // 框选预览 { g, rect }
var _graphGroupsLayer = null;  // 分组层 <g>
var _graphMarqueeGesture = null;  // 左键框选手势；无则为 null

function _graphNextGroupId() {  // 新组 id（内部用）
    return 'grp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function clientToSvgLocalGraphView(clientX, clientY) {  // 视口坐标 → graph-view 内 SVG 像素（与节点绘制一致）
    const rect = graph_view.getBoundingClientRect();
    return [clientX - rect.left, clientY - rect.top];
}

function syncGraphVisualGroupDom() {  // 按 graphVisualGroups 重建分组 DOM（<g>+圆角矩形+组名）；规范化 hue/members/name
    if (!_graphGroupsLayer) return;
    while (_graphGroupsLayer.firstChild) _graphGroupsLayer.removeChild(_graphGroupsLayer.lastChild);
    graphVisualGroups.forEach(g => {
        if (typeof g.hue !== 'number' || !Number.isFinite(g.hue)) g.hue = (graphVisualGroups.indexOf(g) * 47) % 360;
        if (!(g.members instanceof Set)) g.members = new Set(Array.isArray(g.members) ? g.members : []);
        if (typeof g.name !== 'string') g.name = '';
        const wg = svgEl('g', {});
        const rect = svgEl('rect', {
            rx: '14', ry: '14',
            'pointer-events': 'none',
            'stroke-width': '1.2'
        });
        rect.setAttribute('fill', `hsla(${g.hue}, 50%, 52%, 0.26)`);
        rect.setAttribute('stroke', `hsla(${g.hue}, 65%, 28%, 0.45)`);
        const title = svgEl('text', {
            fill: '#ffffff',
            style: 'font-size:11px;font-weight:600',
            'text-anchor': 'middle',
            'pointer-events': 'none'
        });
        wg.appendChild(rect);
        wg.appendChild(title);
        _graphGroupsLayer.appendChild(wg);
        g._domWrap = wg;
        g._domRect = rect;
        g._domTitle = title;
        g._lastBbox = null;
    });
}

function graphNodeVisualBoundsSvg(p) {  // 圆盘在 SVG 像素下的外包矩形（半径 vertex_r），供组框并集
    return {
        minX: p[0] - vertex_r,
        maxX: p[0] + vertex_r,
        minY: p[1] - vertex_r,
        maxY: p[1] + vertex_r
    };
}

function updateGraphVisualGroupRects(graph) {  // 每帧更新组框/组名；并集+对数 pad；写 _lastBbox 供右键命中
    const titleBand = 20;
    graphVisualGroups.forEach(g => {
        const el = g._domRect;
        const titleEl = g._domTitle;
        if (!el) return;
        let unionMinX = Infinity, unionMinY = Infinity, unionMaxX = -Infinity, unionMaxY = -Infinity;
        let memberCount = 0;
        graph.forEach(node => {
            if (!node[2] || node[0].startsWith('self-connection')) return;
            if (!g.members.has(node[0])) return;
            const p = vector_plus([frame.x, frame.y], vector_scale(frame.factor, node[1]));
            const b = graphNodeVisualBoundsSvg(p);
            memberCount++;
            unionMinX = Math.min(unionMinX, b.minX);
            unionMinY = Math.min(unionMinY, b.minY);
            unionMaxX = Math.max(unionMaxX, b.maxX);
            unionMaxY = Math.max(unionMaxY, b.maxY);
        });
        if (memberCount === 0) {
            el.setAttribute('visibility', 'hidden');
            if (titleEl) titleEl.setAttribute('visibility', 'hidden');
            g._lastBbox = null;
            return;
        }
        const pad = Math.max(
            graph_group_pad_floor,
            graph_group_pad_log_a - graph_group_pad_log_b * Math.log(memberCount)
        );
        const gx = unionMinX - pad;
        const gy = unionMinY - pad;
        const gw = unionMaxX - unionMinX + 2 * pad;
        const gh = unionMaxY - unionMinY + 2 * pad;
        const titleCx = (unionMinX + unionMaxX) * 0.5;
        el.setAttribute('visibility', 'visible');
        el.setAttribute('x', gx);
        el.setAttribute('y', gy);
        el.setAttribute('width', gw);
        el.setAttribute('height', gh);
        const nm = (g.name && String(g.name).trim()) ? String(g.name).trim() : '';
        if (titleEl) {
            if (nm) {
                titleEl.textContent = nm;
                titleEl.setAttribute('visibility', 'visible');
                titleEl.setAttribute('x', titleCx);
                titleEl.setAttribute('y', gy - 6);
            } else {
                titleEl.textContent = '';
                titleEl.setAttribute('visibility', 'hidden');
            }
        }
        const topExtra = nm ? titleBand : 0;
        g._lastBbox = { x: gx, y: gy - topExtra, w: gw, h: gh + topExtra };
    });
}

function pickGraphGroupAtSvg(sx, sy) {  // (sx,sy) 命中哪组 _lastBbox；后绘制的组优先
    for (let i = graphVisualGroups.length - 1; i >= 0; i--) {
        const b = graphVisualGroups[i]._lastBbox;
        if (!b) continue;
        if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h)
            return graphVisualGroups[i].id;
    }
    return null;
}

function applyGraphGroupsFromFile(raw) {  // 从工程 JSON graph-groups 恢复；非法则清空并 sync DOM
    graphVisualGroups = [];
    if (!Array.isArray(raw)) {
        syncGraphVisualGroupDom();
        return;
    }
    raw.forEach((item, idx) => {
        if (!item || typeof item.id !== 'string') return;
        const members = Array.isArray(item.members) ? item.members.map(String) : [];
        const hue = typeof item.hue === 'number' && Number.isFinite(item.hue) ? item.hue : (idx * 47) % 360;
        const gname = typeof item.name === 'string' ? item.name : '';
        graphVisualGroups.push({ id: item.id, members: new Set(members), hue, name: gname });
    });
    syncGraphVisualGroupDom();
}

function getGraphGroupsForSave() {  // 供保存的 graph-groups；成员 id 仅保留当前 graph 中存在的
    const valid = typeof graph !== 'undefined' && Array.isArray(graph)
        ? new Set(graph.map(n => n[0]))
        : null;
    return graphVisualGroups.map(g => ({
        id: g.id,
        members: valid ? [...g.members].filter(id => valid.has(id)) : [...g.members],
        hue: typeof g.hue === 'number' ? g.hue : 0,
        name: typeof g.name === 'string' ? g.name : ''
    }));
}

function graphCtxCreateGroupFromSelection() {  // 右键：框选新建组 + sync + markDirty
    if (graphMarqueeSelected.size === 0) return;
    graphVisualGroups.push({
        id: _graphNextGroupId(),
        members: new Set(graphMarqueeSelected),
        hue: (graphVisualGroups.length * 47) % 360,
        name: ''
    });
    syncGraphVisualGroupDom();
    if (typeof markDirty === 'function') markDirty();
}

function graphCtxMoveSelectionIntoGroup(groupId) {  // 右键：框选并入该组（可多组）
    if (!groupId || graphMarqueeSelected.size === 0) return;
    const g = graphVisualGroups.find(x => x.id === groupId);
    if (!g) return;
    graphMarqueeSelected.forEach(id => g.members.add(id));
    if (typeof markDirty === 'function') markDirty();
}

function graphCtxMoveSelectionOutOfGroup(groupId) {  // 右键：从该组移除框选；组空则删组并 sync DOM
    if (!groupId || graphMarqueeSelected.size === 0) return;
    const g = graphVisualGroups.find(x => x.id === groupId);
    if (!g) return;
    graphMarqueeSelected.forEach(id => g.members.delete(id));
    if (g.members.size === 0) {
        const ix = graphVisualGroups.indexOf(g);
        if (ix >= 0) graphVisualGroups.splice(ix, 1);
        syncGraphVisualGroupDom();
    }
    if (typeof markDirty === 'function') markDirty();
}

function graphCtxDeleteGroup(groupId) {  // 右键：删组（仅视觉数据，不删状态节点）
    if (!groupId) return;
    const ix = graphVisualGroups.findIndex(x => x.id === groupId);
    if (ix < 0) return;
    graphVisualGroups.splice(ix, 1);
    syncGraphVisualGroupDom();
    if (typeof markDirty === 'function') markDirty();
}

function hideGraphContextMenu() {  // 隐藏 #graph-context-menu
    const m = document.getElementById('graph-context-menu');
    if (m) m.style.display = 'none';
}

function refreshGraphContextMenuLabels() {  // 刷新菜单 [data-i18n] 与组名 placeholder
    const m = document.getElementById('graph-context-menu');
    if (!m) return;
    m.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key && typeof t === 'function') el.textContent = t(key);
    });
    const inp = m.querySelector('.graph-ctx-name-input');
    if (inp && typeof t === 'function') inp.placeholder = t('graphGroupNamePlaceholder');
}

function ensureGraphContextMenu() {  // 懒创建右键菜单（组名输入+四项）→ body
    let m = document.getElementById('graph-context-menu');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'graph-context-menu';
    m.className = 'graph-context-menu';
    const nameRow = document.createElement('div');
    nameRow.className = 'graph-ctx-name-row';
    const nameInp = document.createElement('input');
    nameInp.type = 'text';
    nameInp.className = 'graph-ctx-name-input';
    nameInp.setAttribute('autocomplete', 'off');
    if (typeof t === 'function') nameInp.placeholder = t('graphGroupNamePlaceholder');
    nameInp.addEventListener('mousedown', e => { e.stopPropagation(); });
    nameInp.addEventListener('click', e => { e.stopPropagation(); });
    nameInp.addEventListener('input', () => {
        const gid = m._ctxGroupId;
        if (!gid) return;
        const gObj = graphVisualGroups.find(x => x.id === gid);
        if (!gObj) return;
        gObj.name = nameInp.value;
        if (typeof markDirty === 'function') markDirty();
    });
    nameRow.appendChild(nameInp);
    m.appendChild(nameRow);
    const mk = (key, action) => {
        const d = document.createElement('div');
        d.className = 'graph-ctx-item';
        d.setAttribute('data-i18n', key);
        d.textContent = typeof t === 'function' ? t(key) : key;
        d.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
        });
        d.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            if (d.classList.contains('disabled')) return;
            hideGraphContextMenu();
            if (typeof closeAllMenus === 'function') closeAllMenus();
            action();
        });
        m.appendChild(d);
        return d;
    };
    mk('graphCtxCreateGroup', () => graphCtxCreateGroupFromSelection());
    mk('graphCtxMoveIntoGroup', () => graphCtxMoveSelectionIntoGroup(m._ctxGroupId));
    mk('graphCtxMoveOutOfGroup', () => graphCtxMoveSelectionOutOfGroup(m._ctxGroupId));
    mk('graphCtxDeleteGroup', () => graphCtxDeleteGroup(m._ctxGroupId));
    document.body.appendChild(m);
    return m;
}

function showGraphContextMenu(clientX, clientY, groupIdAtPoint) {  // 屏幕坐标弹出菜单；按框选/是否点组禁用项；同步组名
    const m = ensureGraphContextMenu();
    if (typeof t === 'function') refreshGraphContextMenuLabels();
    m._ctxGroupId = groupIdAtPoint;
    const nSel = graphMarqueeSelected.size;
    const hasG = groupIdAtPoint != null;
    const nameRow = m.querySelector('.graph-ctx-name-row');
    const nameInp = m.querySelector('.graph-ctx-name-input');
    if (nameRow && nameInp) {
        nameRow.style.display = hasG ? 'block' : 'none';
        if (hasG) {
            const go = graphVisualGroups.find(x => x.id === groupIdAtPoint);
            nameInp.value = (go && typeof go.name === 'string') ? go.name : '';
        } else {
            nameInp.value = '';
        }
    }
    const items = m.querySelectorAll('.graph-ctx-item');
    const setDis = (i, dis) => items[i].classList.toggle('disabled', !!dis);
    setDis(0, nSel === 0);
    setDis(1, nSel === 0 || !hasG);
    setDis(2, nSel === 0 || !hasG);
    setDis(3, !hasG);
    m.style.display = 'block';
    const pad = 4;
    let x = clientX, y = clientY;
    const mw = m.offsetWidth, mh = m.offsetHeight;
    if (x + mw + pad > window.innerWidth) x = window.innerWidth - mw - pad;
    if (y + mh + pad > window.innerHeight) y = window.innerHeight - mh - pad;
    m.style.left = Math.max(pad, x) + 'px';
    m.style.top = Math.max(pad, y) + 'px';
}

function finalizeMarqueeSelection(sx0, sy0, sx1, sy1, keyEv) {  // 框选结束：框内节点；默认替换，Ctrl/Meta 并集，Shift 减
    const xMin = Math.min(sx0, sx1);
    const xMax = Math.max(sx0, sx1);
    const yMin = Math.min(sy0, sy1);
    const yMax = Math.max(sy0, sy1);
    const inRect = [];
    if (typeof graph !== 'undefined' && Array.isArray(graph)) {
        graph.forEach(node => {
            if (!node[2] || node[0].startsWith('self-connection')) return;
            const p = vector_plus([frame.x, frame.y], vector_scale(frame.factor, node[1]));
            if (p[0] >= xMin && p[0] <= xMax && p[1] >= yMin && p[1] <= yMax)
                inRect.push(node[0]);
        });
    }
    const shift = keyEv && keyEv.shiftKey;
    const addMode = keyEv && (keyEv.ctrlKey || keyEv.metaKey);
    if (shift) {
        inRect.forEach(id => graphMarqueeSelected.delete(id));
    } else if (addMode) {
        inRect.forEach(id => graphMarqueeSelected.add(id));
    } else {
        graphMarqueeSelected.clear();
        inRect.forEach(id => graphMarqueeSelected.add(id));
    }
}

function applyGraphNodeClickSelection(rawStateId, e) {  // 单击节点：普通单选，Ctrl/Meta 增选，Shift 减选
    if (e.shiftKey)
        graphMarqueeSelected.delete(rawStateId);
    else if (e.ctrlKey || e.metaKey)
        graphMarqueeSelected.add(rawStateId);
    else {
        graphMarqueeSelected.clear();
        graphMarqueeSelected.add(rawStateId);
    }
}

function updateMarqueePreviewRect(sx0, sy0, sx1, sy1) {  // 框选拖动：预览矩形（SVG 局部 px）
    if (!_graphMarqueeDom) return;
    const x = Math.min(sx0, sx1);
    const y = Math.min(sy0, sy1);
    const w = Math.abs(sx1 - sx0);
    const h = Math.abs(sy1 - sy0);
    _graphMarqueeDom.rect.setAttribute('x', x);
    _graphMarqueeDom.rect.setAttribute('y', y);
    _graphMarqueeDom.rect.setAttribute('width', w);
    _graphMarqueeDom.rect.setAttribute('height', h);
}

function initGraphMarqueeAndContextMenuOnce() {  // 注册框选/关菜单/右键；build_graph_dom 末尾调用，需先有 _graphMarqueeDom
    if (!graph_view || graph_view._graphMarqueeCtxInited) return;
    graph_view._graphMarqueeCtxInited = true;

    if (!document._graphCtxCloserInited) {
        document._graphCtxCloserInited = true;
        document.addEventListener('mousedown', e => {
            const m = document.getElementById('graph-context-menu');
            if (!m || m.style.display === 'none') return;
            if (m.contains(e.target)) return;
            hideGraphContextMenu();
        });
    }

    graph_view.addEventListener('mousedown', e => {
        if (e.button !== 0 || e.altKey) return;
        if (typeof closeAllMenus === 'function') closeAllMenus();
        hideGraphContextMenu();

        const rect = graph_view.getBoundingClientRect();
        const sx0 = e.clientX - rect.left;
        const sy0 = e.clientY - rect.top;
        _graphMarqueeGesture = { sx0, sy0, sx: sx0, sy: sy0, active: false, rect, targetOnDown: e.target };

        const onMove = ev => {
            const g = _graphMarqueeGesture;
            if (!g) return;
            const sx = ev.clientX - g.rect.left;
            const sy = ev.clientY - g.rect.top;
            if (!g.active) {
                const dx = sx - g.sx0;
                const dy = sy - g.sy0;
                if (dx * dx + dy * dy > 16) {
                    g.active = true;
                    if (_graphMarqueeDom) _graphMarqueeDom.g.setAttribute('visibility', 'visible');
                }
            }
            if (g.active) {
                g.sx = sx;
                g.sy = sy;
                updateMarqueePreviewRect(g.sx0, g.sy0, g.sx, g.sy);
            }
        };

        const onUp = ev => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            const g = _graphMarqueeGesture;
            _graphMarqueeGesture = null;
            if (_graphMarqueeDom) _graphMarqueeDom.g.setAttribute('visibility', 'hidden');
            if (!g) return;
            if (g.active) finalizeMarqueeSelection(g.sx0, g.sy0, g.sx, g.sy, ev);
            else if (g.targetOnDown && g.targetOnDown.getAttribute && g.targetOnDown.getAttribute('data-graph-pane-bg') === '1')
                graphMarqueeSelected.clear();
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    graph_view.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (typeof closeAllMenus === 'function') closeAllMenus();
        const [sx, sy] = clientToSvgLocalGraphView(e.clientX, e.clientY);
        const gid = pickGraphGroupAtSvg(sx, sy);
        showGraphContextMenu(e.clientX, e.clientY, gid);
    });
}

function makeRng(seed) {
    let state = seed;
    const MOD = Math.pow(2, 32);
    return {
        next() {
            state = (state * 1664525 + 1013904223) % MOD;
            return state / MOD;
        },
        nextGaussian(quality = 4) {
            let r = 0;
            for (let i = 0; i < quality; i++) r += this.next();
            return (r - quality * 0.5) / Math.sqrt(quality / 12);
        }
    };
}


function construct_directed_graph_with_code(code, seed = 0, positionMap = null) {  // 根据图灵机代码构建状态图
    const rng = makeRng(seed);
    const get_random_point = () => [rng.nextGaussian(), rng.nextGaussian()];
    const recycledPos = (name) => {
        if (!positionMap) return null;
        const p = positionMap[name];
        if (!p || !Array.isArray(p) || p.length < 2) return null;
        const x = p[0], y = p[1];
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return [x, y];
    };
    const vertexPos = (name) => recycledPos(name) || get_random_point();
    var graph = [];
    for (const [state, action] of Object.entries(code)) {
        graph.push([
            state,  // State
            vertexPos(state),  // Position
            true,  // Visibility
            []  // Connections: [target_vertex_index, edge_name, prefered_length, offset_for_multiple_edges]
        ]);  // Add every state as a node in graph
    }

    var i;
    Object.keys(code).forEach(state => {  // Traversal all states
        i = graph.findIndex(e => e[0] == state);
        const vertex = graph[i];
        for (let input of Reflect.ownKeys(code[state])) {  // Traversal all actions
            let action = code[state][input];
            if (input == NOT_VALID)
                input = '*';
            let [output, direction, nextState] = action;
            if (output == NOT_VALID)
                output = '*';
            if (direction == NOT_VALID)
                direction = '*';
            const edge_name = (input == "" ? '""': (input == OTHER ? 'other': input)) + (output != N ? '→'+ (output == "" ? '""': output): "") + ', ' + direction;
            if(nextState == state) {  // Connect to self
                const scIndex = graph.filter(n => n[0].startsWith('self-connection')).length;
                graph.push([`self-connection-${scIndex}`, vertexPos(`self-connection-${scIndex}`), false, i]);  // Add the new node for displaying a self-connection
                vertex[3].push([graph.length - 1, edge_name , self_connection_default_length, undefined]);  // Add a connection
            }
            else {  // Connection to another vertex
                var j = graph.findIndex(e => e[0] == nextState);
                if(j == -1) {  // This is a connection to a new node.
                    if (nextState == 'end')
                        nextState = "end_from_" + i;
                    if (nextState == 'error')
                        nextState = "error_from_" + i;
                    const newNode = [
                        nextState,
                        vertexPos(nextState),
                        true,
                        []
                    ];  // Add the new node.
                    // 记录此节点对应的代码行信息（第四元 action[3] 由 parseProgramCode 附带）
                    if (action[3]) newNode._jumpInfo = action[3];
                    graph.push(newNode);
                    j = graph.length - 1;
                }

                // Calaulate offset for displaying multiple edges.
                var offset = 0.5;
                var has_same_direction_edge = false;
                vertex[3].forEach(connection => {
                    if(connection[0] == j)  // Found multiple edge of same direction
                    {
                        offset = Math.min(offset, connection[3]);
                        connection[3] += 0.5;
                        has_same_direction_edge = true;
                    }
                });
                const nextStateVertex = graph[j];
                if(nextStateVertex[0].startsWith('self-connection'))
                    return;
                var has_opposite_direction_edge = false;
                nextStateVertex[3].forEach(connection => {
                    if(connection[0] == i) {  // Found multiple edge of opposite direction
                        offset = Math.min(offset, -connection[3]);
                        connection[3] -= 0.5;
                        has_opposite_direction_edge = true;
                    }
                });
                offset -= 0.5;

                // 重边中只有第一条参与力布局，避免多弹簧叠加导致抖动
                const is_first_edge = !has_same_direction_edge && !has_opposite_direction_edge;
                const new_connection = [j, edge_name, connection_default_length, offset];
                new_connection._physics = is_first_edge;
                vertex[3].push(new_connection);
            }
            
        }
    });

    return graph;
}


// Display parameters
var frame = {"x": 400, "y": 450, "factor": 200};  // Frame for visualization.
var vertex_r = 7;  // 有向图节点显示半径(px)
var arrow_head_length = 10;  // (px)
var arrow_head_width = 7;  // (px)
var self_connection_angle = 1.;
var connection_text_offset = 10.;  // (px)
var self_connection_text_distance_factor = 0.85;
var vertex_name_text_offset = [8, 15];
var multiple_edges_gap_angle = 1.2;      // 起止点旋转角（控制曲线从节点边缘的散开角度）
var multiple_edges_shape_param1 = 0.3;   // 控制点切线延伸量 = l * param1
var multiple_edges_gap = 15;             // (px) 控制点法向偏移量，控制重边显示间距

// 组可视化参数
// 每个组是一个方框，包裹住所有成员点（每个半径为vertex_r），除此之外还有padding: max(floor, a - b * ln(n))
var graph_group_pad_floor = 5;  // 组框边距下限 (px)
var graph_group_pad_log_a = 45;  // 对数边距公式中的常数项 a（px）
var graph_group_pad_log_b = 8;  // 对数边距公式中的系数 b（px）

function vector_plus(u, v) {
    return [u[0] + v[0], u[1] + v[1]]
}

function vector_subtract(u, v) {
    return [u[0] - v[0], u[1] - v[1]]
}

function vector_length(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
}

function vector_scale(k, v) {
    return [k * v[0], k * v[1]];
}

function vector_rotate(v, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [v[0] * cos - v[1] * sin, v[0] * sin + v[1] * cos];
}

// ─── DOM 辅助 ────────────────────────────────────────────────
const SVG_NS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs))
        el.setAttribute(k, v);
    return el;
}

// 更新箭头头部多边形的 points 属性（复用已有元素）
function update_arrow_head_el(el, top, direction) {
    const root = vector_subtract(top, vector_scale(arrow_head_length, direction));
    el.setAttribute("points",
        (root[0] + direction[1]*arrow_head_width*0.5) + ',' + (root[1] - direction[0]*arrow_head_width*0.5) + ' '
        + top[0] + ',' + top[1] + ' '
        + (root[0] - direction[1]*arrow_head_width*0.5) + ',' + (root[1] + direction[0]*arrow_head_width*0.5));
}

// ─── 阶段一：构建 DOM 结构（仅在图结构改变时调用）──────────────

function build_graph_dom(graph) {
    // 清空 graph_view，但保留已有的非图内容（无）
    while (graph_view.firstChild) graph_view.removeChild(graph_view.lastChild);

    graph_view.style.userSelect = 'none';  // 文本不可选中

    const svgBg = svgEl('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: 'transparent' });
    svgBg.setAttribute('data-graph-pane-bg', '1');
    svgBg.setAttribute('style', 'pointer-events:all');
    graph_view.appendChild(svgBg);

    // 视觉分组层（紧挨全屏背景之后绘制，边与节点叠在其上）
    _graphGroupsLayer = svgEl('g', { id: 'graph-visual-groups-layer' });
    graph_view.appendChild(_graphGroupsLayer);
    syncGraphVisualGroupDom();

    // 连线层
    const conn_group = svgEl("g", {});
    graph_view.appendChild(conn_group);

    graph.forEach(node => {
        if (node[0].startsWith('self-connection')) return;
        node[3].forEach(connection => {
            const target_node = graph[connection[0]];
            const dom = {};  // 该 connection 对应的 DOM 元素引用

            dom.path = svgEl("path", {stroke:"black","stroke-width":"1",fill:"none"});
            dom.arrow = svgEl("polygon", {fill:"black"});
            dom.text  = svgEl("text",   {fill:"black",style:"font-size:12px"});
            dom.text.textContent = connection[1];
            conn_group.appendChild(dom.path);
            conn_group.appendChild(dom.arrow);
            conn_group.appendChild(dom.text);
            connection._dom = dom;  // 将 DOM 引用挂在 connection 上
        });
    });

    // 节点层
    const vert_group = svgEl("g", {fill:"white"});
    graph_view.appendChild(vert_group);

    graph.forEach(node => {
        if (!node[2]) return;  // 不可见节点跳过

        let node_name = node[0];
        if (node_name.startsWith('end'))   node_name = 'end';
        else if (node_name.startsWith('error')) node_name = 'error';
        const color = (node_name==='start'||node_name==='end'||node_name==='error') ? 'yellow' : 'white';

        const dom = {};
        dom.circle = svgEl("circle", {r: vertex_r, fill: color, stroke:"black","stroke-width":"1"});
        // 高亮圆环（默认隐藏）
        dom.highlight = svgEl("circle", {r: vertex_r + 8, fill:"none", stroke:color, "stroke-width":"2", visibility:"hidden"});
        dom.pinLineH = svgEl("line", {
            stroke: "black", "stroke-width": "1.2", "stroke-linecap": "round", visibility: "hidden",
            "pointer-events": "none"
        });
        dom.pinLineV = svgEl("line", {
            stroke: "black", "stroke-width": "1.2", "stroke-linecap": "round", visibility: "hidden",
            "pointer-events": "none"
        });
        dom.label  = svgEl("text", {fill:"black", style:"font-size:12px"});
        dom.label.textContent = node[4] || "";
        dom.name   = svgEl("text", {fill:"black", style:"font-size:12px"});
        dom.name.textContent = node_name;

        vert_group.appendChild(dom.circle);
        vert_group.appendChild(dom.highlight);
        vert_group.appendChild(dom.pinLineH);
        vert_group.appendChild(dom.pinLineV);
        vert_group.appendChild(dom.label);
        vert_group.appendChild(dom.name);

        node._dom = dom;           // 将 DOM 引用挂在 node 上
        node._display_name = node_name;

        // ── 单击：框选式选中（Ctrl/Meta 增选、Shift 减选）并跳转代码；双击固定；拖动节点 ─────────────
        let didDragThisGesture = false;
        [dom.circle, dom.name, dom.label].forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('click', e => {
                if (e.altKey) return;
                if (didDragThisGesture) return;
                e.stopPropagation();
                if (e.detail === 1) {
                    applyGraphNodeClickSelection(node[0], e);
                    jumpEditorToState(node[0], node_name, node._jumpInfo);
                }
            });
            el.addEventListener('dblclick', e => {
                if (e.altKey) return;
                if (didDragThisGesture) return;
                e.stopPropagation();
                e.preventDefault();
                node._pinned = !node._pinned;
                if (typeof markDirty === 'function') markDirty();
            });
            el.addEventListener('mousedown', e => {
                if (e.button !== 0) return;  // 只响应左键
                if (e.altKey) return;  // Alt 键时让事件冒泡，由图旋转逻辑处理
                if (typeof closeAllMenus === 'function') closeAllMenus();  // 隐藏菜单
                e.stopPropagation();
                e.preventDefault();
                didDragThisGesture = false;

                const startScreenX = e.clientX;
                const startScreenY = e.clientY;
                let dragged = false;
                const DRAG_THRESHOLD = 4;  // 超过这个像素才算拖动

                const onMouseMove = e => {
                    const totalDx = e.clientX - startScreenX;
                    const totalDy = e.clientY - startScreenY;
                    if (!dragged && Math.sqrt(totalDx*totalDx + totalDy*totalDy) > DRAG_THRESHOLD) {
                        dragged = true;
                        didDragThisGesture = true;
                        dragging_node = node;
                        graph_view.style.cursor = 'grabbing';
                        el.style.cursor = 'grabbing';
                    }
                    if (dragged) {
                        // 将屏幕坐标直接反算为图坐标，节点始终吸附在鼠标下
                        const rect = graph_view.getBoundingClientRect();
                        const screenX = e.clientX - rect.left;
                        const screenY = e.clientY - rect.top;
                        node[1] = [
                            (screenX - frame.x) / frame.factor,
                            (screenY - frame.y) / frame.factor
                        ];
                    }
                };

                const onMouseUp = e => {
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('mouseup', onMouseUp);
                    dragging_node = null;
                    graph_view.style.cursor = '';
                    el.style.cursor = 'pointer';

                    if (dragged) {
                        if (typeof markDirty === 'function') markDirty();
                    }
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        });
    });

    const marquee_g = svgEl('g', { id: 'graph-marquee-layer', visibility: 'hidden' });
    marquee_g.setAttribute('style', 'pointer-events:none');
    const marquee_rect = svgEl('rect', {
        fill: 'rgba(40, 100, 220, 0.12)',
        stroke: 'rgba(40, 90, 200, 0.55)',
        'stroke-width': '1',
        'stroke-dasharray': '4 3'
    });
    marquee_g.appendChild(marquee_rect);
    graph_view.appendChild(marquee_g);
    _graphMarqueeDom = { g: marquee_g, rect: marquee_rect };

    initGraphMarqueeAndContextMenuOnce();

    // ── Alt + 左键拖动：整图绕可视区域中心旋转 ──────────────────────
    graph_view.addEventListener('mousedown', e => {
        if (e.button !== 0 || !e.altKey) return;
        e.preventDefault();

        const rect = graph_view.getBoundingClientRect();

        // 快照：记录每个节点的起始图坐标
        const startPositions = graph.map(node => node[1].slice());

        // 旋转轴：所有节点位置的平均值（图坐标）
        const pivotX = startPositions.reduce((s, p) => s + p[0], 0) / startPositions.length;
        const pivotY = startPositions.reduce((s, p) => s + p[1], 0) / startPositions.length;

        // 旋转轴对应的屏幕坐标，作为角度计算的参考中心
        const cx = frame.x + pivotX * frame.factor;
        const cy = frame.y + pivotY * frame.factor;

        // 起始角度：鼠标相对旋转轴的方位角
        const startAngle = Math.atan2(
            e.clientY - rect.top  - cy,
            e.clientX - rect.left - cx
        );

        graph_view.style.cursor = 'grabbing';

        const onMouseMove = e => {
            const angle = Math.atan2(
                e.clientY - rect.top  - cy,
                e.clientX - rect.left - cx
            );
            const delta = angle - startAngle;
            const cos = Math.cos(delta);
            const sin = Math.sin(delta);

            graph.forEach((node, idx) => {
                const dx = startPositions[idx][0] - pivotX;
                const dy = startPositions[idx][1] - pivotY;
                node[1] = [
                    pivotX + dx * cos - dy * sin,
                    pivotY + dx * sin + dy * cos
                ];
            });
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup',   onMouseUp);
            graph_view.style.cursor = '';
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup',   onMouseUp);
    });
}

function jumpEditorToRuleJumpInfo(jumpInfo) {  // 用 jumpInfo（行号+去注释行）跳转；成功返回 true
    if (!jumpInfo || typeof code_editor === 'undefined' || !code_editor) return false;
    const lines = code_editor_value.split('\n');
    let { lineIndex, lineContent } = jumpInfo;

    if (lines[lineIndex] !== undefined &&
        lines[lineIndex].split('//')[0].trim() === lineContent) {
        code_editor.setCursor(lineIndex, 0, { focus: true });
        return true;
    }

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].split('//')[0].trim() === lineContent) {
            jumpInfo.lineIndex = i;
            code_editor.setCursor(i, 0, { focus: true });
            return true;
        }
    }

    return false;
}

function jumpEditorToState(raw_name, state_name, jumpInfo) {  // 跳转到状态行；end_from/error_from 用 jumpInfo 精确定位规则行
    // ── end_from / error_from 节点：用 jumpInfo 定位 ────────────
    if (jumpInfo && (raw_name.startsWith('end_from_') || raw_name.startsWith('error_from_'))) {
        if (jumpEditorToRuleJumpInfo(jumpInfo)) return;
        return;
    }

    const lines = code_editor_value.split('\n');

    // ── 普通节点：匹配第一元 ─────────────────────────────────
    for (let i = 0; i < lines.length; i++) {
        const first_token = lines[i].split('//')[0].split(',')[0].trim();
        if (first_token === state_name) {
            code_editor.setCursor(i, 0, { focus: true });
            return;
        }
    }

    // 兜底：聚焦编辑器顶部
    code_editor.setCursor(0, 0, { focus: true });
}

        // ─── 阶段二：每帧只更新坐标属性（不碰 DOM 结构）───────────────

function update_graph_dom(graph) {
    // 更新连线
    graph.forEach(node => {
        if (node[0].startsWith('self-connection')) return;
        const a = vector_plus([frame.x, frame.y], vector_scale(frame.factor, node[1]));
        node[3].forEach(connection => {
            const target_node = graph[connection[0]];
            const b = vector_plus([frame.x, frame.y], vector_scale(frame.factor, target_node[1]));
            const dom = connection._dom;
            if (!dom) return;

            const v = vector_subtract(b, a);
            const l = vector_length(v);
            const v_normalized = vector_scale(1./l, v);
            const normal = [-v_normalized[1], v_normalized[0]];
            const c = vector_scale(vertex_r, v_normalized);

            if (target_node[0].startsWith('self-connection')) {
                const c1 = vector_rotate(c,  self_connection_angle*0.5);
                const c2 = vector_rotate(c, -self_connection_angle*0.5);
                const c3 = vector_scale(l/vertex_r, c1);
                const c4 = vector_scale(l/vertex_r, c2);
                const p1 = vector_plus(a, c1);
                const p2 = vector_plus(a, c2);
                const p3 = vector_plus(a, c3);
                const p4 = vector_plus(a, c4);
                const tl = vector_plus(a, vector_scale(self_connection_text_distance_factor, v));
                dom.path.setAttribute("d", `M ${p1[0]} ${p1[1]} C ${p3[0]} ${p3[1]} ${p4[0]} ${p4[1]} ${p2[0]} ${p2[1]}`);
                update_arrow_head_el(dom.arrow, p2, vector_scale(-1./vertex_r, c2));
                dom.text.setAttribute("x", tl[0]-3);
                dom.text.setAttribute("y", tl[1]+4);
            } else {
                if (l > vertex_r*2) {
                    const offset = connection[3];
                    // 起止点：旋转角度决定从节点边缘的出发方向（曲线自然散开）
                    const c1 = vector_rotate(c,  multiple_edges_gap_angle * offset * 0.5);
                    const c2 = vector_rotate(c, -multiple_edges_gap_angle * offset * 0.5);
                    const p1 = vector_plus(a, c1);
                    const p2 = vector_subtract(b, c2);
                    // 控制点：切线分量（l*param1）保证曲线流畅，叠加法线固定偏移保证间距均匀
                    const normalOffset = vector_scale(multiple_edges_gap * offset, normal);
                    const p3 = vector_plus(vector_plus(p1, vector_scale(multiple_edges_shape_param1 * l, v_normalized)), normalOffset);
                    const p4 = vector_plus(vector_subtract(p2, vector_scale(multiple_edges_shape_param1 * l, v_normalized)), normalOffset);
                    // 标签：曲线中点沿法线偏移
                    const mid = vector_scale(0.5, vector_plus(p3, p4));
                    const tl = vector_plus(mid, vector_scale(connection_text_offset * Math.sign(offset + 0.1), normal));
                    // 箭头方向用 p4→p2 的实际切线
                    const arrowDir = (() => { const d = vector_subtract(p2, p4); const dl = vector_length(d); return dl > 0 ? vector_scale(1/dl, d) : v_normalized; })();
                    dom.path.setAttribute("d", `M ${p1[0]} ${p1[1]} C ${p3[0]} ${p3[1]} ${p4[0]} ${p4[1]} ${p2[0]} ${p2[1]}`);
                    update_arrow_head_el(dom.arrow, p2, arrowDir);
                    dom.text.setAttribute("x", tl[0]-3);
                    dom.text.setAttribute("y", tl[1]+4);
                    dom.path.setAttribute("visibility", "visible");
                    dom.arrow.setAttribute("visibility", "visible");
                    dom.text.setAttribute("visibility", "visible");
                } else {
                    dom.path.setAttribute("visibility", "hidden");
                    dom.arrow.setAttribute("visibility", "hidden");
                    dom.text.setAttribute("visibility", "hidden");
                }
            }
        });
    });

    // 更新节点
    graph.forEach(node => {
        if (!node[2] || !node._dom) return;
        const p = vector_plus([frame.x, frame.y], vector_scale(frame.factor, node[1]));
        const dom = node._dom;
        dom.circle.setAttribute("cx", p[0]);
        dom.circle.setAttribute("cy", p[1]);
        if (graphMarqueeSelected.has(node[0])) {  // 当前点被选中了
            const t = performance.now() * 0.002;
            dom.circle.setAttribute('stroke-dasharray', '3.5 3.5');
            dom.circle.setAttribute('stroke-dashoffset', String(t % 1 < 0.5 ? 0 : 3.5));
        } else {
            dom.circle.removeAttribute('stroke-dasharray');
            dom.circle.removeAttribute('stroke-dashoffset');
            dom.circle.setAttribute('stroke', 'black');
        }
        dom.highlight.setAttribute("cx", p[0]);
        dom.highlight.setAttribute("cy", p[1]);
        // 高亮圆环显隐
        dom.highlight.setAttribute("visibility",
            node._display_name === highlighted_vertex_name ? "visible" : "hidden");
        const pinVis = node._pinned ? "visible" : "hidden";
        dom.pinLineH.setAttribute("visibility", pinVis);
        dom.pinLineV.setAttribute("visibility", pinVis);
        if (node._pinned) {
            const pa = 4;
            dom.pinLineH.setAttribute("x1", p[0] - pa);
            dom.pinLineH.setAttribute("y1", p[1]);
            dom.pinLineH.setAttribute("x2", p[0] + pa);
            dom.pinLineH.setAttribute("y2", p[1]);
            dom.pinLineV.setAttribute("x1", p[0]);
            dom.pinLineV.setAttribute("y1", p[1] - pa);
            dom.pinLineV.setAttribute("x2", p[0]);
            dom.pinLineV.setAttribute("y2", p[1] + pa);
        }
        dom.label.setAttribute("x", p[0]-3);
        dom.label.setAttribute("y", p[1]+4);
        dom.name.setAttribute("x",  p[0]+vertex_name_text_offset[0]-3);
        dom.name.setAttribute("y",  p[1]+vertex_name_text_offset[1]+4);
    });

    updateGraphVisualGroupRects(graph);
}

function graph_evolve() {
    // 先将所有力累积到 delta 数组，帧末统一应用，避免帧内即时更新破坏角动量守恒
    const delta = graph.map(() => [0, 0]);

    // Vertices repeling
    for(var i = 0; i < graph.length; i++)
        for(var j = 0; j < i; j++) {
            const v = vector_subtract(graph[j][1], graph[i][1]);
            const d = vector_length(v);
            if(d<vertex_prefered_distance) {
                const force = vector_scale((1-d/vertex_prefered_distance)*vertex_repel_strength/d, v);
                if(graph[j] !== dragging_node && !nodeIsPinnedForPhysics(graph[j]))
                    delta[j] = vector_plus(delta[j], force);
                if(graph[i] !== dragging_node && !nodeIsPinnedForPhysics(graph[i]))
                    delta[i] = vector_subtract(delta[i], force);
            }
        }

    // Connections length preserving
    graph.forEach((node1, idx1) => {
        if(node1[0].startsWith('self-connection'))
            return;
        node1[3].forEach(connection => {
            if(connection._physics === false) return;  // 重边只让第一条参与力布局
            const idx2 = connection[0];
            const node2 = graph[idx2];
            const prefered_length = connection[2];
            const v = vector_subtract(node2[1], node1[1]);
            const d = vector_length(v);
            const force = vector_scale((1-d/prefered_length)*connection_length_preserve_strength/d, v);
            if(node2 !== dragging_node && !nodeIsPinnedForPhysics(node2))
                delta[idx2] = vector_plus(delta[idx2], force);
            if(node1 !== dragging_node && !nodeIsPinnedForPhysics(node1))
                delta[idx1] = vector_subtract(delta[idx1], force);
        });
    });

    // 统一应用位移（拖动中与已固定节点不随力布局移动）
    graph.forEach((node, idx) => {
        if (node === dragging_node || nodeIsPinnedForPhysics(node)) return;
        node[1] = vector_plus(node[1], delta[idx]);
    });
}

function update_graph_view() {  // 更新图（每帧执行）
    graph_evolve();
    update_graph_dom(graph);  // 只更新坐标属性，不重建 DOM
    
    requestAnimationFrame(update_graph_view);  // 由运行环境决定下次执行的时间（通常与画面刷新率保持一致）
}
