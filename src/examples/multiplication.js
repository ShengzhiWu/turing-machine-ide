// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["multiplication"] = {};

examples["multiplication"]["name"] = {
    "zh": "乘法",
    "en": "Multiplication"
}

examples["multiplication"]["description"] = {
    "zh": "在R后面添加P和Q后面的砖块数量之乘积的砖块。",
    "en": "Add the bricks behind R, representing the product of the number of bricks behind P and Q."
};


examples["multiplication"]["code"] = {};

examples["multiplication"]["code"]["zh"] = `// 乘法

start, other, N, N, 0

0, "B", "B'", R, 1
0, "Q", N, L, 8  // P区所有砖块都标记过来，计算结束，接下来擦掉特殊标记
0, other, N, R

1, "Q", N, R, 2
1, other, N, R

2, "B", "B'", R, 3
2, "R", N, L, 6  // Q区所有砖块都标记过来，接下来擦掉特殊标记
2, other, N, R

3, "R", N, R, 4
3, other, N, R

4, "", "B", L, 5  // 放下一块砖，接下来回到Q区开头
4, other, N, R

5, "Q", N, R, 2
5, other, N, L

6, "B'", "B", L
6, "Q", N, L, 7
6, other, N, L

7, "P", N, R, 0
7, other, N, L

8, "B'", "B", L
8, "P", N, N, end
8, other, N, L`;

examples["multiplication"]["code"]["en"] = `// Multiplication

start, other, N, N, 0

0, "B", "B'", R, 1
0, "Q", N, L, 8  // All bricks in P area have been marked, calculation finished. Next step is to erase the special marks.
0, other, N, R

1, "Q", N, R, 2
1, other, N, R

2, "B", "B'", R, 3
2, "R", N, L, 6  // All bricks in Q area have been marked, calculation finished. Next step is to erase the special marks.
2, other, N, R

3, "R", N, R, 4
3, other, N, R

4, "", "B", L, 5  // Put down a brick, next step is to go back to the beginning of Q area.
4, other, N, R

5, "Q", N, R, 2
5, other, N, L

6, "B'", "B", L
6, "Q", N, L, 7
6, other, N, L

7, "P", N, R, 0
7, other, N, L

8, "B'", "B", L
8, "P", N, N, end
8, other, N, L`;

examples["multiplication"]["style"] = {};

examples["multiplication"]["style"]["zh"] = `B, white, rgb(142,85,55)  // 砖块
B', white, rgba(142,85,55,0.52)  // 砖块（已复制过）
P, white, green  // 起始位置
Q, white, blue  // 目标位置
R, white, rgb(181,86,172)  // 目标位置`;

examples["multiplication"]["style"]["en"] = `B, white, rgb(142,85,55)  // brick
B', white, rgba(142,85,55,0.52)  // brick (already copied)
P, white, green  // starting position
Q, white, blue  // target position
R, white, rgb(181,86,172)  // target position`;

examples["multiplication"]["tapes"] = [  // 样例初始纸带
    ["", "P", "B", "B", "B", "", "Q", "B", "B", "", "R"]
];

examples["multiplication"]["recommended-max-steps"] = 3000;  // 推荐的最大步数
