// 样例代码：二进制除法

if (!examples)
    var examples = {};

examples["collatz-conjecture"] = {};

examples["collatz-conjecture"]["name"] = {
    "zh": "考拉兹猜想",
    "en": "Collatz conjecture"
}

examples["collatz-conjecture"]["category"] = {
    "zh": "复杂行为/",
    "en": "Complex Behavior/"
};

examples["collatz-conjecture"]["description"] = {
    "zh": "对于一个正整数，如果它是偶数就除以2，如果它是奇数就乘3再加1。考拉兹猜想假设无论从哪个正整数开始，重复执行上述操作，最终都会演化到1。本程序模拟了二进制数的演化，到1停机。",
    "en": "For a positive integer, if it is even, divide it by 2; if it is odd, multiply it by 3 and add 1. The Collatz conjecture posits that no matter which positive integer you start with, repeatedly applying the above operations will eventually lead to 1. This program simulates the evolution of a binary number and halts when it reaches 1."
};

examples["collatz-conjecture"]["code"] = {};

examples["collatz-conjecture"]["code"]["zh"] = `// 考拉兹猜想

start, "0", "", R  // 去除开头的0
start, "1", N, N, 0
start, other, N, R

// 检查是不是已经迭代到了1
0, "1", N, R, 1

1, "", N, N, end  // 已经迭代到1，结束
1, other, N, R, 2

2, "", N, L, 3
2, other, N, R

3, "0", "", L, 8  // 是偶数，除以2
3, "1", "1'", L, 4  // 是奇数，开始乘3加1的运算。带'的数字是还没有乘3的位

8, "", N, R, 0
8, other, N, L

4, "0", "0'", L
4, "1", "1'", L
4, "", N, R, 5  // 开始逐位乘3

5, "", N, L, 7  // 所有位都已经乘3了，接下来加1
5, "0'", "0", R
5, "1'", "1", L, 6
5, other, N, R

6, "", "1", R, 5
6, "0", "1", R, 5
6, "1", "0", L  // 进位

7, "", "1", N, 0  // 继续进行下一次迭代
7, "0", "1", N, 0
7, "1", "0", L  // 进位`;

examples["collatz-conjecture"]["code"]["en"] = `// Collatz conjecture

start, "0", "", R  // Remove leading zeros
start, "1", N, N, 0
start, other, N, R

// Check if iteration has reached 1
0, "1", N, R, 1

1, "", N, N, end  // Reached 1, terminate
1, other, N, R, 2

2, "", N, L, 3
2, other, N, R

3, "0", "", L, 8  // Even number, divide by 2
3, "1", "1'", L, 4  // Odd number, start multiply by 3 and add 1. Digits with ' have not yet been multiplied by 3

8, "", N, R, 0
8, other, N, L

4, "0", "0'", L
4, "1", "1'", L
4, "", N, R, 5  // Start multiplying each digit by 3

5, "", N, L, 7  // All digits have been multiplied by 3, next add 1
5, "0'", "0", R
5, "1'", "1", L, 6
5, other, N, R

6, "", "1", R, 5
6, "0", "1", R, 5
6, "1", "0", L  // Carry

7, "", "1", N, 0  // Proceed to next iteration
7, "0", "1", N, 0
7, "1", "0", L  // Carry`;

examples["collatz-conjecture"]["style"] = {};

examples["collatz-conjecture"]["style"]["zh"] = undefined;

examples["collatz-conjecture"]["style"]["en"] = `0, white, rgb(79,128,176)
1, white, rgb(176,79,119)
0', white, rgba(79,128,176,0.46)
1', white, rgba(176,79,119,0.46)`;

examples["collatz-conjecture"]["tapes"] = [  // 样例初始纸带
    ["", "1", "1", "0", "1", "1"],  // 27，经过111步（非图灵机步）演化到1
    ["", "1", "1"]  // 3，经过6步（非图灵机步）演化到1
];

examples["collatz-conjecture"]["embedding"] = {
    "0": [
      -0.19854447222464688,
      0.28255747722046065
    ],
    "1": [
      -0.5727085092221835,
      0.5869933076288096
    ],
    "2": [
      -0.503489230547263,
      1.0384154844928868
    ],
    "3": [
      -0.05060147821486333,
      1.1013599820391842
    ],
    "4": [
      0.47690686835204715,
      1.0936617370498583
    ],
    "5": [
      0.7096581400247676,
      0.5491863667147815
    ],
    "6": [
      1.0020872012779118,
      0.7785306391619066
    ],
    "7": [
      0.20660523619456958,
      0.1887918395022291
    ],
    "8": [
      -0.05647540894429983,
      0.6882879079926123
    ],
    "start": [
      -0.4483257777184292,
      -0.09792321399316012
    ],
    "end_from_1": [
      -0.9923232849746907,
      0.5819740176489462
    ],
    "self-connection-0": [
      -0.7106481786356283,
      1.2545682455370344
    ],
    "self-connection-1": [
      0.3247524952974819,
      1.4087101576872356
    ],
    "self-connection-2": [
      0.7414568744802423,
      1.286705173307561
    ],
    "self-connection-3": [
      0.6616241212575115,
      0.25065325864700977
    ],
    "self-connection-4": [
      0.9992395689731425,
      0.33564173896934574
    ],
    "self-connection-5": [
      1.2866824646789556,
      0.9098847756641467
    ],
    "self-connection-6": [
      0.25752731069275464,
      -0.1298467408025172
    ],
    "self-connection-7": [
      0.20813498921903198,
      0.7015560571462389
    ],
    "self-connection-8": [
      -0.7741583540127864,
      -0.05766605430851992
    ],
    "self-connection-9": [
      -0.3346052008264859,
      -0.3947898662956654
    ]
  };

examples["collatz-conjecture"]["recommended-max-steps"] = 4000;  // 推荐的最大步数
