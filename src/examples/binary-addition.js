// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["binary-addition"] = {};

examples["binary-addition"]["name"] = {
    "zh": "二进制加法",
    "en": "Binary addition"
}
;
examples["binary-addition"]["description"] = {
    "zh": "这个图灵机实现了二进制加法。一开始机头右侧有一个二进制整数，后面空一格，然后是另一个二进制整数。机头会在右侧空一格并写出这两个整数的和。",
    "en": "This Turing machine performs binary addition. Initially there are two binary integers on the tape, with a blank in between. The head will write the sum of these two integers to the right of the second integer, separated by a blank."
};

examples["binary-addition"]["category"] = {
    "zh": "二进制运算/",
    "en": "Binary Operations/"
};

examples["binary-addition"]["code"] = {};

examples["binary-addition"]["code"]["zh"] = `// 二进制加法

start, "0", N, L, 4
start, "1", N, L, 4
start, other, N, R

4, "", "P", R, 0

0, "", N, L, 1
0, other, N, R

1, "0", "0'", L, 2
1, "1", "1'", L, 3
1, "P", N, R, 5
1, other, N, L

2, "", "0", R, 0
2, other, N, L

3, "", "1", R, 0
3, other, N, L

5, "0'", "0", R
5, "1'", "1", R
5, "0", N, R, 6
5, "1", N, R, 6
5, other, N, R

6, "", "Q", L, 7
6, other, N, R

7, "0", "0'", L, 8
7, "1", "1'", L, 9
7, "", "R", R, 14  // 计算已经完成，接下来从左边誊抄到右边
7, other, N, L

// 携带0去左边
8, "P", N, L, 10
8, other, N, L

// 携带1去左边
9, "P", N, L, 11
9, other, N, L

// 把一位标上'
10, "0", "0'", R, 13
10, "1", "1'", R, 13
10, other, N, L

11, "0", "1", R, 12
11, "1", "0", L  // 进位
11, "", "1", R, 12
11, other, N, L

12, "P", N, L, 10
12, other, N, R

13, "Q", N, L, 7
13, other, N, R

14, "0'", "0", R
14, "1'", "1", R
14, "Q", N, L, 15

15, "0'", "0", L
15, "1'", "1", L
15, "", N, R, 16
15, other, N, L

16, "0", "", R, 17
16, "1", "", R, 18
16, "P", N, N, 19  // 已经誊抄完成，接下来擦掉特殊记号

// 携带0去右边
17, "", "0", L, 15
17, other, N, R

// 携带1去右边
18, "", "1", L, 15
18, other, N, R

19, "P", "", R
19, "Q", "", R, end
19, "R", "", R
19, other, N, R`;

examples["binary-addition"]["code"]["en"] = `// Binary addition

start, "0", N, L, 4
start, "1", N, L, 4
start, other, N, R

4, "", "P", R, 0

0, "", N, L, 1
0, other, N, R

1, "0", "0'", L, 2
1, "1", "1'", L, 3
1, "P", N, R, 5
1, other, N, L

2, "", "0", R, 0
2, other, N, L

3, "", "1", R, 0
3, other, N, L

5, "0'", "0", R
5, "1'", "1", R
5, "0", N, R, 6
5, "1", N, R, 6
5, other, N, R

6, "", "Q", L, 7
6, other, N, R

7, "0", "0'", L, 8
7, "1", "1'", L, 9
7, "", "R", R, 14  // Addition is done. Next copy the result from left to right.
7, other, N, L

// Carry 0 to the left
8, "P", N, L, 10
8, other, N, L

// Carry 1 to the left
9, "P", N, L, 11
9, other, N, L

// Mark one digit with '
10, "0", "0'", R, 13
10, "1", "1'", R, 13
10, other, N, L

11, "0", "1", R, 12
11, "1", "0", L  // Carry
11, "", "1", R, 12
11, other, N, L

12, "P", N, L, 10
12, other, N, R

13, "Q", N, L, 7
13, other, N, R

14, "0'", "0", R
14, "1'", "1", R
14, "Q", N, L, 15

15, "0'", "0", L
15, "1'", "1", L
15, "", N, R, 16
15, other, N, L

16, "0", "", R, 17
16, "1", "", R, 18
16, "P", N, N, 19  // Copying is done. Next erase the special marks.

// Carry 0 to the right
17, "", "0", L, 15
17, other, N, R

// Carry 1 to the right
18, "", "1", L, 15
18, other, N, R

19, "P", "", R
19, "Q", "", R, end
19, "R", "", R
19, other, N, R`;

examples["binary-addition"]["style"] = {};

examples["binary-addition"]["style"]["zh"] = undefined;

examples["binary-addition"]["style"]["en"] = `P, white, rgb(220,61,61)
Q, white, rgb(100,204,54)
R, white, rgb(230,208,35)
0', brown
1', brown`;

examples["binary-addition"]["tapes"] = [  // 样例初始纸带
    ["", "1", "1", "0", "1", "", "1", "1"]  // 13 + 3 = 16
];

examples["binary-addition"]["embedding"] = {
  "0": [
    -0.8388791636987527,
    -0.2856598328563337
  ],
  "1": [
    -0.34301999066537886,
    -0.45147920380903367
  ],
  "2": [
    -0.5150145394733537,
    -0.028752327601651924
  ],
  "3": [
    -0.7308487261831779,
    -0.7039962296554112
  ],
  "4": [
    -1.087976042851585,
    0.12782040002462186
  ],
  "5": [
    0.24667076468177504,
    -0.3159684160757878
  ],
  "6": [
    0.4737517909440436,
    0.11230891711269213
  ],
  "7": [
    0.9616270669587104,
    0.46537294260926015
  ],
  "8": [
    0.8896459560538665,
    0.8812578923910176
  ],
  "9": [
    1.4133041300000062,
    0.8472875125801071
  ],
  "10": [
    0.6237999652205345,
    1.2209454560881448
  ],
  "11": [
    1.4331005762514852,
    1.4111868542152526
  ],
  "12": [
    1.0028309528352466,
    1.52816523231963
  ],
  "13": [
    0.5291471918155729,
    0.8017462533644447
  ],
  "14": [
    1.3989671064070572,
    0.018811503211233017
  ],
  "15": [
    1.8882130890092002,
    -0.39209781338537836
  ],
  "16": [
    2.395236548518232,
    -0.32935716935392134
  ],
  "17": [
    2.178500725857071,
    0.017518318513066358
  ],
  "18": [
    2.2692781581939756,
    -0.6992118884646873
  ],
  "19": [
    2.940347767303971,
    -0.2475726068531484
  ],
  "start": [
    -1.1613025229990719,
    0.49637584849588334
  ],
  "self-connection-0": [
    -1.1531945696071932,
    -0.39079361891869735
  ],
  "self-connection-1": [
    -0.24765363627513537,
    -0.7497473955954564
  ],
  "self-connection-2": [
    -0.4683505704338614,
    0.27749707066487095
  ],
  "self-connection-3": [
    -0.8608663270101996,
    -0.9793495301485026
  ],
  "self-connection-4": [
    0.5762812670815269,
    -0.37881257945171476
  ],
  "self-connection-5": [
    0.2965882930272263,
    -0.6626510424906791
  ],
  "self-connection-6": [
    0.012353812142864443,
    -0.15447460981839836
  ],
  "self-connection-7": [
    0.2376880342334434,
    0.2871199356807763
  ],
  "self-connection-8": [
    0.8794272244765604,
    0.22996849207637116
  ],
  "self-connection-9": [
    1.092315810080737,
    1.0493392218474693
  ],
  "self-connection-10": [
    1.7183883890205274,
    0.8124731733040969
  ],
  "self-connection-11": [
    0.3737747579787363,
    1.4214354174745598
  ],
  "self-connection-12": [
    1.5043385611873252,
    1.7444824637059744
  ],
  "self-connection-13": [
    1.7607747859705583,
    1.379543247423437
  ],
  "self-connection-14": [
    0.8894182156945651,
    1.8196764917172965
  ],
  "self-connection-15": [
    0.2086458071898734,
    0.8268668255420677
  ],
  "self-connection-16": [
    1.1734587931012208,
    -0.20142400502577512
  ],
  "self-connection-17": [
    1.5342529550525057,
    0.27750894375973284
  ],
  "self-connection-18": [
    1.5556931378340286,
    -0.5608344954889706
  ],
  "self-connection-19": [
    1.8190683693771124,
    -0.7458153337907663
  ],
  "self-connection-20": [
    1.82770584142956,
    -0.13933110602893975
  ],
  "self-connection-21": [
    2.220562544720861,
    0.3292592389822878
  ],
  "self-connection-22": [
    2.39441476601782,
    -0.9872734778787885
  ],
  "self-connection-23": [
    2.7818430408915864,
    0.03811710621941479
  ],
  "end_from_19": [
    3.209355541233883,
    0.1812297642947006
  ],
  "self-connection-24": [
    3.28302310381176,
    -0.30454651521322934
  ],
  "self-connection-25": [
    2.9278352265731797,
    -0.5817499250257641
  ],
  "self-connection-26": [
    -1.2433296425578482,
    0.7854082843807074
  ]
};

examples["binary-addition"]["recommended-max-steps"] = 3000;  // 推荐的最大步数
