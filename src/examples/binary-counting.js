// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["binary-counting"] = {};

examples["binary-counting"]["name"] = {
    "zh": "二进制计数",
    "en": "Binary counting"
}
;
examples["binary-counting"]["description"] = {
    "zh": "这个图灵机实现了二进制计数。一开始纸带上有连续的一段B，位于机头右侧。结束时会在这段B右侧隔一格写上B的数量（二进制）。",
    "en": "This Turing machine implements binary counting. Initially there is a contiguous segment of Bs on the tape, located to the right of the head. At the end, the machine will write the count of B in binary to the right of this segment of B, separated by a blank."
};

examples["binary-counting"]["category"] = {
    "zh": "二进制运算/",
    "en": "Binary Operations/"
};

examples["binary-counting"]["code"] = {};

examples["binary-counting"]["code"]["zh"] = `// 二进制计数

start, "", N, R
start, other, N, N, 0

0, "B", "B'", R, 1
0, "", N, L, 5  // 计算已经完成，接下来擦掉特殊记号
0, other, N, R

1, "", N, R, 2
1, other, N, R

2, "", "1", L, 3
2, "0", "1", L, 3
2, "1", "0", R  // 进位

3, "", N, L, 4
3, other, N, L

4, "", N, R, 0
4, "B'", N, R, 0
4, other, N, L

5, "B'", "B", L
5, "", N, R, 6  // 已经擦除完特殊记号，接下来反转结果。需要反转是因为先前为了计算方便，二进制数左边是低位

6, "0", N, N, 7
6, "1", N, N, 7
6, other, N, R

7, "0", "", R, 8
7, "1", "", R, 9
7, "", N, L, 15  // 计算逆转二进制字符串已经完成，接下来擦掉特殊记号
7, other, N, R

// 携带0向右走的状态
8, "", N, L, 10
8, other, N, R

// 携带1向右走的状态
9, "", N, L, 11
9, other, N, R

10, "0", "0'", L, 12  // 加'表示此位已固定
10, "1", "0'", L, 13
10, "", "0'", R, 14  // 计算逆转二进制字符串已经完成，接下来擦掉特殊记号
10, other, N, L

11, "0", "1'", L, 12
11, "1", "1'", L, 13
11, "", "1'", R, 14  // 计算逆转二进制字符串已经完成，接下来擦掉特殊记号
11, other, N, L

// 携带0向左走的状态
12, "", "0'", R, 7
12, other, N, L

// 携带1向左走的状态
13, "", "1'", R, 7
13, other, N, L

14, "", N, L, 15
14, other, N, R

15, "0'", "0", L
15, "1'", "1", L
15, "", N, N, end`;

examples["binary-counting"]["code"]["en"] = `// Binary counting

start, "", N, R
start, other, N, N, 0

0, "B", "B'", R, 1
0, "", N, L, 5  // Calculation completed, next erase special marks
0, other, N, R

1, "", N, R, 2
1, other, N, R

2, "", "1", L, 3
2, "0", "1", L, 3
2, "1", "0", R  // Carry

3, "", N, L, 4
3, other, N, L

4, "", N, R, 0
4, "B'", N, R, 0
4, other, N, L

5, "B'", "B", L
5, "", N, R, 6  // Special marks have been erased, next reverse the result. Reversal is needed because the binary number has the least significant bit on the left for calculation convenience

6, "0", N, N, 7
6, "1", N, N, 7
6, other, N, R

7, "0", "", R, 8
7, "1", "", R, 9
7, "", N, L, 15  // Reversal of binary string completed, next erase special marks
7, other, N, R

// State moving right carrying 0
8, "", N, L, 10
8, other, N, R

// State moving right carrying 1
9, "", N, L, 11
9, other, N, R

10, "0", "0'", L, 12  // ' indicates this bit is fixed
10, "1", "0'", L, 13
10, "", "0'", R, 14  // Reversal of binary string completed, next erase special marks
10, other, N, L

11, "0", "1'", L, 12
11, "1", "1'", L, 13
11, "", "1'", R, 14  // Reversal of binary string completed, next erase special marks
11, other, N, L

// State moving left carrying 0
12, "", "0'", R, 7
12, other, N, L

// State moving left carrying 1
13, "", "1'", R, 7
13, other, N, L

14, "", N, L, 15
14, other, N, R

15, "0'", "0", L
15, "1'", "1", L
15, "", N, N, end`;

examples["binary-counting"]["style"] = {};

examples["binary-counting"]["style"]["zh"] = `B, white, rgb(142,85,55)  // 砖块
B', white, rgba(142,85,55,0.52)  // 砖块（已数过）`;

examples["binary-counting"]["style"]["en"] = `B, white, rgb(142,85,55)  // Brick
B', white, rgba(142,85,55,0.52)  // Brick (counted)`;

examples["binary-counting"]["tapes"] = [  // 样例初始纸带
    ["", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B"],  // 13个B，正确答案是1101
    ["", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B", "B"]  // 16个B，正确答案是10000
];

examples["binary-counting"]["embedding"] = {
  "0": [
    -0.7681615265037804,
    -0.03983850733449824
  ],
  "1": [
    -1.0894263585715538,
    0.33948058848984636
  ],
  "2": [
    -1.5499800377132218,
    0.3355930077163432
  ],
  "3": [
    -1.6566819412931848,
    -0.03325629098270456
  ],
  "4": [
    -1.254074736938327,
    -0.24195285098135255
  ],
  "5": [
    -0.32630594956702985,
    0.2580572172418985
  ],
  "6": [
    0.16532098256913796,
    0.45726411587578786
  ],
  "7": [
    0.6724374197542967,
    0.36597074586783607
  ],
  "8": [
    0.5190272759293288,
    0.9531316935085736
  ],
  "9": [
    1.2296397250112225,
    0.008474205608985605
  ],
  "10": [
    0.9733371412501824,
    0.915005366808394
  ],
  "11": [
    1.4101276902507915,
    0.35636517115296323
  ],
  "12": [
    1.2610476524416825,
    0.6932148426884076
  ],
  "13": [
    0.9737479482973489,
    0.5793389338676962
  ],
  "14": [
    0.9646972983267093,
    0.24771413434520329
  ],
  "15": [
    0.611271424232641,
    -0.20968002066149466
  ],
  "start": [
    -0.37314354853449927,
    -0.3276062764493404
  ],
  "self-connection-0": [
    -0.8012278001750118,
    -0.30941369488896564
  ],
  "self-connection-1": [
    -1.0584531604231675,
    0.6491703639070813
  ],
  "self-connection-2": [
    -1.717803290356963,
    0.5980264543269009
  ],
  "self-connection-3": [
    -1.9230403098894953,
    -0.189470738052752
  ],
  "self-connection-4": [
    -1.3427993497597392,
    -0.5490192181195986
  ],
  "self-connection-5": [
    -0.47792240549577447,
    0.5114996960852614
  ],
  "self-connection-6": [
    0.022697286852661366,
    0.734668463875273
  ],
  "self-connection-7": [
    0.37953196047302573,
    0.2321030177775296
  ],
  "self-connection-8": [
    0.39193738606836653,
    1.248233570603237
  ],
  "self-connection-9": [
    1.448744285714745,
    -0.2474723651807138
  ],
  "self-connection-10": [
    1.0438304585198326,
    1.2478888939867918
  ],
  "self-connection-11": [
    1.7411597087572295,
    0.31367384851154023
  ],
  "self-connection-12": [
    1.5421081912403967,
    0.8996701763871429
  ],
  "self-connection-13": [
    0.7030258933053509,
    0.6990099146469617
  ],
  "self-connection-14": [
    0.9202319878271457,
    -0.026297058262247958
  ],
  "self-connection-15": [
    0.839983104343846,
    -0.4756634489288382
  ],
  "self-connection-16": [
    0.29158115883568236,
    -0.2104404471668251
  ],
  "end_from_15": [
    0.41959168443575984,
    -0.6724353609808762
  ],
  "self-connection-17": [
    -0.26110177624747255,
    -0.6212011468219711
  ]
};

examples["binary-counting"]["recommended-max-steps"] = 3000;  // 推荐的最大步数
