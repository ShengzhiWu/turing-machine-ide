// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["multiplication"] = {};

examples["multiplication"]["name"] = {
    "zh": "乘法",
    "en": "Multiplication"
};

examples["multiplication"]["category"] = {
    "zh": "简单操作/",
    "en": "Simple Operations/"
};

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

examples["multiplication"]["embedding"] = {
    "0": [
        -0.655819757112698,
        -0.126663848561383
    ],
    "1": [
        -0.1837561030028485,
        0.13873023901109488
    ],
    "2": [
        0.2976850618246961,
        -0.054038533349509636
    ],
    "3": [
        0.7653416676377157,
        -0.09821105472328681
    ],
    "4": [
        0.8750755666818646,
        0.3194291490809614
    ],
    "5": [
        0.447510962019475,
        0.38747905468655375
    ],
    "6": [
        0.1739752258401971,
        -0.5986119773059824
    ],
    "7": [
        -0.33014679394677515,
        -0.5012668110437292
    ],
    "8": [
        -1.1977575985239608,
        0.09295633961766028
    ],
    "start": [
        -0.9205662895170362,
        -0.45921241938748486
    ],
    "self-connection-0": [
        -0.6690651598227983,
        0.15689819862926357
    ],
    "self-connection-1": [
        -0.19564345604157782,
        0.4454053604627773
    ],
    "self-connection-2": [
        0.07854519466741149,
        -0.16980656453267623
    ],
    "self-connection-3": [
        1.0234956880358537,
        -0.269001593095651
    ],
    "self-connection-4": [
        1.1289410971291047,
        0.4753053838416085
    ],
    "self-connection-5": [
        0.39646285056872366,
        0.6935800277721386
    ],
    "self-connection-6": [
        0.5044108309509417,
        -0.6599823578396227
    ],
    "self-connection-7": [
        0.12606254018480215,
        -0.928722766640594
    ],
    "self-connection-8": [
        -0.45505294675041835,
        -0.7849142721767352
    ],
    "self-connection-9": [
        -1.093895048408495,
        0.41599906944732545
    ],
    "end_from_8": [
        -1.4506110332310296,
        -0.28856882753677376
    ],
    "self-connection-10": [
        -1.5144903155861502,
        0.21520953495012463
    ]
};

examples["multiplication"]["recommended-max-steps"] = 3000;  // 推荐的最大步数
