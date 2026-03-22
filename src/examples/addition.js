// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["addition"] = {};

examples["addition"]["name"] = {
    "zh": "加法",
    "en": "Addition"
};

examples["addition"]["category"] = {
    "zh": "简单操作/",
    "en": "Simple Operations/"
};

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

examples["addition"]["embedding"] = {
    "0": [
        -0.9129068135406245,
        0.18605738522397441
    ],
    "1": [
        -1.4049960273441222,
        0.144557052310264
    ],
    "2": [
        -1.5268349025897254,
        0.5545434643739929
    ],
    "3": [
        -1.0982995632269315,
        0.6245049622735823
    ],
    "4": [
        -0.32263653653654323,
        0.3480916325331037
    ],
    "5": [
        -0.30176849818905743,
        0.8857351796616381
    ],
    "6": [
        0.12111428506576356,
        0.9445294185813442
    ],
    "7": [
        0.12966003402364107,
        0.5067173856850409
    ],
    "8": [
        -0.08963251175395175,
        -0.13874754644276222
    ],
    "start": [
        -1.0492688153610872,
        -0.29491032153077174
    ],
    "self-connection-0": [
        -0.7503749177545549,
        -0.019671044173280017
    ],
    "self-connection-1": [
        -1.644669518626953,
        -0.051484795114220966
    ],
    "self-connection-2": [
        -1.7692656905714133,
        0.7277302963952099
    ],
    "self-connection-3": [
        -1.0565151527297336,
        0.9289557182864427
    ],
    "self-connection-4": [
        -0.5189468212788912,
        0.5281501739202258
    ],
    "self-connection-5": [
        -0.431844624096015,
        1.1722293286183711
    ],
    "self-connection-6": [
        0.3107053296989737,
        1.175706194254228
    ],
    "self-connection-7": [
        0.4408292440160165,
        0.46494938105019723
    ],
    "self-connection-8": [
        -0.34926031580306904,
        -0.32199164311253653
    ],
    "end_from_8": [
        0.06899535186390658,
        -0.5985944728460691
    ],
    "self-connection-9": [
        0.2223608436345279,
        -0.10500763562642974
    ]
};

examples["addition"]["recommended-max-steps"] = 3000;  // 推荐的最大步数
