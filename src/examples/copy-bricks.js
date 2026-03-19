// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["copy-bricks"] = {};

examples["copy-bricks"]["name"] = {
    "zh": "复制砖块",
    "en": "Copy bricks"
}

examples["copy-bricks"]["description"] = {
    "zh": "将砖块从P后面复制到Q后面。",
    "en": "Copy the bricks from behind P to behind Q."
};


examples["copy-bricks"]["code"] = {};

examples["copy-bricks"]["code"]["zh"] = `// 复制砖块

start, other, N, R, 0

0, "B", "B'", R, 1
0, "Q", N, N, 4  // 已经没有砖块可复制了，接下来把之前做的记号擦掉
0, other, N, R

1, "Q", N, R, 2
1, other, N, R

2, "", "B", L, 3
2, other, N, R

3, "P", N, R, 0
3, other, N, L

4, "B'", "B", L
4, "P", N, N, end
4, other, N, L`;

examples["copy-bricks"]["code"]["en"] = `// Copy Bricks

start, other, N, R, 0

0, "B", "B'", R, 1
0, "Q", N, N, 4  // No more bricks to copy, next erase the marks
0, other, N, R

1, "Q", N, R, 2
1, other, N, R

2, "", "B", L, 3
2, other, N, R

3, "P", N, R, 0
3, other, N, L

4, "B'", "B", L
4, "P", N, N, end
4, other, N, L`;

examples["copy-bricks"]["style"] = {};

examples["copy-bricks"]["style"]["zh"] = `B, white, rgb(142,85,55)  // 砖块
B', white, rgba(142,85,55,0.52)  // 砖块（已复制过）
P, white, green  // 起始位置
Q, white, blue  // 目标位置`;

examples["copy-bricks"]["style"]["en"] = `B, white, rgb(142,85,55)  // Brick
B', white, rgba(142,85,55,0.52)  // Brick (copied)
P, white, green  // Start position
Q, white, blue  // Target position`;

examples["copy-bricks"]["tapes"] = [  // 样例初始纸带
    ["", "P", "B", "B", "B", "B", "", "", "Q", "", "", "", "", "", "", ""]
];