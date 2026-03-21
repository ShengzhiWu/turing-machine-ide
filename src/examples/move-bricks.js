// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["move-bricks"] = {};

examples["move-bricks"]["name"] = {
    "zh": "移动砖块",
    "en": "Move bricks"
}

examples["move-bricks"]["description"] = {
    "zh": "将砖块从P后面移动到Q后面。",
    "en": "Move the bricks from behind P to behind Q."
};

examples["move-bricks"]["code"] = {};

examples["move-bricks"]["code"]["zh"] = `// 移动砖块

start, other, N, R, 0

0, "B", "", R, 1
0, "Q", N, N, end  // 所有砖块都已移到目标位置
0, other, N, R

1, "Q", N, R, 2
1, other, N, R

2, "", "B", L, 3
2, other, N, R

3, "P", N, R, 0
3, other, N, L`;

examples["move-bricks"]["code"]["en"] = `// Move Bricks

start, other, N, R, 0

0, "B", "", R, 1
0, "Q", N, N, end  // All bricks have been moved to the target position
0, other, N, R

1, "Q", N, R, 2
1, other, N, R

2, "", "B", L, 3
2, other, N, R

3, "P", N, R, 0
3, other, N, L`;

examples["move-bricks"]["style"] = {};

examples["move-bricks"]["style"]["zh"] = `B, white, rgb(142,85,55)  // 砖块
P, white, green  // 起始位置
Q, white, blue  // 目标位置`;

examples["move-bricks"]["style"]["en"] = `B, white, rgb(142,85,55)  // Brick
P, white, green  // Start position
Q, white, blue  // Target position`;

examples["move-bricks"]["tapes"] = [  // 样例初始纸带
    ["", "P", "B", "B", "B", "B", "", "", "Q", "", "", "", "", "", "", ""]
];

examples["move-bricks"]["recommended-max-steps"] = 3000;  // 推荐的最大步数
