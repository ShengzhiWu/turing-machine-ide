// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["addition"] = {};

examples["addition"]["name"] = {
    "zh": "加法",
    "en": "Addition"
}

examples["addition"]["description"] = {
    "zh": "将P和Q后面的砖块合起来复制到R后面。",
    "en": "Copy the bricks from behind P and Q to behind R."
};


examples["addition"]["code"] = {};

examples["addition"]["code"]["zh"] = `// 加法 

start, other, N, R, 0

0, "B", "B'", R, 1
0, "Q", N, R, 4  // P区已经没有砖块可复制了，接下来复制Q区的砖块
0, other, N, R

1, "R", N, R, 2
1, other, N, R

2, "", "B", L, 3
2, other, N, R

3, "P", N, R, 0
3, other, N, L

4, "B", "B'", R, 5
4, "R", N, N, 8  // Q区已经没有砖块可复制了，接下来把之前做的记号擦掉
4, other, N, R

5, "R", N, R, 6
5, other, N, R

6, "", "B", L, 7
6, other, N, R

7, "Q", N, R, 4
7, other, N, L

8, "B'", "B", L
8, "P", N, N, end
8, other, N, L`;

examples["addition"]["code"]["en"] = `// Addition

start, other, N, R, 0

0, "B", "B'", R, 1
0, "Q", N, R, 4  // No more bricks to copy in P area, start copying bricks in Q area
0, other, N, R

1, "R", N, R, 2
1, other, N, R

2, "", "B", L, 3
2, other, N, R

3, "P", N, R, 0
3, other, N, L

4, "B", "B'", R, 5
4, "R", N, N, 8  // No more bricks to copy in Q area, start erasing the marks we made before
4, other, N, R

5, "R", N, R, 6
5, other, N, R

6, "", "B", L, 7
6, other, N, R

7, "Q", N, R, 4
7, other, N, L

8, "B'", "B", L
8, "P", N, N, end
8, other, N, L`;

examples["addition"]["style"] = {};

examples["addition"]["style"]["zh"] = `B, white, rgb(142,85,55)  // 砖块
B', white, rgba(142,85,55,0.52)  // 砖块（已复制过）
P, white, green  // 起始位置
Q, white, blue  // 目标位置
R, white, rgb(181,86,172)  // 目标位置`;

examples["addition"]["style"]["en"] = `B, white, rgb(142,85,55)  // brick
B', white, rgba(142,85,55,0.52)  // brick (already copied)
P, white, green  // starting position
Q, white, blue  // target position
R, white, rgb(181,86,172)  // target position`;

examples["addition"]["tapes"] = [  // 样例初始纸带
    ["", "P", "B", "B", "B", "B", "", "Q", "B", "B", "", "R"]
];