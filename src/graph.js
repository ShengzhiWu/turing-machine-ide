// ── Graph: vector utils, graph construction, DOM rendering, physics ─────────

var global_size_factor = 0.5;
var global_force_factor = 2.;
var connection_default_length = 0.6*global_size_factor;  // 0.15
var self_connection_default_length = 0.4*global_size_factor;  // 0.15
var vertex_prefered_distance = 1.4*global_size_factor;  //0.8
var vertex_repel_strength = 0.01*global_force_factor;  // 0.02
var connection_length_preserve_strength = 0.01*global_force_factor;  // 0.02


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


function construct_directed_graph_with_code(code, seed=0) {  // 根据图灵机代码构建状态图
    const rng = makeRng(seed);
    const get_random_point = () => [rng.nextGaussian(), rng.nextGaussian()];
    var graph = [];
    for (const [state, action] of Object.entries(code)) {
        graph.push([
            state,  // State
            get_random_point(),  // Position
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
                graph.push([`self-connection-${scIndex}`, get_random_point(), false, i]);  // Add the new node for displaying a self-connection
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
                        get_random_point(),
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
                vertex[3].forEach(connection => {
                    if(connection[0] == j)  // Found multiple edge of same direction
                    {
                        offset = Math.min(offset, connection[3]);
                        connection[3] += 0.5;
                    }
                });
                const nextStateVertex = graph[j];
                if(nextStateVertex[0].startsWith('self-connection'))
                    return;
                nextStateVertex[3].forEach(connection => {
                    if(connection[0] == i) {  // Found multiple edge of opposite direction
                        offset = Math.min(offset, -connection[3]);
                        connection[3] -= 0.5;
                    }
                });
                offset -= 0.5;

                vertex[3].push([j, edge_name, connection_default_length, offset]);
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
var multiple_edges_gap_angle = 1.2;
var multiple_edges_shape_param1 = 0.3;
var multiple_edges_shape_param2 = 50;  // (px)

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
        dom.label  = svgEl("text", {fill:"black", style:"font-size:12px"});
        dom.label.textContent = node[4] || "";
        dom.name   = svgEl("text", {fill:"black", style:"font-size:12px"});
        dom.name.textContent = node_name;

        vert_group.appendChild(dom.circle);
        vert_group.appendChild(dom.highlight);
        vert_group.appendChild(dom.label);
        vert_group.appendChild(dom.name);

        node._dom = dom;           // 将 DOM 引用挂在 node 上
        node._display_name = node_name;

        // ── 点击节点 → 编辑器光标跳转 / 拖动节点 ───────────────
        [dom.circle, dom.name].forEach(el => {
            el.style.cursor = 'pointer';
            el.addEventListener('mousedown', e => {
                if (e.button !== 0) return;  // 只响应左键
                e.stopPropagation();
                e.preventDefault();

                const startScreenX = e.clientX;
                const startScreenY = e.clientY;
                let dragged = false;
                const DRAG_THRESHOLD = 4;  // 超过这个像素才算拖动

                const onMouseMove = e => {
                    const totalDx = e.clientX - startScreenX;
                    const totalDy = e.clientY - startScreenY;
                    if (!dragged && Math.sqrt(totalDx*totalDx + totalDy*totalDy) > DRAG_THRESHOLD) {
                        dragged = true;
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

                    if (!dragged) {
                        // 没有拖动 → 触发跳转
                        jumpEditorToState(node[0], node_name, node._jumpInfo);
                    }
                };

                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        });
    });
}

/**
 * 在代码编辑器中找到目标节点对应的行，并将光标跳转过去。
 *
 * - 普通节点：匹配第一元 == state_name 的第一行。
 * - end_from / error_from 节点：利用 source.fromState（第一元）+
 *   source.fromInput（第二元）精确定位那条跳转到 end/error 的规则行。
 *   若一个状态有多条跳到 error 的规则，可通过 input 符号区分。
 *   fromInput 可能是字符串（已去掉引号）、Symbol OTHER、Symbol N，
 *   比较时需还原为代码中的字面形式。
 */
function jumpEditorToState(raw_name, state_name, jumpInfo) {
    const lines = code_editor_value.split('\n');

    // ── end_from / error_from 节点：用 jumpInfo 定位 ────────────
    if (jumpInfo && (raw_name.startsWith('end_from_') || raw_name.startsWith('error_from_'))) {
        let { lineIndex, lineContent } = jumpInfo;

        // 先按行号快速匹配
        if (lines[lineIndex] !== undefined &&
            lines[lineIndex].split('//')[0].trim() === lineContent) {
            code_editor.setCursor(lineIndex, 0, { focus: true });
            return;
        }

        // 行号处内容已变，全文搜索行内容
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].split('//')[0].trim() === lineContent) {
                jumpInfo.lineIndex = i;  // 更新缓存的行号
                code_editor.setCursor(i, 0, { focus: true });
                return;
            }
        }

        return;  // 找不到则不跳转
    }

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
                    const l_cramp = Math.min(multiple_edges_shape_param2, l);
                    const c1 = vector_rotate(c,  multiple_edges_gap_angle*offset*0.5);
                    const c2 = vector_rotate(c, -multiple_edges_gap_angle*offset*0.5);
                    const p1 = vector_plus(a, c1);
                    const p2 = vector_subtract(b, c2);
                    const p3 = vector_plus(p1,  vector_scale(multiple_edges_shape_param1*l_cramp/vertex_r, c1));
                    const p4 = vector_subtract(p2, vector_scale(multiple_edges_shape_param1*l_cramp/vertex_r, c2));
                    const tl = vector_plus(vector_scale(0.5, vector_plus(p3, p4)), vector_scale(connection_text_offset*Math.sign(offset+0.1), normal));
                    dom.path.setAttribute("d", `M ${p1[0]} ${p1[1]} C ${p3[0]} ${p3[1]} ${p4[0]} ${p4[1]} ${p2[0]} ${p2[1]}`);
                    update_arrow_head_el(dom.arrow, p2, vector_scale(1./vertex_r, c2));
                    dom.text.setAttribute("x", tl[0]-3);
                    dom.text.setAttribute("y", tl[1]+4);
                    dom.path.setAttribute("visibility", "visible");
                    dom.arrow.setAttribute("visibility", "visible");
                } else {
                    dom.path.setAttribute("visibility", "hidden");
                    dom.arrow.setAttribute("visibility", "hidden");
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
        dom.highlight.setAttribute("cx", p[0]);
        dom.highlight.setAttribute("cy", p[1]);
        // 高亮圆环显隐
        dom.highlight.setAttribute("visibility",
            node._display_name === highlighted_vertex_name ? "visible" : "hidden");
        dom.label.setAttribute("x", p[0]-3);
        dom.label.setAttribute("y", p[1]+4);
        dom.name.setAttribute("x",  p[0]+vertex_name_text_offset[0]-3);
        dom.name.setAttribute("y",  p[1]+vertex_name_text_offset[1]+4);
    });
}

function graph_evolve() {
    // Vertices repeling
    for(var i = 0; i < graph.length; i++)
        for(var j = 0; j < i; j++) {
            const v = vector_subtract(graph[j][1], graph[i][1]);
            const d = vector_length(v);
            if(d<vertex_prefered_distance) {
                const force = vector_scale((1-d/vertex_prefered_distance)*vertex_repel_strength/d, v);
                if(graph[j] !== dragging_node) graph[j][1] = vector_plus(graph[j][1], force);
                if(graph[i] !== dragging_node) graph[i][1] = vector_subtract(graph[i][1], force);
            }
        }

    // Connections length preserving
    graph.forEach(node1 => {
        if(node1[0].startsWith('self-connection'))
            return;
        node1[3].forEach(connection => {
            const node2 = graph[connection[0]];
            const prefered_length = connection[2];
            const v = vector_subtract(node2[1], node1[1]);
            const d = vector_length(v);
            const force = vector_scale((1-d/prefered_length)*connection_length_preserve_strength/d, v);
            if(node2 !== dragging_node) node2[1] = vector_plus(node2[1], force);
            if(node1 !== dragging_node) node1[1] = vector_subtract(node1[1], force);
        });
    });
}

function update_graph_view() {  // 更新图（每帧执行）
    graph_evolve();
    update_graph_dom(graph);  // 只更新坐标属性，不重建 DOM
    
    requestAnimationFrame(update_graph_view);  // 由运行环境决定下次执行的时间（通常与画面刷新率保持一致）
}
