// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["collatz-conjecture-fast"] = {};

examples["collatz-conjecture-fast"]["name"] = {
    "zh": "考拉兹猜想（高速版）",
    "en": "Collatz conjecture (fast)"
}

examples["collatz-conjecture-fast"]["category"] = {
    "zh": "复杂行为/",
    "en": "Complex Behavior/"
};

examples["collatz-conjecture-fast"]["description"] = {
    "zh": "对于一个正整数，如果它是偶数就除以2，如果它是奇数就乘3再加1。考拉兹猜想假设无论从哪个正整数开始，重复执行上述操作，最终都会演化到1。本程序模拟了二进制数的演化，到1停机。\n高速版相对于普通版的改进在于乘三之后靠删掉末尾的1然后把遇见的第一个0改成1来实现加1再去掉所有因子2的操作，一个附加的好处是可以更快地判断是否已经到达1，这样可以节省状态数和迭代次数.",
    "en": "For a positive integer, if it is even, divide it by 2; if it is odd, multiply it by 3 and add 1. The Collatz conjecture posits that no matter which positive integer you start with, repeatedly applying the above operations will eventually lead to 1. This program simulates the evolution of a binary number and halts when it reaches 1.\nThe improvement of the fast version over the regular version is that after multiplying by three, it efficiently implements the operation of adding one and removing all factors of two by deleting the trailing 1 and changing the first encountered 0 to 1. An additional benefit is that it can more quickly determine if it has reached 1. This optimization saves states and iterations."
};

examples["collatz-conjecture-fast"]["code"] = {};

examples["collatz-conjecture-fast"]["code"]["zh"] = `// 考拉兹猜想（高速版）

start, "0", "", R  // 去除开头的0
start, "1", N, N, 0
start, other, N, R

// 移动到末位
0, "", N, L, 1
0, other, N, R

1, "0", "", L  // 是偶数，除以2
1, "1", N, N, 4  // 是奇数，开始乘3加1的运算。带'的数字是还没有乘3的位

4, "0", "0'", L  // 标记待乘3的位
4, "1", "1'", L
4, "", N, R, 5  // 开始逐位乘3

5, "", N, L, 7  // 所有位都已经乘3了，接下来去掉末尾的1并把遇见的第一个0改成1（这是加1再去掉所有因子2的高效做法）
5, "0'", "0", R
5, "1'", "1", L, 6  // 接下来往左移动一位然后在那里加1
5, other, N, R

6, "", "1", R, 5
6, "0", "1", R, 5
6, "1", "0", L  // 进位

7, "", "1", N, end  // 已经迭代到1
7, "0", "1", N, 4  // 开始下一次迭代
7, "1", "", L`;

examples["collatz-conjecture-fast"]["code"]["en"] = `// Collatz conjecture (fast)

start, "0", "", R  // Remove leading zeros
start, "1", N, N, 0
start, other, N, R

// Move to the end
0, "", N, L, 1
0, other, N, R

1, "0", "", L  // Even number, divide by 2
1, "1", N, N, 4  // Odd number, start multiply by 3 and add 1. Digits with ' have not yet been multiplied by 3

4, "0", "0'", L  // Mark digits to be multiplied by 3
4, "1", "1'", L
4, "", N, R, 5  // Start multiplying each digit by 3

5, "", N, L, 7  // All digits have been multiplied by 3, next remove trailing 1 and change the first encountered 0 to 1 (efficient way to add 1 and remove all factors of 2)
5, "0'", "0", R
5, "1'", "1", L, 6  // Move left and add 1 there
5, other, N, R

6, "", "1", R, 5
6, "0", "1", R, 5
6, "1", "0", L  // Carry

7, "", "1", N, end  // Reached 1
7, "0", "1", N, 4  // Start next iteration
7, "1", "", L`;

examples["collatz-conjecture-fast"]["style"] = {};

examples["collatz-conjecture-fast"]["style"]["zh"] = undefined;

examples["collatz-conjecture-fast"]["style"]["en"] = `0, white, rgb(79,128,176)
1, white, rgb(176,79,119)
0', white, rgba(79,128,176,0.46)
1', white, rgba(176,79,119,0.46)`;

examples["collatz-conjecture-fast"]["tapes"] = [  // 样例初始纸带
    ["", "1", "1", "0", "1", "1"],  // 27，经过111步（非图灵机步）演化到1
    ["", "1", "1"]  // 3，经过6步（非图灵机步）演化到1
];

examples["collatz-conjecture-fast"]["embedding"] = {
  "0": [
    -0.7645843188441024,
    -0.6140761363989129
  ],
  "1": [
    -0.30379955159240385,
    -0.7687194500988239
  ],
  "4": [
    0.22521476004481533,
    -0.7504417029572996
  ],
  "5": [
    0.3256913520169275,
    -0.24892478366286142
  ],
  "6": [
    -0.04452376094582971,
    -0.2206059096938914
  ],
  "7": [
    0.6934371073383556,
    -0.5933391708694137
  ],
  "start": [
    -1.1004135270146973,
    -0.9293961996903364
  ],
  "self-connection-0": [
    -0.8897319435682027,
    -0.33542533827711407
  ],
  "self-connection-1": [
    -0.42213651101213656,
    -1.0614874555834781
  ],
  "self-connection-2": [
    0.4356376916271896,
    -0.9773717254321143
  ],
  "self-connection-3": [
    0.12271137408522445,
    -1.0927017447379526
  ],
  "self-connection-4": [
    0.2703686669912984,
    0.09393155402879073
  ],
  "self-connection-5": [
    0.6010853624189149,
    -0.04694199789089128
  ],
  "self-connection-6": [
    -0.31351088500861196,
    -0.06731191659064828
  ],
  "self-connection-7": [
    0.9694092279276859,
    -0.4326562558473825
  ],
  "end_from_5": [
    1.0053200297220535,
    -0.946623878999257
  ],
  "self-connection-8": [
    -1.3924474546921692,
    -0.7771109935232806
  ],
  "self-connection-9": [
    -1.0579554563380844,
    -1.2419855104136166
  ]
};

examples["collatz-conjecture-fast"]["recommended-max-steps"] = 3000;  // 推荐的最大步数
